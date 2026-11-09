import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

export const BASE_URL = 'https://dtu.deltateach.com';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const AUTH_COOKIE = '.AspNetCore.Identity.Application';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(client, jar, user, pass) {
  const loginPage = await client.get('/Account/Login');
  const $ = cheerio.load(loginPage.data);
  const form = $('form[action="/Account/Login"]');

  if (form.length === 0) {
    throw new Error('تعذر العثور على فورم تسجيل الدخول في صفحة /Account/Login.');
  }

  // نجمع كل الحقول المخفية (anti-forgery وغيرها) بدل الاعتماد على اسم واحد.
  const fields = {};
  form.find('input[type="hidden"]').each((_, element) => {
    const name = $(element).attr('name');
    if (name) fields[name] = $(element).attr('value') ?? '';
  });

  fields.Email = user;
  fields.Password = pass;

  const action = form.attr('action') || '/Account/Login';
  const response = await client.post(action, new URLSearchParams(fields), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 5,
    validateStatus: () => true,
  });

  const finalUrl = response.request?.res?.responseUrl || '';
  const cookies = await jar.getCookies(BASE_URL);
  const hasAuthCookie = cookies.some((cookie) => cookie.key === AUTH_COOKIE);

  if (
    response.status >= 400 ||
    finalUrl.includes('/Account/Login') ||
    !hasAuthCookie
  ) {
    throw new Error('بيانات الدخول غير صحيحة.');
  }
}

/**
 * ينشئ axios instance مرتبط بـ cookie jar، ويسجّل الدخول ببيانات الحساب
 * اللي جاية من إعدادات الموقع (مش من ملف .env).
 * كل الطلبات تمر بفاصل 200–300ms وبترتيب واحد (الـ sync نفسه متسلسل).
 */
export async function createClient({ user, pass } = {}) {
  const username = typeof user === 'string' ? user.trim() : '';
  const password = typeof pass === 'string' ? pass : '';

  if (!username || !password) {
    throw new Error('اسم المستخدم أو كلمة المرور فاضية.');
  }

  const jar = new CookieJar();

  const client = wrapper(
    axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,
      timeout: 60_000,
      maxRedirects: 5,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ar,en;q=0.8',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
  );

  client.interceptors.request.use(async (config) => {
    // تأخير بسيط بين كل طلب والتاني؛ مفيش طلبات متوازية في التطبيق.
    await sleep(200 + Math.floor(Math.random() * 101));
    return config;
  });

  await login(client, jar, username, password);

  return client;
}
