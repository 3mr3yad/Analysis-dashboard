import { useEffect, useState, type FormEvent } from "react";
import { HoleBackground } from "@/components/animate-ui/components/backgrounds/hole";
import { ApiError } from "../services/api/httpClient";
import { login } from "../state/auth";
import { useMotionPref } from "../state/prefs";
import Icon from "../ui/Icon";
import { Logo } from "../ui/Logo";
import { cx } from "../ui/tone";

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function Login() {
  const effects = useMotionPref();
  const still = effects === "off" || (effects === "auto" && prefersReducedMotion());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Login is limited to 10 attempts/minute per IP: after a 429 the button waits out Retry-After.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setCooldown(err.retryAfter ?? 60);
      setError(err instanceof ApiError ? (err.fields.email?.[0] ?? err.fields.password?.[0] ?? err.message) : "حدث خطأ غير متوقع. حاول مرة أخرى.");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-line bg-white/[0.03] px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-accent/50 focus:bg-white/[0.05] focus:outline-none";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black">
      <HoleBackground className="absolute inset-0" strokeColor="#4a5368" still={still} />

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 flex flex-col items-center gap-2 text-center">
            <Logo height={34} className="text-ink" />
            <p className="text-[13.5px] tracking-wide text-ink-3">مركز القيادة التنفيذي</p>
          </div>

          <form onSubmit={submit} noValidate className="glass rounded-2xl border border-line-strong p-6 shadow-2xl sm:p-7">
            <h1 className="text-[20px] font-semibold text-ink">تسجيل الدخول</h1>
            <p className="mt-1 text-[14px] text-ink-3">ادخل بحساب لوحة المالك للوصول إلى البيانات.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13.5px] text-ink-2">البريد الإلكتروني</span>
                <input
                  type="email"
                  autoComplete="username"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={cx(field, "text-left")}
                  aria-invalid={!!error}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13.5px] text-ink-2">كلمة المرور</span>
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cx(field, "pl-11 text-left")}
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[12.5px] text-ink-3 hover:text-ink"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-2 select-none">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
                تذكرني على هذا الجهاز
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2.5 text-[14px] text-critical">
                <Icon name="alert" size={15} className="mt-px shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || cooldown > 0}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-[15px] font-semibold text-[#0b1020] transition-colors hover:bg-accent-strong disabled:opacity-60"
            >
              {busy && <span className="size-4 animate-spin rounded-full border-2 border-[#0b1020]/30 border-t-[#0b1020]" aria-hidden />}
              {busy ? "جارٍ التحقق…" : cooldown > 0 ? `حاول بعد ${cooldown} ث` : "دخول"}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-ink-3">الوصول للاطلاع والمتابعة فقط · عالم وافي</p>
        </div>
      </main>
    </div>
  );
}
