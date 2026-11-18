import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Bell,
  Building2,
  CheckCheck,
  ChevronDown,
  EyeOff,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Users,
  UserCheck,
} from 'lucide-react';
import { APP_NAME, ROLE_HOME_PATHS, SUPPORTED_LANGUAGES, type LanguageCode } from '@/app/constants';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRole } from '@/types/domain';

interface NavTab {
  to: string;
  label: string;
}

const WORKSPACE_TABS: Record<UserRole, NavTab[]> = {
  farmer: [
    { to: '/farmer/book', label: 'Voice Booking & Spoilage' },
    { to: '/farmer/pool', label: 'Pool & Shapley Receipt' },
    { to: '/farmer/track', label: 'Pay, Track & Confirm' },
    { to: '/farmer/messages', label: 'Driver Chat & Alerts' },
  ],
  transporter: [
    { to: '/transporter/offers', label: 'Load Offers & Heatmap' },
    { to: '/transporter/tour', label: 'Tour Planner & Checklist' },
    { to: '/transporter/corridor', label: 'Return-Leg Bot' },
    { to: '/transporter/shadow', label: 'Shadow Earnings Proof' },
    { to: '/transporter/wallet', label: 'Wallet & Credit Passport' },
    { to: '/transporter/onboard', label: '1-Min Onboarding' },
  ],
  business: [
    { to: '/business/corridors', label: 'Pre-Book Return Capacity' },
    { to: '/business/orders', label: 'Standing Orders & CSV' },
    { to: '/business/invoices', label: 'Invoices & Analytics' },
  ],
  fpo: [
    { to: '/fpo/members', label: 'Members & Group Booking' },
    { to: '/fpo/pools', label: 'Collective Pools & Vote' },
    { to: '/fpo/broadcast', label: 'Multilingual Broadcasts' },
  ],
  kiosk: [
    { to: '/kiosk/desk', label: 'Freight Sakhi Walk-In Desk' },
  ],
  ops: [
    { to: '/ops/map', label: 'Live Map & Event Triggers' },
    { to: '/ops/pools', label: 'Pool Inspector & SHA-256' },
    { to: '/ops/healing', label: 'Self-Healing Diffs' },
    { to: '/ops/benchmarks', label: 'Solver & Benchmark Lab' },
    { to: '/ops/twin', label: 'Taluka Digital Twin' },
    { to: '/ops/taluka', label: 'Synthetic Taluka' },
    { to: '/ops/disputes', label: 'Disputes & Weighbridge' },
    { to: '/ops/ledger', label: 'Escrow Ledger & Onboarding' },
    { to: '/ops/analytics', label: 'Reports & Settings' },
  ],
};

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
        <rect width="36" height="36" rx="11" fill="#3FA374" />
        <path d="M7 24 C12 18, 22 18, 29 24" stroke="#FFF1CF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="9" y="13" width="12" height="8" rx="2.5" fill="#FFFFFF" />
        <rect x="21" y="15" width="6" height="6" rx="2" fill="#F6B93B" />
        <circle cx="13" cy="22.5" r="2.3" fill="#1E2B25" />
        <circle cx="24" cy="22.5" r="2.3" fill="#1E2B25" />
        <path d="M14 8 C17 6, 20 8, 19 11 C16 11, 14 10, 14 8 Z" fill="#DDF1E6" />
      </svg>
      <div>
        <span className="font-heading text-lg font-extrabold tracking-tight text-ink">{APP_NAME}</span>
        <span className="hidden text-[11px] font-medium text-ink-muted sm:block leading-none">
          Rural Freight Pooling
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const accounts = useAppStore((s) => s.accounts);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);
  const notifications = useAppStore((s) => s.notifications);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const switchAccount = useAppStore((s) => s.switchAccount);
  const logout = useAppStore((s) => s.logout);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const currentAccount = accounts.find((a) => a.id === currentAccountId) ?? null;

  const activeWorkspace: UserRole | null = location.pathname.startsWith('/farmer')
    ? 'farmer'
    : location.pathname.startsWith('/transporter')
      ? 'transporter'
      : location.pathname.startsWith('/business')
        ? 'business'
        : location.pathname.startsWith('/fpo')
          ? 'fpo'
          : location.pathname.startsWith('/kiosk')
            ? 'kiosk'
            : location.pathname.startsWith('/ops')
              ? 'ops'
              : null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Pick 2 representative accounts per role for quick Switch Account menu
  const switchableAccounts = (['farmer', 'transporter', 'business', 'fpo', 'kiosk', 'ops'] as UserRole[]).flatMap(
    (role) => accounts.filter((a) => a.role === role).slice(0, 2),
  );

  const rolePills: { role: UserRole; label: string; icon: typeof Sprout }[] = [
    { role: 'farmer', label: 'Farmer', icon: Sprout },
    { role: 'transporter', label: 'Transporter', icon: Truck },
    { role: 'business', label: 'Business', icon: Building2 },
    { role: 'fpo', label: 'FPO', icon: Users },
    { role: 'kiosk', label: 'Sakhi Kiosk', icon: Store },
    { role: 'ops', label: 'Ops Tower', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="rounded-xl focus-visible:outline-2">
              <BrandMark />
            </Link>

            {/* Role Workspace Switcher */}
            <nav aria-label="Role workspaces" className="hidden xl:flex items-center gap-1 rounded-2xl bg-surface-2 p-1">
              {rolePills.map(({ role, label, icon: Icon }) => {
                const isActive = activeWorkspace === role;
                return (
                  <Link
                    key={role}
                    to={ROLE_HOME_PATHS[role]}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-ink-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher (available on every screen) */}
            <div className="flex items-center rounded-xl border border-border bg-surface-2 p-0.5" role="group" aria-label="Language selector">
              <Globe className="ml-2 mr-1 hidden h-3.5 w-3.5 text-ink-muted sm:block" />
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code as LanguageCode)}
                  className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                    language === lang.code
                      ? 'bg-surface text-primary-strong shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {lang.nativeLabel}
                </button>
              ))}
            </div>

            {/* Reduce Motion Toggle */}
            <button
              type="button"
              onClick={() => setReduceMotion(!reduceMotion)}
              aria-pressed={reduceMotion}
              title={t('nav.reduceMotion')}
              className={`hidden sm:inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                reduceMotion
                  ? 'border-primary bg-primary-100 text-primary-strong'
                  : 'border-border bg-surface text-ink-muted hover:bg-surface-2'
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{reduceMotion ? 'Calm motion' : 'Motion on'}</span>
            </button>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setAccountMenuOpen(false);
                }}
                aria-label={t('nav.notifications')}
                className="relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-border bg-surface text-ink hover:bg-surface-2"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-3 shadow-elevated z-50">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Live Network Updates
                    </span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.linkPath) navigate(n.linkPath);
                        }}
                        className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                          n.read ? 'border-border bg-bg' : 'border-primary/40 bg-primary-100/40'
                        } hover:bg-surface-2`}
                      >
                        <div className="text-xs font-bold text-ink">{n.title}</div>
                        <div className="mt-0.5 text-[11px] text-ink-muted leading-relaxed">{n.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account & Switch Account Menu */}
            <div className="relative">
              {currentAccount ? (
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-100 text-[11px] font-bold text-primary-strong">
                    {currentAccount.avatarInitials}
                  </span>
                  <span className="hidden sm:inline max-w-[110px] truncate">{currentAccount.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-strong"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{t('nav.signIn')}</span>
                </Link>
              )}

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-[min(92vw,320px)] rounded-2xl border border-border bg-surface p-3 shadow-elevated z-50">
                  {currentAccount && (
                    <div className="mb-2.5 rounded-xl bg-surface-2 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-ink">{currentAccount.name}</span>
                        <span className="rounded-md bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-strong">
                          {currentAccount.role}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted">{currentAccount.phone}</div>
                    </div>
                  )}

                  <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    <span>{t('nav.switchAccount')}</span>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                    {switchableAccounts.map((acc) => {
                      const isCurrent = acc.id === currentAccountId;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            switchAccount(acc.id);
                            setAccountMenuOpen(false);
                            navigate(ROLE_HOME_PATHS[acc.role]);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-primary-100 font-bold text-primary-strong'
                              : 'hover:bg-surface-2 text-ink'
                          }`}
                        >
                          <div>
                            <div>{acc.name}</div>
                            <div className="text-[10px] text-ink-muted">
                              {acc.organisationName ?? acc.phone}
                            </div>
                          </div>
                          <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                            {acc.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
                    <Link
                      to="/login"
                      onClick={() => setAccountMenuOpen(false)}
                      className="text-xs font-semibold text-primary-strong hover:underline"
                    >
                      OTP Sign-in / New Phone
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAccountMenuOpen(false);
                        navigate('/login');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-coral hover:underline"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Role Strip */}
        <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto border-t border-border/60 bg-surface-2/60 px-3 py-1.5">
          {rolePills.map(({ role, label, icon: Icon }) => {
            const isActive = activeWorkspace === role;
            return (
              <Link
                key={role}
                to={ROLE_HOME_PATHS[role]}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ${
                  isActive ? 'bg-primary text-white' : 'bg-surface text-ink-muted border border-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Workspace Deep-Link Sub-Navigation */}
        {activeWorkspace && (
          <div className="border-t border-border bg-surface">
            <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-3 py-2 sm:px-6">
              <span className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-strong">
                <Activity className="h-3 w-3" />
                {activeWorkspace}
              </span>
              {WORKSPACE_TABS[activeWorkspace].map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `min-h-[38px] shrink-0 inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-ink text-white shadow-soft'
                        : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-border bg-surface py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-ink-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              <strong>{APP_NAME}</strong> • Kolar–Bengaluru Rural Freight Network • Transparent Shapley Receipts & Escrow Protection
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Kolar, Srinivaspur, Mulbagal, Malur & Bengaluru Mandis
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
