import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dtu_token') : null;
  if (token && path.includes('/api/files/')) {
    const separator = path.includes('?') ? '&' : '?';
    return `${API_BASE}${path}${separator}token=${encodeURIComponent(token)}`;
  }
  return `${API_BASE}${path}`;
};

function apiFetch(path, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dtu_token') : null;
  const headers = {
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });
}

function getFileUrl(file, action = 'download') {
  if (file?.localFile) {
    return `/data/files/${encodeURIComponent(file.localFile)}`;
  }
  return apiUrl(`/api/files/${encodeURIComponent(file?.id || '')}/${action}`);
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M3 6h6l2 2.5h10V19H3V6Z" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M8 4H5v16h14V4h-3" />
      <path d="M9 3h6v3H9V3ZM8 10h8M8 14h5" />
    </svg>
  );
}

function ExamIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M14 3H6v18h12V7l-4-4Z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

function DownloadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 18v3h16v-3" />
    </svg>
  );
}

function RefreshIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 8.2A7 7 0 0 1 19.5 9M4.5 15A7 7 0 0 0 17.9 15.8" />
    </svg>
  );
}

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.2 16.2 4.3 4.3" />
    </svg>
  );
}

function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.7 2.7L16.5 9" />
    </svg>
  );
}

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M20 12H4m0 0 6-6m-6 6 6 6" />
    </svg>
  );
}

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M12 3 2.5 20.5h19L12 3Z" />
      <path d="M12 9v5M12 17v.2" />
    </svg>
  );
}

function CloudOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M6.5 18a4.5 4.5 0 0 1-.9-8.9A6 6 0 0 1 16.8 6" />
      <path d="M18.3 9.2A4.5 4.5 0 0 1 17.5 18H9M3 3l18 18" />
    </svg>
  );
}

function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.63.68 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M10.6 6.1A8.9 8.9 0 0 1 12 6c6.2 0 9.8 6 9.8 6a16.6 16.6 0 0 1-3.2 3.8M6.1 6.6A17 17 0 0 0 2.2 12S5.8 18 12 18a9.2 9.2 0 0 0 4.2-1M3 3l18 18" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <rect x="4" y="10" width="16" height="11" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>
      <path d="M9 21H5V3h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

function LogoMark({ className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Logo"
      className={`object-contain ${className}`}
    />
  );
}

const TRIANGLE_PATHS = {
  tl: 'polygon(0 0, 100% 0, 0 100%)',
  tr: 'polygon(0 0, 100% 0, 100% 100%)',
  bl: 'polygon(0 0, 0 100%, 100% 100%)',
  br: 'polygon(100% 0, 100% 100%, 0 100%)',
};

function Triangle({ corner = 'br', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bg-signal ${className}`}
      style={{ clipPath: TRIANGLE_PATHS[corner] }}
    />
  );
}

function Brand({ tone = 'light' }) {
  const light = tone === 'light';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden`}
      >
        <LogoMark className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p
          className={`truncate main-name font-display text-[23px] italic leading-none tracking-tight ${
            light ? 'text-paper' : 'text-ink'
          }`}
        >
          Muqarar
        </p>
        <p
          className={`mt-1 truncate font-mono text-[8px] uppercase tracking-[0.26em] ${
            light ? 'text-paper/45' : 'text-stone'
          }`}
        >
          DTU · Study archive
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: 'files', label: 'الملفات', icon: FolderIcon },
  { id: 'homework', label: 'التكليفات', icon: ClipboardIcon },
  { id: 'exams', label: 'الاختبارات', icon: ExamIcon },
];

const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DAY = 24 * 60 * 60 * 1000;

const URGENCY_STYLES = {
  critical: {
    card: 'border-signal bg-signal/[0.055]',
    bar: 'bg-signal',
    badge: 'border-signal text-signal',
  },
  warning: {
    card: 'border-ink/35 bg-paper',
    bar: 'bg-stone',
    badge: 'border-stone text-stone',
  },
  normal: {
    card: 'border-ink/20 bg-paper',
    bar: 'bg-ink/70',
    badge: 'border-ink/25 text-stone',
  },
  done: {
    card: 'border-stone/30 bg-stone/[0.045]',
    bar: 'bg-stone/40',
    badge: 'border-stone/40 text-stone',
  },
};

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

function formatSize(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function itemIsActive(item, now) {
  if (!item.end) return true;
  const end = new Date(item.end).getTime();
  return Number.isNaN(end) ? true : end > now;
}

function remainingParts(end, now) {
  if (!end) return null;
  const diff = new Date(end).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;

  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / (60 * 60 * 1000)),
    minutes: Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)),
  };
}

function remainingLabel(parts) {
  if (!parts) return '';
  const { days, hours, minutes } = parts;

  if (days > 0) return `باقي ${days} يوم و ${hours} ساعة`;
  if (hours > 0) return `باقي ${hours} ساعة و ${minutes} دقيقة`;
  return `باقي ${Math.max(1, minutes)} دقيقة`;
}

function urgencyOf(item, now, completed) {
  if (completed) return 'done';
  if (!item.end) return 'normal';

  const diff = new Date(item.end).getTime() - now;
  if (!Number.isFinite(diff)) return 'normal';
  if (diff < DAY) return 'critical';
  if (diff < 3 * DAY) return 'warning';
  return 'normal';
}

function canPreview(file) {
  if (!file.localFile) return false;
  const extension = String(file.localFile).toLowerCase();
  return extension.endsWith('.pdf') || /\.(png|jpe?g|gif|webp)$/.test(extension);
}

function sortFilesNewest(files) {
  return [...files].sort((a, b) => {
    const timeA = a.start ? new Date(a.start).getTime() : 0;
    const timeB = b.start ? new Date(b.start).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(a.title).localeCompare(String(b.title), 'ar');
  });
}

function sortByEndSoonest(items) {
  return [...items].sort((a, b) => {
    const timeA = a.end ? new Date(a.end).getTime() : Number.POSITIVE_INFINITY;
    const timeB = b.end ? new Date(b.end).getTime() : Number.POSITIVE_INFINITY;
    return timeA - timeB;
  });
}

function padIndex(value) {
  return String(value).padStart(2, '0');
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
    username: '',
  });
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('files');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadData = useCallback(async ({ quiet = false } = {}) => {
    try {
      const response = await apiFetch('/api/data', { cache: 'no-store' });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (response.status === 401) {
        // لو فيه بيانات محلية، منقفلش الصفحة ولا نرجع لشاشة الدخول
        try {
          const localRes = await fetch('/data/data.json');
          if (localRes.ok) {
            const localData = await localRes.json();
            if (localData?.courses?.length > 0) {
              setData(localData);
              setSyncing(false);
              setSyncProgress(null);
              setSession({
                loading: false,
                authenticated: true,
                username: 'طالب DTU',
              });
              return;
            }
          }
        } catch {}

        setSession({ loading: false, authenticated: false, username: '' });
        setData(null);
        setLoadError('');
        setSyncing(false);
        setSyncProgress(null);
        return;
      }

      if (!response.ok) {
        if (response.status === 503) {
          // جلب البيانات المحلية فوراً
          try {
            const localRes = await fetch('/data/data.json');
            if (localRes.ok) {
              const localData = await localRes.json();
              if (localData?.courses?.length > 0) {
                setData(localData);
                setLoadError('');
                setSyncing(false);
                setSyncProgress(null);
                setSession((prev) => ({
                  ...prev,
                  loading: false,
                  authenticated: true,
                  username: prev.username || 'طالب DTU',
                }));
                return;
              }
            }
          } catch {}

          setSyncing(Boolean(payload.syncing));
          if (payload.progress) setSyncProgress(payload.progress);
          return;
        }
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setData(payload);
      setLoadError('');
      setSyncing(Boolean(payload.syncing));
      if (payload.progress) {
        setSyncProgress(payload.progress);
      } else if (!payload.syncing) {
        setSyncProgress(null);
      }
    } catch {
      if (!quiet) {
        setLoadError('تعذر الاتصال بالسيرفر. تأكد إن السيرفر شغال.');
      }
      // في حالة تعذر الاتصال، نجرب نجيب البيانات المحلية
      setData((currentData) => {
        if (currentData) return currentData;
        fetch('/data/data.json')
          .then((res) => (res.ok ? res.json() : null))
          .then((localData) => {
            if (localData) {
              setData(localData);
              setLoadError('');
            }
          })
          .catch(() => {});
        return null;
      });
    }
  }, []);

  const bootstrap = useCallback(async () => {
    // إذا كان المستخدم ضغط "تسجيل الخروج" بنفسه، نثبت على شاشة تسجيل الدخول
    const explicitlyLoggedOut =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('dtu_logged_out') === 'true';

    if (explicitlyLoggedOut) {
      setSession({ loading: false, authenticated: false, username: '' });
      setData(null);
      return;
    }

    let hasLocalData = false;

    // 1. فحص وجود بيانات محلية مرفوعة مع الفرونت إند أولاً
    try {
      const localRes = await fetch('/data/data.json');
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData?.courses?.length > 0) {
          setData(localData);
          hasLocalData = true;
          setSession({
            loading: false,
            authenticated: true,
            username: 'طالب DTU',
          });
        }
      }
    } catch {}

    // 2. التحقق من اتصال السيرفر والجلسة الحية (إذا كانت متوفرة)
    try {
      const response = await apiFetch('/api/session', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (payload?.authenticated) {
        setSession({
          loading: false,
          authenticated: true,
          username: payload.username || '',
        });
        setSyncing(Boolean(payload.syncing));
        if (payload.progress) setSyncProgress(payload.progress);
        await loadData();
        return;
      }
    } catch {
      if (hasLocalData) {
        setLoadError('');
        return;
      }
    }

    // لو مفيش جلسة ومفيش بيانات محلية، نعرض شاشة تسجيل الدخول
    if (!hasLocalData) {
      localStorage.removeItem('dtu_token');
      setSession({ loading: false, authenticated: false, username: '' });
    }
  }, [loadData]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!syncing) return undefined;
    const timer = setInterval(() => loadData({ quiet: true }), 3000);
    return () => clearInterval(timer);
  }, [syncing, loadData]);

  const homework = data?.homework ?? [];
  const exams = data?.exams ?? [];

  const requiredHomework = homework.filter(
    (item) => !item.submitted && itemIsActive(item, now)
  ).length;
  const requiredExams = exams.filter(
    (item) => !item.done && itemIsActive(item, now)
  ).length;

  const badges = { homework: requiredHomework, exams: requiredExams };

  const handleLogin = useCallback(
    async ({ username, password }) => {
      try {
        const response = await apiFetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          return {
            ok: false,
            error: payload.error || 'تعذر تسجيل الدخول. حاول تاني.',
          };
        }

        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('dtu_logged_out');
          if (payload.token) {
            localStorage.setItem('dtu_token', payload.token);
          }
        }

        setSession({
          loading: false,
          authenticated: true,
          username: payload.username || username,
        });
        setLoadError('');
        setSyncError('');
        setSyncing(true);
        setSettingsOpen(false);
        loadData({ quiet: true });

        return { ok: true };
      } catch {
        return { ok: false, error: 'تعذر الاتصال بالسيرفر. حاول تاني.' };
      }
    },
    [loadData]
  );

  async function handleLogout() {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {
      // حتى لو الطلب فشل، نرجّع الواجهة لحالة تسجيل الدخول.
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dtu_logged_out', 'true');
      localStorage.removeItem('dtu_token');
    }
    setSettingsOpen(false);
    setData(null);
    setSelectedCourse(null);
    setPage('files');
    setSyncing(false);
    setSyncError('');
    setLoadError('');
    setSession({ loading: false, authenticated: false, username: '' });
  }

  async function handleSync() {
    setSyncError('');
    setSyncing(true);

    try {
      const response = await apiFetch('/api/sync', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setSession({ loading: false, authenticated: false, username: '' });
        setData(null);
        setSyncing(false);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || 'تعذر بدء المزامنة.');
      }
    } catch {
      setSyncing(false);
      setSyncError('تعذر بدء التحديث. راجع إن السيرفر شغال.');
    }
  }

  function handleNavigate(nextPage) {
    setPage(nextPage);
    if (nextPage === 'files') setSelectedCourse(null);
  }

  function retryLoading() {
    setLoadError('');
    loadData();
  }

  if (session.loading) {
    return <SplashLoading />;
  }

  if (!session.authenticated) {
    return <LoginScreen onSubmit={handleLogin} serverError={loadError} />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        badges={badges}
        syncing={syncing}
        onSync={handleSync}
        syncError={syncError}
        username={session.username}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-5 sm:px-8 lg:px-12 lg:pt-9">
          <StatusBar syncedAt={data?.syncedAt} syncing={syncing} />

          {syncing && data && (
            <SyncProgressBar progress={syncProgress} syncing={syncing} />
          )}

          {data?.errors?.length > 0 && <NotesPanel errors={data.errors} />}

          {loadError && !data && (
            <ErrorState
              message={loadError}
              onRetry={retryLoading}
              syncing={syncing}
            />
          )}

          {!data && !loadError && (
            <FirstSyncState syncing={syncing} onSync={handleSync} progress={syncProgress} />
          )}

          {data && (
            <>
              {page === 'files' && (
                <FilesPage
                  data={data}
                  selectedCourse={selectedCourse}
                  onSelectCourse={setSelectedCourse}
                />
              )}

              {page === 'homework' && (
                <RemindersPage kind="homework" items={homework} now={now} />
              )}

              {page === 'exams' && (
                <RemindersPage kind="exams" items={exams} now={now} />
              )}
            </>
          )}
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          username={session.username}
          onClose={() => setSettingsOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function StatusBar({ syncedAt, syncing }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
      <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-stone">
        <span
          className={classNames(
            'h-1.5 w-1.5',
            syncing ? 'animate-pulse bg-signal' : 'bg-ink'
          )}
        />
        <span>{syncing ? 'Syncing' : 'Up to date'}</span>
        <span className="h-3 w-px bg-ink/15" />
        <span>Last sync · {syncedAt ? formatDateTime(syncedAt) : '—'}</span>
      </div>
      <span className="hidden font-mono text-[9px] uppercase tracking-[0.26em] text-stone sm:inline">
        Muqarar / DTU
      </span>
    </div>
  );
}

function Sidebar({
  page,
  onNavigate,
  badges,
  syncing,
  onSync,
  syncError,
  username,
  onOpenSettings,
}) {
  return (
    <aside className="bg-ink text-paper lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[300px] lg:shrink-0 lg:flex-col lg:border-l lg:border-paper/10">
      <div className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:py-7">
        <Brand tone="light" />

        <div className="ms-auto flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            aria-label="تحديث البيانات"
            className="grid h-10 w-10 place-items-center border border-paper/20 text-paper transition hover:bg-paper/10 disabled:opacity-50"
          >
            <RefreshIcon
              className={classNames('h-4 w-4', syncing && 'animate-spin')}
            />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="الإعدادات"
            className="grid h-10 w-10 place-items-center border border-paper/20 text-paper transition hover:bg-paper/10"
          >
            <GearIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="grid grid-cols-3 gap-px border-y border-paper/10 bg-paper/10 lg:mt-1 lg:block lg:border-0 lg:bg-transparent">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active = page === item.id;
          const count = badges[item.id] ?? 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={classNames(
                'relative flex items-center justify-center gap-1.5 px-1 py-3 text-[11px] font-semibold transition lg:justify-start lg:gap-3 lg:px-6 lg:py-4 lg:text-[13px]',
                active
                  ? 'bg-paper text-ink'
                  : 'bg-ink text-paper/60 hover:bg-paper/[0.05] hover:text-paper'
              )}
            >
              <span
                className={classNames(
                  'font-mono text-[8px] tracking-wider lg:text-[9px]',
                  active ? 'text-signal' : 'text-paper/30'
                )}
              >
                {padIndex(index + 1)}
              </span>
              <Icon
                className={classNames(
                  'h-4 w-4 shrink-0',
                  active ? 'text-ink' : 'text-paper/40'
                )}
              />
              <span className="truncate">{item.label}</span>
              {count > 0 && (
                <span
                  className={classNames(
                    'ms-auto hidden min-w-5 px-1 text-center font-mono text-[9px] leading-5 lg:inline-block',
                    active ? 'bg-signal text-paper' : 'bg-signal text-paper'
                  )}
                >
                  {count}
                </span>
              )}
              {count > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-signal lg:hidden" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden flex-1 flex-col px-6 py-6 lg:flex">
        <div className="mt-auto space-y-5">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="group relative flex w-full items-center justify-between bg-signal px-4 py-3 text-sm font-bold text-paper transition hover:bg-[#ff5a30] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <RefreshIcon
                className={classNames('h-4 w-4', syncing && 'animate-spin')}
              />
              {syncing ? 'جاري التحديث...' : 'تحديث دلوقتي'}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-paper/60">
              Sync
            </span>
            <Triangle corner="bl" className="bottom-0 left-0 h-2 w-2 bg-ink" />
          </button>

          {syncError && (
            <p className="font-body text-[11px] leading-5 text-signal">
              {syncError}
            </p>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center gap-3 border border-paper/15 px-3 py-3 text-start transition hover:border-paper/35"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center bg-paper/10">
              <UserIcon className="h-4 w-4 text-paper/70" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[8px] uppercase tracking-[0.24em] text-paper/35">
                Account
              </span>
              <span className="block truncate text-xs font-semibold text-paper/85">
                {username || 'حسابي'}
              </span>
            </span>
            <GearIcon className="h-4 w-4 shrink-0 text-paper/40" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Files page                                                          */
/* ------------------------------------------------------------------ */

function FilesPage({ data, selectedCourse, onSelectCourse }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const files = data.files ?? [];

  const courses = useMemo(() => {
    const names = [...(data.courses ?? [])];
    const known = new Set(names);
    for (const file of files) {
      if (file.course && !known.has(file.course)) {
        known.add(file.course);
        names.push(file.course);
      }
    }
    return names;
  }, [data.courses, files]);

  useEffect(() => {
    setQuery('');
    setTypeFilter('all');
  }, [selectedCourse]);

  const courseFiles = useMemo(
    () => files.filter((file) => file.course === selectedCourse),
    [files, selectedCourse]
  );

  const types = useMemo(
    () => [...new Set(courseFiles.map((file) => file.type).filter(Boolean))],
    [courseFiles]
  );

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = courseFiles.filter((file) => {
      const matchesQuery =
        !normalizedQuery ||
        String(file.title ?? '').toLowerCase().includes(normalizedQuery);
      const matchesType = typeFilter === 'all' || file.type === typeFilter;
      return matchesQuery && matchesType;
    });
    return sortFilesNewest(result);
  }, [courseFiles, query, typeFilter]);

  if (!selectedCourse) {
    return (
      <>
        <PageHeading
          index="01"
          en="Course files"
          title="ملفات المقررات"
          subtitle="كل ملفات الدكاترة مرتبة حسب المادة — معاينة PDF مباشرة أو تنزيل بالاسم الأصلي."
          aside={
            <div className="flex gap-2">
              <StatBlock value={courses.length} label="مواد" />
              <StatBlock value={files.length} label="ملفات" accent />
            </div>
          }
        />

        {courses.length === 0 ? (
          <EmptyState
            title="مفيش مواد ظاهرة"
            subtitle="لسه مفيش مواد محمّلة. جرّب تعمل تحديث أو استنى أول مزامنة."
            icon={FolderIcon}
          />
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => {
              const courseFilesList = files.filter(
                (file) => file.course === course
              );
              const available = courseFilesList.filter(
                (file) => file.localFile
              ).length;

              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => onSelectCourse(course)}
                  className="group relative overflow-hidden border border-ink/20 bg-paper p-5 text-start transition hover:border-ink hover:bg-white"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-stone">
                      {padIndex(index + 1)}
                    </span>
                    <FolderIcon className="h-5 w-5 text-ink/65 transition group-hover:text-signal" />
                  </div>

                  <h2 className="mt-9 font-heading text-lg font-bold leading-8 text-ink">
                    {course}
                  </h2>

                  <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
                      {courseFilesList.length} Files
                      <span className="mx-1.5 text-ink/20">/</span>
                      {available} Ready
                    </span>
                    <ArrowRightIcon className="h-4 w-4 rotate-180 text-ink/40 transition group-hover:-translate-x-1 group-hover:text-signal" />
                  </div>

                  <Triangle
                    corner="tr"
                    className="right-0 top-0 h-3 w-3 opacity-0 transition group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const availableCount = courseFiles.filter((file) => file.localFile).length;
  const courseIndex = Math.max(1, courses.indexOf(selectedCourse) + 1);

  return (
    <>
      <button
        type="button"
        onClick={() => onSelectCourse(null)}
        className="inline-flex items-center gap-2 border border-ink/20 px-3 py-2 text-xs font-semibold text-stone transition hover:border-ink hover:text-ink"
      >
        <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
        كل المواد
        <span className="ms-1 font-mono text-[8px] uppercase tracking-[0.2em] text-stone/70">
          Back
        </span>
      </button>

      <section className="relative mt-5 overflow-hidden bg-ink px-6 py-7 text-paper sm:px-8">
        <Triangle corner="tr" className="right-0 top-0 h-16 w-16" />
        <LogoMark className="pointer-events-none absolute -bottom-12 left-6 h-44 w-44 text-paper/[0.045]" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-paper/40">
              Course / {padIndex(courseIndex)}
            </p>
            <h1 className="mt-3 font-heading text-2xl font-extrabold leading-10 text-paper sm:text-3xl">
              {selectedCourse}
            </h1>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/50">
              {courseFiles.length} Files
              <span className="mx-2 text-paper/25">/</span>
              {availableCount} Available
            </p>
          </div>

          <div className="flex gap-2">
            <div className="border border-paper/20 px-4 py-2.5 text-center">
              <p className="font-mono text-xl leading-none text-paper">
                {courseFiles.length}
              </p>
              <p className="mt-1.5 font-body text-[9px] text-paper/45">ملف</p>
            </div>
            <div className="border border-signal px-4 py-2.5 text-center">
              <p className="font-mono text-xl leading-none text-signal">
                {availableCount}
              </p>
              <p className="mt-1.5 font-body text-[9px] text-paper/45">متاح</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بعنوان الملف..."
            aria-label="ابحث بعنوان الملف"
            className="w-full border border-ink/25 bg-paper py-3 pe-3 ps-10 font-body text-sm text-ink placeholder:text-stone/60 focus:border-signal focus:outline-none"
          />
        </label>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="فلتر بنوع الملف"
          className="border border-ink/25 bg-paper px-3 py-3 font-body text-sm text-ink focus:border-signal focus:outline-none"
        >
          <option value="all">كل الأنواع</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {filteredFiles.length === 0 ? (
        <EmptyState
          title="مفيش ملفات مطابقة"
          subtitle={
            courseFiles.length === 0
              ? 'المادة دي مفيهاش ملفات متاحة حالياً.'
              : 'جرّب تغيّر البحث أو فلتر النوع.'
          }
          icon={FolderIcon}
        />
      ) : (
        <div className="mt-5 space-y-3">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </>
  );
}

function FileCard({ file }) {
  const [viewing, setViewing] = useState(false);
  const unavailable = !file.localFile;

  return (
    <>
      <article className="group relative border border-ink/15 bg-white/50 p-4 transition hover:border-ink/40 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-10 w-10 shrink-0 place-items-center border border-ink/15 bg-paper text-ink/60">
            <ExamIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-ink/20 px-2 py-0.5 text-[9px] font-semibold text-stone">
                {file.type || 'ملف'}
              </span>

              {file.removedFromSite && (
                <span className="border border-signal px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-signal">
                  Removed
                </span>
              )}
            </div>

            <h3 className="mt-2 font-heading text-base font-bold leading-7 text-ink">
              {file.title}
            </h3>
            <p className="mt-0.5 font-body text-xs leading-6 text-stone">
              {file.instructor || 'المحاضر غير محدد'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.08em] text-stone">
              <span>From {formatDate(file.start)}</span>
              <span className="text-ink/20">/</span>
              <span>{formatSize(file.size)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:pt-1">
            {unavailable ? (
              <span className="flex w-full items-center justify-center border border-dashed border-stone/40 px-4 py-2.5 text-[10px] font-bold text-stone sm:w-auto">
                غير متاح
              </span>
            ) : (
              <>
                {canPreview(file) && (
                  <button
                    type="button"
                    onClick={() => setViewing(true)}
                    className="flex w-full items-center justify-center gap-2 border border-ink px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-ink hover:text-paper sm:w-auto"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    عرض
                  </button>
                )}

                <a
                  href={getFileUrl(file, 'download')}
                  download={file.localFile || `${file.title || 'ملف'}.pdf`}
                  className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-2.5 text-xs font-bold text-paper transition hover:bg-[#2b2b2b] sm:w-auto"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  تنزيل
                  <Triangle corner="bl" className="bottom-0 left-0 h-1.5 w-1.5" />
                </a>
              </>
            )}
          </div>
        </div>
      </article>

      {viewing && <FileViewer file={file} onClose={() => setViewing(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Homework / exams                                                    */
/* ------------------------------------------------------------------ */

function RemindersPage({ kind, items, now }) {
  const isHomework = kind === 'homework';
  const completeKey = isHomework ? 'submitted' : 'done';

  const active = items.filter((item) => itemIsActive(item, now));
  const required = sortByEndSoonest(
    active.filter((item) => !item[completeKey])
  );
  const completed = [...active.filter((item) => item[completeKey])].sort(
    (a, b) => {
      const timeA = a.end ? new Date(a.end).getTime() : 0;
      const timeB = b.end ? new Date(b.end).getTime() : 0;
      return timeB - timeA;
    }
  );

  const title = isHomework ? 'التكليفات' : 'الاختبارات';
  const subtitle = isHomework
    ? 'المطلوب تسليمه ومواعيده. الموقع للتذكير فقط — التسليم من المنصة الرسمية.'
    : 'الاختبارات المتاحة ومواعيد انتهائها. الموقع لا يفتح الاختبار أو يحاول حلّه.';

  return (
    <>
      <PageHeading
        index={isHomework ? '02' : '03'}
        en={isHomework ? 'Assignments' : 'Exams'}
        title={title}
        subtitle={subtitle}
        aside={
          <div className="flex gap-2">
            <StatBlock value={required.length} label="مطلوب" accent />
            <StatBlock value={completed.length} label="مكتمل" />
          </div>
        }
      />

      {required.length === 0 ? (
        <EmptyState
          title={
            isHomework
              ? 'مفيش تكليفات مطلوبة دلوقتي'
              : 'مفيش اختبارات مطلوبة دلوقتي'
          }
          subtitle="أي حاجة جديدة هتظهر هنا أول ما المنصة تنزلها."
          icon={CheckCircleIcon}
          tone="done"
        />
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {required.map((item) => (
            <ReminderCard
              key={item.id}
              item={item}
              kind={kind}
              now={now}
              completed={false}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-3 border-b border-ink/15 pb-2">
            <CheckCircleIcon className="h-4 w-4 text-stone" />
            <h2 className="font-mono text-[9px] uppercase tracking-[0.26em] text-stone">
              {isHomework ? 'Completed' : 'Solved'} / {completed.length}
            </h2>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {completed.map((item) => (
              <ReminderCard
                key={item.id}
                item={item}
                kind={kind}
                now={now}
                completed
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ReminderCard({ item, kind, now, completed }) {
  const isHomework = kind === 'homework';
  const urgency = urgencyOf(item, now, completed);
  const meta = URGENCY_STYLES[urgency];
  const remaining = completed ? null : remainingParts(item.end, now);

  return (
    <article
      className={classNames(
        'relative overflow-hidden border p-5',
        meta.card
      )}
    >
      <span className={classNames('absolute inset-y-0 right-0 w-[3px]', meta.bar)} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-ink/20 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-stone">
              {isHomework ? 'Assignment' : 'Exam'}
            </span>

            {!completed && isHomework && item.openNow && (
              <span className="border border-signal px-2 py-0.5 text-[9px] font-bold text-signal">
                متاح للتسليم الآن
              </span>
            )}

            {completed && (
              <span className="border border-stone/40 px-2 py-0.5 text-[9px] font-bold text-stone">
                {isHomework ? 'تم التسليم' : 'تم الحل'}
              </span>
            )}
          </div>

          <h3 className="mt-3 font-heading text-lg font-bold leading-8 text-ink">
            {item.title}
          </h3>
          <p className="mt-1 font-body text-xs leading-6 text-stone">
            {item.course}
            {item.instructor ? (
              <>
                <span className="mx-1.5 text-ink/20">/</span>
                {item.instructor}
              </>
            ) : null}
          </p>
        </div>

        {!completed && (
          <span
            className={classNames(
              'shrink-0 border px-2.5 py-1 text-[10px] font-semibold',
              meta.badge
            )}
          >
            {remaining ? remainingLabel(remaining) : 'بدون موعد محدد'}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
        {isHomework && item.start && (
          <InfoTile label="يبدأ" value={formatDateTime(item.start)} />
        )}

        <InfoTile
          label={isHomework ? 'ينتهي' : 'متاح حتى'}
          value={item.end ? formatDateTime(item.end) : 'غير محدد'}
          accent={!completed && Boolean(item.end)}
        />

        {completed && isHomework && item.submittedAt && (
          <InfoTile label="تم التسليم في" value={formatDateTime(item.submittedAt)} />
        )}

        {completed && isHomework && item.grade && (
          <InfoTile label="الدرجة" value={item.grade} />
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Shared UI                                                           */
/* ------------------------------------------------------------------ */

function PageHeading({ index, en, title, subtitle, aside }) {
  return (
    <header className="border-b border-ink/15 pb-6">
      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-stone">
        <span className="text-signal">{index}</span>
        <span className="h-px w-8 bg-ink/25" />
        <span>{en}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-ink sm:text-4xl lg:text-[42px]">
            {title}
          </h1>
          <p className="mt-2 max-w-xl font-body text-sm leading-7 text-stone">
            {subtitle}
          </p>
        </div>
        {aside}
      </div>
    </header>
  );
}

function StatBlock({ label, value, accent = false }) {
  return (
    <div
      className={classNames(
        'min-w-[68px] border px-3 py-2 text-center',
        accent ? 'border-signal' : 'border-ink/20'
      )}
    >
      <p
        className={classNames(
          'font-mono text-xl leading-none',
          accent ? 'text-signal' : 'text-ink'
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 font-body text-[9px] leading-none text-stone">{label}</p>
    </div>
  );
}

function InfoTile({ label, value, accent = false }) {
  return (
    <div className="bg-paper px-3.5 py-3">
      <p className="font-body text-[9px] leading-none text-stone">{label}</p>
      <p
        className={classNames(
          'mt-1.5 text-[12px] font-semibold leading-5',
          accent ? 'text-signal' : 'text-ink'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, subtitle, icon: Icon = CheckCircleIcon, tone }) {
  return (
    <div
      className={classNames(
        'mt-7 border px-6 py-14 text-center',
        tone === 'done'
          ? 'border-stone/25 bg-stone/[0.03]'
          : 'border-dashed border-ink/25 bg-paper'
      )}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center border border-ink/20 text-ink/60">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-heading text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md font-body text-sm leading-7 text-stone">
        {subtitle}
      </p>
    </div>
  );
}

function NotesPanel({ errors }) {
  return (
    <details className="group mb-6 border border-ink/20 border-r-2 border-r-signal bg-paper p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-ink">
        <AlertIcon className="h-4 w-4 shrink-0 text-signal" />
        ملاحظات آخر مزامنة
        <span className="font-mono text-[9px] text-signal">({errors.length})</span>
        <span className="ms-auto font-mono text-[8px] uppercase tracking-[0.2em] text-stone group-open:hidden">
          Open
        </span>
      </summary>
      <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-auto border-t border-ink/10 pe-5 pt-3 font-body text-[11px] leading-6 text-stone">
        {errors.slice(0, 30).map((error, index) => (
          <li key={`${index}-${error.slice(0, 20)}`}>{error}</li>
        ))}
      </ul>
    </details>
  );
}

function SplashLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="flex flex-col items-center gap-5">
        <LogoMark className="h-12 w-12 animate-pulse text-ink" />
        <p className="font-mono text-[9px] uppercase tracking-[0.36em] text-stone">
          Loading
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry, syncing }) {
  return (
    <div className="relative mt-7 overflow-hidden border border-signal px-6 py-14 text-center">
      <Triangle corner="tr" className="right-0 top-0 h-10 w-10" />
      <div className="mx-auto grid h-12 w-12 place-items-center border border-signal text-signal">
        <CloudOffIcon className="h-6 w-6" />
      </div>
      <h1 className="mt-4 font-heading text-xl font-bold text-ink">
        مش قادر أوصل للبيانات
      </h1>
      <p className="mx-auto mt-1 max-w-md font-body text-sm leading-7 text-stone">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={syncing}
        className="mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-[#2b2b2b] disabled:opacity-60"
      >
        <RefreshIcon
          className={classNames('h-4 w-4', syncing && 'animate-spin')}
        />
        {syncing ? 'جاري أول مزامنة...' : 'حاول تاني'}
      </button>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-stone">
        Server · node server.mjs
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login & settings                                                    */
/* ------------------------------------------------------------------ */

function LoginScreen({ onSubmit, serverError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(serverError || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (serverError) setError(serverError);
  }, [serverError]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('اكتب اسم المستخدم وكلمة المرور.');
      return;
    }

    setError('');
    setBusy(true);

    const result = await onSubmit({ username: cleanUsername, password });
    if (!result?.ok) {
      setError(result?.error || 'تعذر تسجيل الدخول.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden bg-ink px-6 py-9 text-paper sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <Triangle corner="tr" className="right-0 top-0 h-24 w-24 sm:h-32 sm:w-32" />
        <LogoMark className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 text-paper/[0.045]" />

        <div className="relative">
          <Brand tone="light" />
        </div>

        <div className="relative mt-12 lg:mt-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-paper/40">
            Study archive / DTU
          </p>
          <h1 className="main-name mt-4 font-display text-6xl italic leading-[0.95] tracking-tight text-paper sm:text-7xl lg:text-8xl">
            Muqarar
          </h1>
          <p className="mt-3 font-heading text-lg font-bold text-signal">
            مُقرَّر
          </p>
          <p className="mt-5 max-w-sm font-body text-sm leading-7 text-paper/60">
            كل مقرراتك، تكليفاتك، واختباراتك في مكان واحد — منظم وواضح، ومن غير
            ما تدوّر في المنصة كل مرة.
          </p>
        </div>

        <div className="relative mt-12 flex items-center justify-between gap-4 border-t border-paper/15 pt-4 lg:mt-0">
          <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-paper/30">
            Est. 2026
          </span>
          <span className="text-end font-mono text-[8px] uppercase tracking-[0.2em] text-paper/30">
            Delta University of Technology
          </span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone">
            <span className="text-signal">01</span>
            <span className="mx-2 text-ink/20">/</span>
            Sign in
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-ink">
            بيانات تسجيل الدخول
          </h2>
          <p className="mt-2 font-body text-sm leading-7 text-stone">
            ادخل ببيانات حسابك على منصة DTU عشان نجيب ملفاتك وتنبيهاتك.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-stone">
                <span>01 / Username</span>
                <span className="font-body text-[10px] tracking-normal text-stone">
                  اسم المستخدم
                </span>
              </span>
              <div className="relative mt-2">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  dir="ltr"
                  placeholder="student@example.com"
                  className="w-full border border-ink/25 bg-transparent py-3 pe-3 ps-10 font-body text-sm text-ink placeholder:text-stone/50 focus:border-signal focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-stone">
                <span>02 / Password</span>
                <span className="font-body text-[10px] tracking-normal text-stone">
                  كلمة المرور
                </span>
              </span>
              <div className="relative mt-2">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  className="w-full border border-ink/25 bg-transparent py-3 pe-11 ps-10 font-body text-sm text-ink placeholder:text-stone/50 focus:border-signal focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-stone transition hover:bg-ink/5 hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="border-r-2 border-signal bg-signal/[0.05] px-3 py-2 font-body text-xs font-semibold leading-6 text-signal">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="relative flex w-full items-center justify-between bg-ink px-4 py-3.5 text-paper transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {busy && <RefreshIcon className="h-4 w-4 animate-spin" />}
                <span className="font-heading text-sm font-bold">
                  {busy ? 'بنسجّل الدخول...' : 'دخول'}
                </span>
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-paper/45">
                {busy ? 'Please wait' : 'Enter'}
              </span>
              <Triangle corner="bl" className="bottom-0 left-0 h-2 w-2" />
            </button>

            <p className="border-t border-ink/10 pt-4 font-body text-[11px] leading-6 text-stone">
              بياناتك بتتستخدم في المزامنة بس، وبتفضل في ذاكرة السيرفر — مفيش
              كلمة مرور بتتحفظ على الديسك. الموقع للتذكير فقط: مش بيسلّم واجبات
              ولا بيفتح اختبارات.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

function SettingsModal({ username, onClose, onLogin, onLogout }) {
  const [formUsername, setFormUsername] = useState(username);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const cleanUsername = formUsername.trim();
    if (!cleanUsername || !password) {
      setError('اكتب اسم المستخدم وكلمة المرور.');
      return;
    }

    setError('');
    setBusy(true);

    const result = await onLogin({ username: cleanUsername, password });
    if (!result?.ok) {
      setError(result?.error || 'تعذر حفظ بيانات الدخول.');
      setBusy(false);
    }
  }

  function handleLogout() {
    if (busy) return;
    if (window.confirm('متأكد إنك عايز تسجّل الخروج؟')) {
      onLogout();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="الإعدادات"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-auto border border-paper/20 bg-paper text-ink shadow-2xl">
        <header className="relative flex items-center justify-between bg-ink px-5 py-4 text-paper">
          <Triangle corner="tr" className="right-0 top-0 h-8 w-8" />
          <div className="relative">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-paper/40">
              Settings / 01
            </p>
            <h2 className="mt-1 font-heading text-lg font-bold">الإعدادات</h2>
            <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.16em] text-paper/45">
              {username || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق الإعدادات"
            className="relative grid h-8 w-8 place-items-center border border-paper/20 text-paper/70 transition hover:bg-paper/10 hover:text-paper disabled:opacity-50"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5">
          <p className="border-r-2 border-ink/20 pe-0 ps-0 font-body text-[11px] leading-6 text-stone">
            غيّر بيانات الدخول لأي حساب تاني على منصة DTU. بعد الحفظ هنسجّل
            الدخول من جديد ونعمل مزامنة لبيانات الحساب ده.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone">
                01 / Username
              </span>
              <input
                type="text"
                value={formUsername}
                onChange={(event) => setFormUsername(event.target.value)}
                autoComplete="username"
                dir="ltr"
                className="mt-2 w-full border border-ink/25 bg-transparent px-3 py-2.5 font-body text-sm text-ink focus:border-signal focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone">
                02 / Password
              </span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="اكتب كلمة المرور من جديد"
                  className="w-full border border-ink/25 bg-transparent py-2.5 pe-11 ps-3 font-body text-sm text-ink placeholder:text-stone/50 focus:border-signal focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-stone transition hover:bg-ink/5 hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="border-r-2 border-signal bg-signal/[0.05] px-3 py-2 font-body text-xs font-semibold leading-6 text-signal">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-bold text-paper transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <RefreshIcon className="h-4 w-4 animate-spin" />}
              {busy ? 'بنتحقق من البيانات...' : 'حفظ وتسجيل الدخول'}
            </button>
          </form>

          <p className="mt-4 border border-ink/15 bg-white/40 p-3 font-body text-[10px] leading-6 text-stone">
            كلمة المرور مش بتتحفظ على الديسك؛ بتفضل في ذاكرة السيرفر لحد ما
            تقفله أو تسجّل الخروج.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-signal px-4 py-2.5 text-sm font-bold text-signal transition hover:bg-signal hover:text-paper disabled:opacity-50"
          >
            <LogoutIcon className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* File viewer                                                         */
/* ------------------------------------------------------------------ */

function FileViewer({ file, onClose }) {
  const viewUrl = getFileUrl(file, 'view');
  const downloadUrl = getFileUrl(file, 'download');

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/85 p-2 backdrop-blur sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`معاينة ${file.title}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden border border-paper/15 bg-paper">
        <header className="flex items-center gap-3 bg-ink px-3 py-3 text-paper sm:px-4">
          <LogoMark className="hidden h-5 w-5 text-paper/50 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-paper/40">
              Preview / File
            </p>
            <h2 className="truncate font-heading text-sm font-bold text-paper">
              {file.title}
            </h2>
          </div>
          <a
            href={downloadUrl}
            className="hidden items-center border border-paper/20 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-paper/75 transition hover:bg-paper/10 hover:text-paper sm:flex"
          >
            Download
          </a>
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center border border-paper/20 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-paper/75 transition hover:bg-paper/10 hover:text-paper md:flex"
          >
            New tab
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="grid h-8 w-8 shrink-0 place-items-center border border-paper/20 text-paper/75 transition hover:bg-paper/10 hover:text-paper"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <iframe
          title={file.title}
          src={viewUrl}
          className="min-h-0 w-full flex-1 bg-white"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sync Progress Bar & First run                                       */
/* ------------------------------------------------------------------ */

function SyncProgressBar({ progress, syncing }) {
  if (!syncing && !progress) return null;

  const percent = Math.min(100, Math.max(5, progress?.percent || (syncing ? 20 : 0)));
  const message =
    progress?.message ||
    (syncing ? 'جاري الاتصال بمنصة DTU ومزامنة الملفات والتكليفات...' : 'تمت المزامنة');

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-signal/25 bg-signal/[0.04] p-4 text-ink shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-signal text-paper">
            <RefreshIcon className={classNames('h-4 w-4', syncing && 'animate-spin')} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-xs font-bold text-ink sm:text-sm">
              {message}
            </p>
            {progress?.total > 0 && (
              <p className="mt-0.5 font-mono text-[11px] text-stone">
                تمت معالجة {progress.current} من {progress.total} عنصر ({percent}%)
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-60">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-signal transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-signal">
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}

function FirstSyncState({ syncing, onSync, progress }) {
  const percent = Math.min(100, Math.max(5, progress?.percent || (syncing ? 20 : 0)));

  return (
    <div className="relative mt-7 overflow-hidden border border-ink/20 px-6 py-14 text-center sm:px-12">
      <Triangle corner="tr" className="right-0 top-0 h-12 w-12" />
      <LogoMark
        className={classNames(
          'mx-auto h-14 w-14 text-ink',
          syncing && 'animate-pulse'
        )}
      />
      <h1 className="mt-6 font-heading text-2xl font-extrabold text-ink">
        {syncing ? 'جاري تجهيز وتنزيل مقرراتك...' : 'لسه مفيش بيانات'}
      </h1>
      <p className="mx-auto mt-2 max-w-md font-body text-sm leading-7 text-stone">
        {syncing
          ? (progress?.message || 'بنسجّل الدخول للمنصة وبننزّل ملفات المواد والتكليفات والاختبارات. أول مرة ممكن تاخد شوية دقايق.')
          : 'اضغط تحديث دلوقتي عشان نبدأ المزامنة مع منصة DTU.'}
      </p>

      {syncing && (
        <div className="mx-auto mt-6 max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-stone">
            <span>{progress?.phase === 'download' ? 'تنزيل المحاضرات والـ PDFs' : 'فحص المقررات'}</span>
            <span className="font-mono text-signal">{percent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-signal transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          {progress?.total > 0 && (
            <p className="mt-2 font-mono text-[11px] text-stone">
              تم {progress.current} من {progress.total} عنصر
            </p>
          )}
        </div>
      )}

      {!syncing && (
        <button
          type="button"
          onClick={onSync}
          className="mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-[#2b2b2b]"
        >
          <RefreshIcon className="h-4 w-4" />
          ابدأ المزامنة
        </button>
      )}
    </div>
  );
}
