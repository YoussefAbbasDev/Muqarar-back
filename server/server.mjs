import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cron from 'node-cron';

import {
  accountKey,
  accountPaths,
  claimLegacyData,
  getSyncProgress,
  isSyncing,
  readData,
  runSync,
} from './sync.mjs';
import { createClient } from './client.mjs';
import { sanitizeLog } from './platform.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(ROOT, '..', 'client');
const DIST_DIR = path.join(CLIENT_DIR, 'dist');
const PUBLIC_DIR = path.join(CLIENT_DIR, 'public');
const PORT = process.env.PORT || 4000;
const HOST = '127.0.0.1';

const SESSION_COOKIE = 'dtu_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const app = express();
app.disable('x-powered-by');

// السماح بالاتصال من الفرونت إند عبر CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '16kb' }));

/* ------------------------------------------------------------------ */
/* جلسات في الذاكرة فقط (مفيش كلمات مرور على الديسك)                   */
/* ------------------------------------------------------------------ */

const sessions = new Map();

function parseCookies(header) {
  const result = {};

  for (const part of String(header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;

    const name = part.slice(0, index).trim();
    if (!name || name in result) continue;

    const value = part.slice(index + 1).trim();
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }

  return result;
}

function readSession(req) {
  // 1. فحص Authorization Header (Bearer token)
  const authHeader = String(req.headers.authorization || '').trim();
  let sid = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  // 2. فحص query parameter للتحميل والعرض
  if (!sid && req.query?.token) {
    sid = String(req.query.token).trim();
  }

  // 3. فحص الكوكي كخيار احتياطي
  if (!sid) {
    sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  }

  if (!sid) return null;

  const session = sessions.get(sid);
  if (!session) return null;

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sid);
    return null;
  }

  return { ...session, sid };
}

function setSessionCookie(res, sid) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

/** يرجّع الجلسة أو يرد 401. */
function requireSession(req, res) {
  const session = readSession(req);

  if (!session) {
    res.status(401).json({
      authenticated: false,
      error: 'لازم تسجّل الدخول الأول.',
    });
    return null;
  }

  return session;
}

function startSyncFor(account, source = 'manual', client) {
  if (isSyncing(account.userKey)) return false;

  console.log(`[server] بدء مزامنة (${source})...`);
  runSync({
    userKey: account.userKey,
    username: account.username,
    password: account.password,
    client,
  }).catch((error) => {
    console.error(
      `[server] خطأ في المزامنة: ${sanitizeLog(error?.message || error)}`
    );
  });
  return true;
}

/* ------------------------------------------------------------------ */
/* المصادقة                                                            */
/* ------------------------------------------------------------------ */

app.post('/api/login', async (req, res) => {
  const body = req.body ?? {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'اكتب اسم المستخدم وكلمة المرور بتوع منصة DTU.' });
  }

  if (username.length > 200 || password.length > 300) {
    return res.status(400).json({ error: 'بيانات الدخول طويلة بشكل غير متوقع.' });
  }

  let client;
  try {
    // بنسجّل الدخول هنا مرة واحدة، ونفس الـ client بيكمّل بيه أول مزامنة.
    client = await createClient({ user: username, pass: password });
  } catch (error) {
    console.warn(
      `[server] فشل تسجيل دخول: ${sanitizeLog(error?.message || error)}`
    );
    return res.status(401).json({
      error:
        'تعذر تسجيل الدخول. تأكد من اسم المستخدم وكلمة المرور ومن اتصال الإنترنت.',
    });
  }

  const userKey = accountKey(username);

  try {
    await claimLegacyData(userKey);
  } catch (error) {
    // نقل البيانات القديمة مش شرط لنجاح الدخول.
    console.error(
      `[server] تعذر تجهيز بيانات الحساب: ${sanitizeLog(
        error?.message || error
      )}`
    );
  }

  // جلسة جديدة في كل تسجيل دخول (ونلغي القديمة لنفس المتصفح).
  const oldSid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (oldSid) sessions.delete(oldSid);

  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, {
    userKey,
    username,
    password,
    createdAt: Date.now(),
  });
  setSessionCookie(res, sid);

  const started = startSyncFor(
    { userKey, username, password },
    'login',
    client
  );

  return res.json({
    ok: true,
    authenticated: true,
    token: sid,
    username,
    syncing: true,
    started,
  });
});

app.get('/api/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const session = readSession(req);

  if (!session) {
    return res.json({ authenticated: false });
  }

  let data = null;
  try {
    data = await readData(session.userKey);
  } catch {
    data = null;
  }

  return res.json({
    authenticated: true,
    username: session.username,
    hasData: Boolean(data),
    syncedAt: data?.syncedAt ?? null,
    syncing: isSyncing(session.userKey),
    progress: getSyncProgress(session.userKey),
  });
});

app.post('/api/logout', (req, res) => {
  const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (sid) sessions.delete(sid);

  res.clearCookie(SESSION_COOKIE, { path: '/' });
  return res.json({ ok: true, authenticated: false });
});

/* ------------------------------------------------------------------ */
/* البيانات                                                            */
/* ------------------------------------------------------------------ */

app.get('/api/data', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const session = requireSession(req, res);
  if (!session) return undefined;

  try {
    const data = await readData(session.userKey);

    if (!data) {
      return res.status(503).json({
        authenticated: true,
        hasData: false,
        error: 'لسه مفيش بيانات للحساب ده.',
        syncing: isSyncing(session.userKey),
        progress: getSyncProgress(session.userKey),
      });
    }

    return res.json({
      ...data,
      authenticated: true,
      username: session.username,
      syncing: isSyncing(session.userKey),
      progress: getSyncProgress(session.userKey),
    });
  } catch (error) {
    return res.status(500).json({
      error: sanitizeLog(error?.message || error),
      syncing: isSyncing(session.userKey),
    });
  }
});

app.post('/api/sync', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return undefined;

  const started = startSyncFor(session, 'manual');
  return res.status(202).json({
    started,
    syncing: true,
  });
});

/* ------------------------------------------------------------------ */
/* الملفات                                                             */
/* ------------------------------------------------------------------ */

async function resolveFile(session, id, res) {
  let data;

  try {
    data = await readData(session.userKey);
  } catch (error) {
    res.status(500).json({ error: sanitizeLog(error?.message || error) });
    return null;
  }

  if (!data) {
    res.status(503).json({ error: 'لسه مفيش بيانات للحساب ده.' });
    return null;
  }

  const file = data.files.find((item) => item.id === id);

  if (!file) {
    res.status(404).json({ error: 'الملف مش موجود في قاعدة البيانات.' });
    return null;
  }

  if (!file.localFile) {
    res.status(404).json({ error: 'الملف مش متاح محلياً.' });
    return null;
  }

  if (path.basename(file.localFile) !== file.localFile) {
    res.status(400).json({ error: 'مسار ملف غير صالح.' });
    return null;
  }

  const filePath = path.join(accountPaths(session.userKey).filesDir, file.localFile);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
  } catch {
    res.status(404).json({ error: 'الملف مش موجود على الديسك.' });
    return null;
  }

  return { file, filePath };
}

function displayName(file) {
  const extension = path.extname(file.localFile);
  const safeTitle = String(file.title || 'ملف')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return `${safeTitle || 'ملف'}${extension}`;
}

const INLINE_TYPES = new Map([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
]);

app.get('/api/files/:id/download', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return undefined;

  const resolved = await resolveFile(session, req.params.id, res);
  if (!resolved) return undefined;

  return res.download(resolved.filePath, displayName(resolved.file), (error) => {
    if (!error) return;
    if (res.headersSent) return;

    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'الملف مش موجود على الديسك.' });
    } else {
      res.status(500).json({ error: 'تعذر إرسال الملف.' });
    }
  });
});

/** معاينة داخل الموقع (PDF والصور). */
app.get('/api/files/:id/view', async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return undefined;

  const resolved = await resolveFile(session, req.params.id, res);
  if (!resolved) return undefined;

  const extension = path.extname(resolved.file.localFile).toLowerCase();
  const contentType = INLINE_TYPES.get(extension);

  if (!contentType) {
    return res.status(415).json({
      error: 'المعاينة داخل الموقع متاحة لملفات PDF والصور بس.',
    });
  }

  const name = displayName(resolved.file);
  const asciiName = name
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .trim();

  res.set({
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${asciiName || `file${extension}`}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=0, must-revalidate',
  });

  return res.sendFile(resolved.filePath, (error) => {
    if (!error) return;
    if (res.headersSent) return;

    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'الملف مش موجود على الديسك.' });
    } else {
      res.status(500).json({ error: 'تعذر فتح الملف.' });
    }
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود.' });
});

app.use('/data', express.static(path.join(PUBLIC_DIR, 'data')));

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: 'index.html' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    return res.sendFile(path.join(DIST_DIR, 'index.html'), (error) => {
      if (!error || res.headersSent) return;
      next();
    });
  });
} else {
  app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    res
      .status(404)
      .type('text/plain; charset=utf-8')
      .send(
        'واجهة الموقع غير مبنية. لتشغيل الواجهة في وضع التطوير: npm run dev داخل مجلد client أو ابنِ المشروع: npm run build'
      );
  });
}

/* ------------------------------------------------------------------ */
/* المزامنة الدورية                                                    */
/* ------------------------------------------------------------------ */

cron.schedule('0 * * * *', () => {
  console.log('[cron] التحقق الدوري كل ساعة...');

  const accounts = new Map();
  for (const session of sessions.values()) {
    if (!accounts.has(session.userKey)) {
      accounts.set(session.userKey, {
        userKey: session.userKey,
        username: session.username,
        password: session.password,
      });
    }
  }

  if (accounts.size === 0) {
    console.log('[cron] مفيش حساب مسجّل دخول دلوقتي — تم تخطي المزامنة.');
    return;
  }

  // حساب ورا حساب عشان مفيش طلبات متوازية على المنصة.
  (async () => {
    for (const account of accounts.values()) {
      if (isSyncing(account.userKey)) continue;
      await runSync(account);
    }
  })().catch((error) => {
    console.error(`[cron] خطأ: ${sanitizeLog(error?.message || error)}`);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(sid);
  }
}, 60 * 60 * 1000).unref();

const server = app.listen(PORT, () => {
  console.log(`[server] شغال على http://localhost:${PORT}`);
  console.log('[server] سجّل دخولك من الموقع عشان تبدأ أول مزامنة.');
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function shutdown(signal) {
  console.log(`[server] استلام ${signal}، جاري الإغلاق...`);
  server.close(() => process.exit(0));

  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
