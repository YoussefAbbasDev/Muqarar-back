import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { createClient } from './client.mjs';
import {
  cleanFileName,
  extensionFromDisposition,
  fetchCourseItems,
  fetchCourses,
  fetchExams,
  fetchHomework,
  hash,
  sanitizeLog,
} from './platform.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(ROOT, '..', 'client', 'public', 'data');
export const ACCOUNTS_DIR = path.join(DATA_DIR, 'accounts');

// مكان البيانات القديمة قبل نظام الحسابات: بيتنقل لأول حساب يسجّل دخول.
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'data.json');
const LEGACY_FILES_DIR = path.join(DATA_DIR, 'files');

const syncingAccounts = new Set();
const syncProgressMap = new Map();

export function isSyncing(userKey) {
  if (userKey) return syncingAccounts.has(userKey);
  return syncingAccounts.size > 0;
}

export function getSyncProgress(userKey) {
  if (!userKey) return null;
  return syncProgressMap.get(userKey) || null;
}

function updateProgress(userKey, update) {
  const current = syncProgressMap.get(userKey) || {};
  syncProgressMap.set(userKey, { ...current, ...update, updatedAt: Date.now() });
}

/* ------------------------------------------------------------------ */
/* مسارات الحسابات                                                     */
/* ------------------------------------------------------------------ */

/** مفتاح ثابت للحساب من اسم المستخدم، من غير ما نخزّن الاسم نفسه في المسار. */
export function accountKey(username) {
  return crypto
    .createHash('sha256')
    .update(String(username ?? '').trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

export function accountPaths(userKey) {
  const dir = path.join(ACCOUNTS_DIR, userKey);
  return {
    userKey,
    dir,
    dataFile: path.join(dir, 'data.json'),
    filesDir: path.join(dir, 'files'),
  };
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function moveIntoPlace(from, to) {
  if (!(await pathExists(from))) return false;

  await mkdir(path.dirname(to), { recursive: true });

  try {
    await rename(from, to);
    return true;
  } catch (error) {
    if (!['EXDEV', 'EPERM', 'EACCES'].includes(error.code)) throw error;

    // لو الـ rename فشل (اختلاف درايف أو صلاحيات) ننسخ ثم نمسح الأصل.
    await cp(from, to, { recursive: true, force: false, errorOnExist: false });
    await rm(from, { recursive: true, force: true });
    return true;
  }
}

let claimingLegacy = Promise.resolve();

/**
 * أول حساب يسجّل دخول بياخد بيانات/ملفات النسخة القديمة (لو موجودة)
 * عشان ما نضيّعش الملفات اللي اتنزلت قبل نظام الحسابات.
 */
export function claimLegacyData(userKey) {
  claimingLegacy = claimingLegacy.then(async () => {
    const paths = accountPaths(userKey);

    try {
      if (await pathExists(paths.dataFile)) return false;
      if (!(await pathExists(LEGACY_DATA_FILE))) return false;

      await mkdir(paths.dir, { recursive: true });

      const movedFiles = await moveIntoPlace(
        LEGACY_FILES_DIR,
        paths.filesDir
      );
      const movedData = await moveIntoPlace(LEGACY_DATA_FILE, paths.dataFile);

      if (movedData) {
        console.log(
          `[sync] تم نقل بيانات النسخة القديمة لحسابك${movedFiles ? ' مع الملفات' : ''}.`
        );
      }

      return movedData;
    } catch (error) {
      console.error(
        `[sync] تعذر نقل البيانات القديمة: ${sanitizeLog(error?.message || error)}`
      );
      return false;
    }
  });

  return claimingLegacy;
}

/* ------------------------------------------------------------------ */
/* قراءة/كتابة data.json                                               */
/* ------------------------------------------------------------------ */

function normalizeData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('ملف data.json مش JSON object صالح.');
  }

  return {
    syncedAt: data.syncedAt ?? null,
    courses: Array.isArray(data.courses) ? data.courses : [],
    files: (Array.isArray(data.files) ? data.files : []).map((file) => ({
      ...file,
      localFile: file.localFile ?? null,
      size: typeof file.size === 'number' ? file.size : null,
      removedFromSite: Boolean(file.removedFromSite),
    })),
    homework: (Array.isArray(data.homework) ? data.homework : []).map(
      (item) => ({
        ...item,
        start: item.start ?? null,
        end: item.end ?? null,
        submitted: Boolean(item.submitted),
        submittedAt: item.submittedAt ?? null,
        grade: item.grade ?? null,
        openNow: Boolean(item.openNow),
      })
    ),
    exams: (Array.isArray(data.exams) ? data.exams : []).map((exam) => ({
      ...exam,
      end: exam.end ?? null,
      done: Boolean(exam.done),
    })),
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}

export async function readData(userKey) {
  const paths = accountPaths(userKey);
  let raw;

  try {
    raw = await readFile(paths.dataFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }

  try {
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      `تعذر قراءة بيانات الحساب: ${sanitizeLog(error?.message || error)}`
    );
  }
}

async function writeDataAtomic(paths, data) {
  await mkdir(paths.dir, { recursive: true });

  const tempFile = `${paths.dataFile}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  try {
    await rename(tempFile, paths.dataFile);
  } catch (error) {
    // على Windows أحياناً rename فوق ملف موجود بيرمي EPERM/EEXIST.
    if (['EEXIST', 'EPERM', 'EACCES'].includes(error.code)) {
      await rm(paths.dataFile, { force: true });
      await rename(tempFile, paths.dataFile);
    } else {
      await rm(tempFile, { force: true }).catch(() => {});
      throw error;
    }
  }
}

/* ------------------------------------------------------------------ */
/* التنزيل                                                             */
/* ------------------------------------------------------------------ */

function safeLocalPath(filesDir, localFile) {
  if (typeof localFile !== 'string' || !localFile) return null;
  if (path.basename(localFile) !== localFile) return null;
  return path.join(filesDir, localFile);
}

async function existingDownload(filesDir, localFile) {
  const filePath = safeLocalPath(filesDir, localFile);
  if (!filePath) return null;

  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size === 0) return null;
    return { localFile, size: info.size };
  } catch {
    return null;
  }
}

async function downloadFile(client, href, baseName, filesDir) {
  const response = await client.get(href, {
    responseType: 'stream',
    timeout: 180_000,
    maxRedirects: 5,
    validateStatus: () => true,
  });

  const destroyStream = () => {
    try {
      response.data?.destroy?.();
    } catch {
      // ignore
    }
  };

  if (response.status !== 200) {
    destroyStream();
    throw new Error(`المنصة ردت بحالة ${response.status} عند تنزيل الملف.`);
  }

  const contentType = String(
    response.headers?.['content-type'] || ''
  ).toLowerCase();
  if (contentType.includes('text/html')) {
    destroyStream();
    throw new Error(
      'رد التنزيل HTML بدل ملف؛ غالباً الجلسة انتهت أو رابط التنزيل باظ.'
    );
  }

  const extension = extensionFromDisposition(
    response.headers?.['content-disposition']
  );
  const localFile = `${baseName}${extension}`;
  const finalPath = path.join(filesDir, localFile);
  const partPath = `${finalPath}.part`;

  await mkdir(filesDir, { recursive: true });

  try {
    await pipeline(response.data, createWriteStream(partPath));

    const info = await stat(partPath);
    if (!info.isFile() || info.size === 0) {
      throw new Error('الملف اللي نزل فاضي (0 بايت).');
    }

    await rename(partPath, finalPath);
    return { localFile, size: info.size };
  } catch (error) {
    await rm(partPath, { force: true }).catch(() => {});
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* دمج التكليفات                                                       */
/* ------------------------------------------------------------------ */

function matchKey(course, title) {
  return `${String(course ?? '').trim().toLowerCase()}|${String(title ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()}`;
}

function mergeHomework(detailHomework, homeworkPage) {
  const submittedByKey = new Map();
  for (const item of homeworkPage.submitted) {
    const key = matchKey(item.course, item.title);
    if (!submittedByKey.has(key)) submittedByKey.set(key, item);
  }

  const openByKey = new Map();
  for (const item of homeworkPage.open) {
    const key = matchKey(item.course, item.title);
    if (!openByKey.has(key)) openByKey.set(key, item);
  }

  const instructorByCourse = new Map();
  for (const item of detailHomework) {
    if (item.instructor && !instructorByCourse.has(item.course)) {
      instructorByCourse.set(item.course, item.instructor);
    }
  }

  const result = [];
  const seenIds = new Set();
  const seenOpenKeys = new Set();

  for (const item of detailHomework) {
    const key = matchKey(item.course, item.title);
    const submitted = submittedByKey.get(key);
    const open = openByKey.get(key);

    seenOpenKeys.add(key);
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    result.push({
      id: item.id,
      course: item.course,
      title: item.title,
      instructor: item.instructor || '',
      start: item.start,
      end: item.end,
      submitted: Boolean(submitted),
      submittedAt: submitted?.submittedAt ?? null,
      grade: submitted?.grade ?? null,
      openNow: Boolean(open),
    });
  }

  // تكليف مفتوح مش ظاهر في قايمة الملفات: نضيفه كتنبيه بدون مواعيد.
  for (const item of homeworkPage.open) {
    const key = matchKey(item.course, item.title);
    if (seenOpenKeys.has(key)) continue;
    seenOpenKeys.add(key);

    result.push({
      id: hash(item.course, item.title, ''),
      course: item.course,
      title: item.title,
      instructor: instructorByCourse.get(item.course) || '',
      start: null,
      end: null,
      submitted: false,
      submittedAt: null,
      grade: null,
      openNow: true,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* المزامنة                                                            */
/* ------------------------------------------------------------------ */

function errorText(error) {
  return sanitizeLog(error?.message || error);
}

/**
 * مزامنة حساب واحد. بتحتاج بيانات الدخول (من جلسة الموقع) أو client جاهز
 * اتسجّل دخوله بالفعل وقت تسجيل الدخول.
 */
export async function runSync({ userKey, username, password, client: providedClient } = {}) {
  if (!userKey) {
    return { ok: false, error: 'مفيش حساب محدد للمزامنة.' };
  }

  if (syncingAccounts.has(userKey)) {
    console.warn('[sync] في مزامنة شغالة بالفعل للحساب — تم تجاهل الطلب.');
    return { ok: false, skipped: true };
  }

  syncingAccounts.add(userKey);
  const paths = accountPaths(userKey);
  const startedAt = Date.now();
  updateProgress(userKey, {
    phase: 'auth',
    message: 'جاري تسجيل الدخول وفحص الحساب...',
    percent: 10,
    current: 0,
    total: 0,
  });

  try {
    const oldData = await readData(userKey);
    const oldFiles = new Map(
      (oldData?.files ?? []).map((file) => [file.id, file])
    );

    console.log('[sync] بدء المزامنة...');
    const client =
      providedClient ??
      (await createClient({ user: username, pass: password }));
    console.log('[sync] تم تسجيل الدخول.');

    updateProgress(userKey, {
      phase: 'courses',
      message: 'جاري جلب قائمة المقررات المسجلة...',
      percent: 20,
      current: 0,
      total: 0,
    });

    const courses = await fetchCourses(client);
    const parsedCourses = new Set();
    const failedCourses = new Set();
    const errors = [];
    const detailFiles = [];
    const detailHomework = [];

    let courseIdx = 0;
    for (const course of courses) {
      courseIdx++;
      updateProgress(userKey, {
        phase: 'courses',
        message: `جاري قراءة تفاصيل مادة: ${course.name} (${courseIdx}/${courses.length})`,
        percent: Math.round(20 + (courseIdx / Math.max(courses.length, 1)) * 25),
        current: courseIdx,
        total: courses.length,
      });

      try {
        const detail = await fetchCourseItems(client, course);
        parsedCourses.add(course.name);

        for (const item of detail.items) {
          if (item.isHomework) detailHomework.push(item);
          else detailFiles.push(item);
        }
      } catch (error) {
        failedCourses.add(course.name);
        errors.push(`مادة "${course.name}": ${errorText(error)}`);
      }
    }

    if (parsedCourses.size === 0) {
      throw new Error(
        'تعذر قراءة تفاصيل أي مادة؛ لن يتم استبدال البيانات القديمة.'
      );
    }

    const files = [];
    const currentFileIds = new Set();
    let downloaded = 0;

    const filesToDownload = detailFiles.filter((item) => {
      const old = oldFiles.get(item.id);
      return !old?.localFile && item.downloadHref;
    }).length;

    let downloadIdx = 0;
    for (const item of detailFiles) {
      if (currentFileIds.has(item.id)) continue;
      currentFileIds.add(item.id);

      const oldFile = oldFiles.get(item.id);
      let localFile = null;
      let size = null;

      if (oldFile?.localFile) {
        const existing = await existingDownload(paths.filesDir, oldFile.localFile);
        if (existing) {
          localFile = existing.localFile;
          size = existing.size;
        }
      }

      if (!localFile && item.downloadHref) {
        downloadIdx++;
        updateProgress(userKey, {
          phase: 'download',
          message: `جاري تنزيل الملفات: ${item.title} (${downloadIdx}/${filesToDownload || detailFiles.length})`,
          percent: Math.round(45 + (downloadIdx / Math.max(filesToDownload, 1)) * 40),
          current: downloadIdx,
          total: filesToDownload || detailFiles.length,
        });

        const baseName = `${item.id.slice(0, 8)}_${cleanFileName(item.title)}`;
        try {
          const result = await downloadFile(
            client,
            item.downloadHref,
            baseName,
            paths.filesDir
          );
          localFile = result.localFile;
          size = result.size;
          downloaded += 1;
          console.log(`[sync] نزل: ${item.title} (${size} بايت)`);
        } catch (error) {
          errors.push(
            `تنزيل "${item.title}" من مادة "${item.course}": ${errorText(error)}`
          );
        }
      }

      files.push({
        id: item.id,
        course: item.course,
        type: item.type,
        title: item.title,
        instructor: item.instructor,
        start: item.start,
        end: item.end,
        semester: item.semester,
        localFile,
        size,
        removedFromSite: false,
      });
    }

    // الملفات اللي كانت عندنا واختفت من المنصة تفضل محفوظة.
    for (const oldFile of oldData?.files ?? []) {
      if (currentFileIds.has(oldFile.id)) continue;

      if (failedCourses.has(oldFile.course)) {
        files.push(oldFile);
      } else {
        files.push({ ...oldFile, removedFromSite: true });
      }
    }

    let homework = [];
    try {
      const homeworkPage = await fetchHomework(client);
      errors.push(...homeworkPage.warnings);
      homework = mergeHomework(detailHomework, homeworkPage);

      // لو تفاصيل مادة فشلت، منمسحش تنبيهاتها القديمة.
      if (failedCourses.size > 0) {
        const seenHomeworkIds = new Set(homework.map((item) => item.id));
        for (const oldItem of oldData?.homework ?? []) {
          if (
            failedCourses.has(oldItem.course) &&
            !seenHomeworkIds.has(oldItem.id)
          ) {
            seenHomeworkIds.add(oldItem.id);
            homework.push(oldItem);
          }
        }
      }
    } catch (error) {
      errors.push(`التكليفات: ${errorText(error)}`);
      homework = oldData?.homework ?? [];
    }

    updateProgress(userKey, {
      phase: 'tasks',
      message: 'جاري فحص وتحديث التكليفات والاختبارات...',
      percent: 88,
    });

    let exams = [];
    try {
      const examPage = await fetchExams(client);
      errors.push(...examPage.warnings);
      exams = examPage.exams;
    } catch (error) {
      errors.push(`الاختبارات: ${errorText(error)}`);
      exams = oldData?.exams ?? [];
    }

    updateProgress(userKey, {
      phase: 'saving',
      message: 'جاري حفظ البيانات وتنظيم الملفات...',
      percent: 95,
    });

    const data = {
      syncedAt: new Date().toISOString(),
      courses: courses.map((course) => course.name),
      files,
      homework,
      exams,
      errors,
    };

    await writeDataAtomic(paths, data);

    updateProgress(userKey, {
      phase: 'done',
      message: `تم اكتمال المزامنة بنجاح! (${downloaded} ملف تم تنزيله)`,
      percent: 100,
      current: files.length,
      total: files.length,
    });

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[sync] تمت المزامنة في ${seconds} ثانية: ${files.length} ملف (${downloaded} تنزيل جديد) · ${homework.length} تكليف · ${exams.length} اختبار · ${errors.length} خطأ`
    );

    return {
      ok: true,
      files: files.length,
      homework: homework.length,
      exams: exams.length,
      errors: errors.length,
      downloaded,
    };
  } catch (error) {
    console.error(`[sync] فشل: ${errorText(error)}`);
    updateProgress(userKey, {
      phase: 'error',
      message: `فشل المزامنة: ${errorText(error)}`,
      percent: 100,
    });
    return { ok: false, error: errorText(error) };
  } finally {
    syncingAccounts.delete(userKey);
    setTimeout(() => syncProgressMap.delete(userKey), 8000);
  }
}
