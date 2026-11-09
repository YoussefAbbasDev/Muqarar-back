import crypto from 'node:crypto';
import path from 'node:path';
import * as cheerio from 'cheerio';

export class PlatformError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'PlatformError';
    this.cause = cause;
  }
}

/* ------------------------------------------------------------------ */
/* أدوات عامة                                                          */
/* ------------------------------------------------------------------ */

export function hash(...parts) {
  return crypto
    .createHash('sha1')
    .update(parts.map((part) => String(part ?? '')).join('|'))
    .digest('hex')
    .slice(0, 16);
}

function normalizeDigits(value) {
  return String(value).replace(/[٠-٩]/g, (digit) =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
  );
}

/**
 * يحوّل تاريخ المنصة (dd/MM/yyyy hh:mm:ss ص|م) إلى ISO محلي بدون timezone.
 * مثال: 03/11/2026 11:59:00 م  =>  2026-11-03T23:59:00
 */
export function parseDate(value) {
  if (value === null || value === undefined) return null;

  const raw = normalizeDigits(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) return null;

  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([صم]|AM|PM|am|pm)?$/
  );

  if (!match) {
    throw new PlatformError(`صيغة تاريخ غير معروفة من المنصة: "${raw}"`);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const marker = match[7];

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    minute > 59 ||
    second > 59
  ) {
    throw new PlatformError(`تاريخ غير صالح من المنصة: "${raw}"`);
  }

  if (marker) {
    if (hour < 1 || hour > 12) {
      throw new PlatformError(`ساعة غير صالحة في تاريخ المنصة: "${raw}"`);
    }
    hour = hour % 12;
    if (marker === 'م' || marker.toLowerCase() === 'pm') hour += 12;
  } else if (hour > 23) {
    throw new PlatformError(`ساعة غير صالحة في تاريخ المنصة: "${raw}"`);
  }

  const pad = (number, size = 2) => String(number).padStart(size, '0');

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(
    second
  )}`;
}

/**
 * يفصل عنوان الخلية إلى عنوان + محاضر.
 * "Lecture-01(د. فلان)" => { title: "Lecture-01", instructor: "د. فلان" }
 */
export function splitTitle(rawTitle) {
  const raw = String(rawTitle ?? '').replace(/\s+/g, ' ').trim();
  const match = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);

  if (!match) {
    return { title: raw, instructor: '' };
  }

  return {
    title: match[1].trim(),
    instructor: match[2].trim(),
  };
}

/** ينظّف اسم الملف من المحارف الممنوعة في Windows ويحدّه بـ 100 حرف. */
export function cleanFileName(name) {
  const cleaned = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, 100)
    .replace(/^[\s.]+|[\s.]+$/g, '');

  return cleaned || 'file';
}

/** ياخد الامتداد فقط من Content-Disposition، لأن اسم الملف دايماً File.ext. */
export function extensionFromDisposition(header) {
  if (!header) return '';

  const value = Array.isArray(header) ? header[0] : String(header);
  let fileName = '';

  const starMatch = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (starMatch) {
    try {
      fileName = decodeURIComponent(starMatch[1].trim());
    } catch {
      fileName = starMatch[1].trim();
    }
  }

  if (!fileName) {
    const plainMatch = value.match(
      /filename\s*=\s*"(?:\\.|[^"])*"|filename\s*=\s*[^;]+/i
    );
    if (plainMatch) {
      fileName = plainMatch[0]
        .replace(/^filename\s*=\s*/i, '')
        .replace(/^"|"$/g, '')
        .trim();
    }
  }

  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
}

/** رسالة خطأ آمنة للطباعة: تمسح أي token طويل. */
export function sanitizeLog(value) {
  return String(value ?? '')
    .replace(
      /\/(CourseMaterialDetails|DownloadFile|GoToExam|StudentCourseExamAnswers)\/[^\s?#]+/g,
      '/$1/<TOKEN>'
    )
    .replace(/([?&](?:examId|studentCourseId|id|token)=)[^\s&]+/gi, '$1<TOKEN>')
    .replace(/[A-Za-z0-9_-]{60,}/g, '<TOKEN>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

/** يستخرج صفوف جدول كـ arrays من نصوص الخلايا. */
export function fetchRows($, table) {
  return $(table)
    .find('tr')
    .toArray()
    .map((row) =>
      $(row)
        .find('td,th')
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim())
    );
}

function textOf($, element) {
  return $(element).text().replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* قراءة صفحات المنصة                                                  */
/* ------------------------------------------------------------------ */

/** GET /StudentCourses/CourseMaterial => قائمة المواد وروابط تفاصيلها. */
export async function fetchCourses(client) {
  const response = await client.get('/StudentCourses/CourseMaterial');
  const $ = cheerio.load(response.data);
  const links = $('a[href*="CourseMaterialDetails"]');

  if (links.length === 0) {
    throw new PlatformError(
      'مفيش أي مادة ظاهرة في صفحة CourseMaterial. ممكن الجلسة انتهت أو شكل الصفحة اتغير.'
    );
  }

  const courses = [];
  const seen = new Set();

  links.each((_, link) => {
    const href = $(link).attr('href');
    const row = $(link).closest('tr');
    const firstCell = row.find('td').first();
    const name = textOf($, firstCell);

    if (!href || !name) {
      throw new PlatformError(
        'صف المادة في صفحة CourseMaterial مش فيه اسم مادة أو رابط تفاصيل.'
      );
    }

    if (seen.has(name)) return;
    seen.add(name);
    courses.push({ name, url: href });
  });

  if (courses.length === 0) {
    throw new PlatformError('اتقرأت صفحة المواد لكن مفيش مواد صالحة.');
  }

  return courses;
}

/**
 * GET تفاصيل المادة => ملفات + تكليفات.
 * table[0] فيها اسم المادة، و table[1] فيها صفوف العناصر.
 */
export async function fetchCourseItems(client, course) {
  const response = await client.get(course.url);
  const $ = cheerio.load(response.data);
  const tables = $('table');

  if (tables.length < 2) {
    throw new PlatformError(
      `صفحة مادة "${course.name}" مفيهاش الجدولين المتوقعين (اسم المادة + العناصر).`
    );
  }

  const detailName =
    textOf($, tables.eq(0).find('tr').last().find('td').last()) ||
    course.name;

  const itemRows = tables.eq(1).find('tbody tr');
  if (itemRows.length === 0) {
    throw new PlatformError(
      `جدول عناصر مادة "${course.name}" فاضي أو الـ selector بتاعه اتغير.`
    );
  }

  const items = [];

  itemRows.each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');

    if (cells.length < 8) return;

    const order = textOf($, cells.eq(0));
    const type = textOf($, cells.eq(2));
    const rawTitle = textOf($, cells.eq(3));

    // صف الهيدر (أول خليتين فاضيين) أو أي صف مش حقيقي.
    if (!order || order === '#' || !rawTitle || type === 'نوع الملف') return;

    const startRaw = textOf($, cells.eq(4));
    const endRaw = textOf($, cells.eq(5));
    const semester = textOf($, cells.eq(6));
    const downloadHref =
      $row.find('a[href*="DownloadFile"]').attr('href') || null;
    const { title, instructor } = splitTitle(rawTitle);

    items.push({
      id: hash(course.name, rawTitle, startRaw),
      course: course.name,
      type,
      rawTitle,
      title,
      instructor,
      startRaw,
      endRaw,
      start: parseDate(startRaw),
      end: parseDate(endRaw),
      semester,
      downloadHref,
      isHomework: type.includes('تكليف'),
    });
  });

  if (items.length === 0) {
    throw new PlatformError(
      `مفيش صفوف عناصر اتقرأت من مادة "${course.name}". راجع شكل الجدول في المنصة.`
    );
  }

  return { name: detailName, items };
}

/**
 * GET /StudentCourses/UploadCourseHomework (قراءة) + POST AvailableCourseHomework
 * لكل مادة لمعرفة التكليفات المفتوحة. مفيش أي رفع أو تسليم.
 */
export async function fetchHomework(client) {
  const response = await client.get('/StudentCourses/UploadCourseHomework');
  const $ = cheerio.load(response.data);

  const token = $('input[name="__RequestVerificationToken"]').first().attr('value');
  if (!token) {
    throw new PlatformError(
      'مفيش __RequestVerificationToken في صفحة التكليفات. الجلسة أو الصفحة اتغيرت.'
    );
  }

  const courses = $('select#StudentCourseId option')
    .toArray()
    .map((option) => ({
      id: $(option).attr('value')?.trim() || '',
      name: textOf($, option),
    }))
    .filter((course) => course.id && course.name);

  if (courses.length === 0) {
    throw new PlatformError(
      'select#StudentCourseId مفيهوش مواد، فمش هنعرف نجيب التكليفات المفتوحة.'
    );
  }

  let submittedTable = null;
  $('table').each((_, table) => {
    const text = textOf($, table);
    if (text.includes('اسم التكليف') && text.includes('درجة التكليف')) {
      submittedTable = $(table);
    }
  });

  if (!submittedTable) {
    throw new PlatformError(
      'جدول التكليفات المسلَّمة مش موجود في صفحة UploadCourseHomework.'
    );
  }

  const submitted = [];
  submittedTable.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 7) return;

    const first = textOf($, cells.eq(0));
    const course = textOf($, cells.eq(1));
    const instructor = textOf($, cells.eq(2));
    const title = textOf($, cells.eq(3));

    if (first === '#' || title === 'اسم التكليف' || !course || !title) return;

    const submittedRaw = textOf($, cells.eq(4));
    submitted.push({
      course,
      instructor,
      title,
      submittedAt: parseDate(submittedRaw),
      grade: textOf($, cells.eq(6)) || null,
    });
  });

  const open = [];
  const warnings = [];

  for (const course of courses) {
    try {
      const available = await client.post(
        `/StudentCourses/AvailableCourseHomework?studentCourseId=${encodeURIComponent(
          course.id
        )}`,
        '',
        {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'text/html',
            RequestVerificationToken: token,
          },
        }
      );

      const $available = cheerio.load(available.data);
      $available('option').each((_, option) => {
        const value = $available(option).attr('value')?.trim() || '';
        const title = textOf($available, option);
        if (!value || !title) return;
        open.push({
          course: course.name,
          courseId: course.id,
          title,
          homeworkId: value,
        });
      });
    } catch (error) {
      warnings.push(
        `تعذر جلب التكليفات المفتوحة لمادة "${course.name}": ${sanitizeLog(
          error?.message || error
        )}`
      );
    }
  }

  return { submitted, open, warnings };
}

/**
 * GET /CourseExam/Index ثم POST /CourseExam/DisplayStudentExamList (قراءة فقط).
 * ممنوع تماماً لمس فورم GoToExam.
 */
export async function fetchExams(client) {
  const page = await client.get('/CourseExam/Index');
  const $ = cheerio.load(page.data);
  const token = $('input[name="__RequestVerificationToken"]').first().attr('value');

  if (!token) {
    throw new PlatformError(
      'مفيش __RequestVerificationToken في صفحة الاختبارات. الجلسة أو الصفحة اتغيرت.'
    );
  }

  const response = await client.post('/CourseExam/DisplayStudentExamList', '', {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'text/html',
      RequestVerificationToken: token,
    },
  });

  const $list = cheerio.load(response.data);
  const rows = $list('table > tbody > tr');

  if (rows.length === 0) {
    throw new PlatformError(
      'رد DisplayStudentExamList مفيهوش جدول اختبارات. شكل الصفحة اتغير.'
    );
  }

  const exams = [];
  const warnings = [];
  const seen = new Set();
  let parsedRows = 0;

  rows.each((_, row) => {
    const cells = $list(row).find('td');
    if (cells.length < 4) return;
    parsedRows += 1;

    const title = textOf($list, cells.eq(0));
    const course = textOf($list, cells.eq(1));
    const instructor = textOf($list, cells.eq(2));
    const statusCell = cells.eq(3);
    const statusText = textOf($list, statusCell);

    if (!title || !course) return;

    const done =
      $list(statusCell).find('a[href*="StudentCourseExamAnswers"]').length > 0 ||
      $list(row).find('a[href*="StudentCourseExamAnswers"]').length > 0;

    const endMatch = statusText.match(
      /الاختبار\s+متاح\s+حتى\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*[صم])/
    );
    const end = endMatch ? parseDate(endMatch[1]) : null;

    if (!done && !end) {
      warnings.push(
        `اختبار "${title}" (${course}) مش محدد له موعد نهاية ومش محلول، فتم تجاهله.`
      );
      return;
    }

    const key = `${course}|${title}`;
    if (seen.has(key)) return;
    seen.add(key);

    exams.push({
      id: hash(course, title),
      title,
      course,
      instructor,
      end,
      done,
    });
  });

  if (parsedRows === 0) {
    const hasAnyCells = rows
      .toArray()
      .some((row) => $list(row).find('td').length > 0);

    if (hasAnyCells) {
      throw new PlatformError(
        'صفوف جدول الاختبارات مفيهاش 4 خلايا، فشكل الـ HTML اتغير.'
      );
    }

    return {
      exams: [],
      warnings: ['جدول الاختبارات موجود لكن مفيهوش أي اختبارات متاحة.'],
    };
  }

  return { exams, warnings };
}
