import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, CheckCircle2, KeyRound, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import { APP_NAME, ROLE_HOME_PATHS } from '@/app/constants';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRole } from '@/types/domain';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Enter a 10-digit mobile number')
    .regex(/^[+\d\s-]{10,16}$/, 'Enter digits in valid Indian mobile format'),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});

const onboardingSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  role: z.enum(['farmer', 'transporter', 'business', 'fpo', 'kiosk', 'ops']),
  villageId: z.string().min(1),
  organisationName: z.string().optional(),
});

export function LoginPage() {
  const navigate = useNavigate();
  const nodes = useAppStore((s) => s.nodes);
  const accounts = useAppStore((s) => s.accounts);
  const loginWithPhone = useAppStore((s) => s.loginWithPhone);
  const registerNewAccount = useAppStore((s) => s.registerNewAccount);

  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('+91 90001 10001');
  const [otp, setOtp] = useState('482910');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [villageId, setVillageId] = useState('v_vemgal');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const villages = nodes.filter((n) => n.kind === 'village');

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse({ phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid phone number');
      return;
    }
    setError(null);
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a 6-digit OTP');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await loginWithPhone(phone);
    setBusy(false);
    if (res.found && res.account) {
      navigate(ROLE_HOME_PATHS[res.account.role]);
    } else {
      setStep('register');
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = onboardingSchema.safeParse({
      name,
      role,
      villageId,
      organisationName: orgName || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details');
      return;
    }
    setError(null);
    setBusy(true);
    const created = await registerNewAccount({
      name,
      phone,
      role,
      villageId,
      organisationName: orgName || undefined,
    });
    setBusy(false);
    navigate(ROLE_HOME_PATHS[created.role]);
  };

  const quickDirectory = (['farmer', 'transporter', 'business', 'fpo', 'kiosk', 'ops'] as UserRole[]).map(
    (r) => accounts.find((a) => a.role === r)!,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8 md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Mobile Access
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-ink">
            {step === 'phone'
              ? `Sign in to ${APP_NAME}`
              : step === 'otp'
                ? 'Enter 6-Digit Verification Code'
                : 'Complete Role Onboarding'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {step === 'phone'
              ? 'Use your registered mobile number, or enter any new 10-digit number to open a fresh account.'
              : step === 'otp'
                ? `Code sent to ${phone}. Enter your 6-digit code to continue.`
                : 'Set up your village and role so corridors and pooling prices match your needs.'}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-coral bg-coral-100 px-3.5 py-2.5 text-xs font-semibold text-ink">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
              <div>
                <label htmlFor="phone-input" className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Mobile Number
                </label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" />
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="min-h-[46px] w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 text-sm font-semibold text-ink focus:bg-surface"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-soft hover:bg-primary-strong"
              >
                <span>Send Verification OTP</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label htmlFor="otp-input" className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
                  6-Digit Code
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" />
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="min-h-[48px] w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 font-heading text-lg font-bold tracking-[0.35em] text-ink focus:bg-surface"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="min-h-[46px] rounded-xl border border-border px-4 text-xs font-semibold text-ink-muted hover:bg-surface-2"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-strong"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{busy ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleCompleteRegistration} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-bold uppercase text-ink-muted">
                  Your Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-medium text-ink"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-role" className="block text-xs font-bold uppercase text-ink-muted">
                    Primary Role
                  </label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-ink"
                  >
                    <option value="farmer">Farmer / Grower</option>
                    <option value="transporter">Tempo / Tractor Owner</option>
                    <option value="business">Input Dealer / Mandi Trader</option>
                    <option value="fpo">FPO Coordinator</option>
                    <option value="kiosk">Freight Sakhi Kiosk</option>
                    <option value="ops">Operations Staff</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-village" className="block text-xs font-bold uppercase text-ink-muted">
                    Home Village / Town
                  </label>
                  <select
                    id="reg-village"
                    value={villageId}
                    onChange={(e) => setVillageId(e.target.value)}
                    className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-ink"
                  >
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.taluka})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(role === 'business' || role === 'fpo') && (
                <div>
                  <label htmlFor="reg-org" className="block text-xs font-bold uppercase text-ink-muted">
                    Enterprise or FPO Name
                  </label>
                  <input
                    id="reg-org"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-medium text-ink"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-strong"
              >
                <UserPlus className="h-4 w-4" />
                <span>{busy ? 'Creating Account...' : 'Create Account & Enter Network'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick Role Directory */}
        <div className="rounded-3xl border border-border bg-surface-2/70 p-6 md:col-span-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink">
            Active Network Accounts
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Tap any registered Kolar stakeholder below to pre-fill their number, or enter a new number to register.
          </p>
          <div className="mt-4 space-y-2">
            {quickDirectory.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setPhone(acc.phone);
                  setStep('otp');
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-3 text-left transition-all hover:border-primary hover:shadow-soft"
              >
                <div>
                  <div className="text-xs font-bold text-ink">{acc.name}</div>
                  <div className="text-[11px] text-ink-muted">{acc.phone}</div>
                </div>
                <span className="rounded-lg bg-primary-100 px-2.5 py-1 text-[10px] font-bold uppercase text-primary-strong">
                  {acc.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
