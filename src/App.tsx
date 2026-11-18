import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { APP_NAME } from '@/app/constants';
import { AppShell } from '@/components/layout/AppShell';
import { BrandedRoadLoader, FeedbackLayer } from '@/components/ui/FeedbackLayer';
import '@/i18n';
import { useAppStore } from '@/stores/useAppStore';

const LandingPage = lazy(() =>
  import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);

// Farmer Pages
const FarmerBookingPage = lazy(() =>
  import('@/features/farmer/FarmerBookingPage').then((m) => ({ default: m.FarmerBookingPage })),
);
const FarmerPoolReceiptPage = lazy(() =>
  import('@/features/farmer/FarmerPoolReceiptPage').then((m) => ({ default: m.FarmerPoolReceiptPage })),
);
const FarmerPayTrackPage = lazy(() =>
  import('@/features/farmer/FarmerPayTrackPage').then((m) => ({ default: m.FarmerPayTrackPage })),
);
const FarmerMessagesPage = lazy(() =>
  import('@/features/farmer/FarmerMessagesPage').then((m) => ({ default: m.FarmerMessagesPage })),
);

// Transporter Pages
const TransporterOffersPage = lazy(() =>
  import('@/features/transporter/TransporterOffersPage').then((m) => ({ default: m.TransporterOffersPage })),
);
const TransporterTourPage = lazy(() =>
  import('@/features/transporter/TransporterTourPage').then((m) => ({ default: m.TransporterTourPage })),
);
const TransporterCorridorBotPage = lazy(() =>
  import('@/features/transporter/TransporterCorridorBotPage').then((m) => ({
    default: m.TransporterCorridorBotPage,
  })),
);
const TransporterShadowPage = lazy(() =>
  import('@/features/transporter/TransporterShadowPage').then((m) => ({ default: m.TransporterShadowPage })),
);
const TransporterWalletPassportPage = lazy(() =>
  import('@/features/transporter/TransporterWalletPassportPage').then((m) => ({
    default: m.TransporterWalletPassportPage,
  })),
);
const TransporterOnboardingPage = lazy(() =>
  import('@/features/transporter/TransporterOnboardingPage').then((m) => ({
    default: m.TransporterOnboardingPage,
  })),
);

// Business Pages
const BusinessCorridorsPage = lazy(() =>
  import('@/features/business/BusinessPages').then((m) => ({ default: m.BusinessCorridorsPage })),
);
const BusinessStandingCsvPage = lazy(() =>
  import('@/features/business/BusinessPages').then((m) => ({ default: m.BusinessStandingCsvPage })),
);
const BusinessInvoicesPage = lazy(() =>
  import('@/features/business/BusinessPages').then((m) => ({ default: m.BusinessInvoicesPage })),
);

// FPO Pages
const FpoMembersPage = lazy(() =>
  import('@/features/fpo/FpoPages').then((m) => ({ default: m.FpoMembersPage })),
);
const FpoPoolsAnalyticsPage = lazy(() =>
  import('@/features/fpo/FpoPages').then((m) => ({ default: m.FpoPoolsAnalyticsPage })),
);
const FpoBroadcastPage = lazy(() =>
  import('@/features/fpo/FpoPages').then((m) => ({ default: m.FpoBroadcastPage })),
);

// Kiosk Page
const KioskDeskPage = lazy(() =>
  import('@/features/kiosk/KioskDeskPage').then((m) => ({ default: m.KioskDeskPage })),
);

// Ops Control Tower Pages
const OpsLiveMapPage = lazy(() =>
  import('@/features/ops/OpsLiveMapPage').then((m) => ({ default: m.OpsLiveMapPage })),
);
const OpsPoolInspectorPage = lazy(() =>
  import('@/features/ops/OpsPoolInspectorPage').then((m) => ({ default: m.OpsPoolInspectorPage })),
);
const OpsSelfHealingPage = lazy(() =>
  import('@/features/ops/OpsSelfHealingPage').then((m) => ({ default: m.OpsSelfHealingPage })),
);
const OpsBenchmarkLabPage = lazy(() =>
  import('@/features/ops/OpsBenchmarkLabPage').then((m) => ({ default: m.OpsBenchmarkLabPage })),
);
const OpsDigitalTwinPage = lazy(() =>
  import('@/features/ops/OpsDigitalTwinPage').then((m) => ({ default: m.OpsDigitalTwinPage })),
);
const OpsSyntheticTalukaPage = lazy(() =>
  import('@/features/ops/OpsSyntheticTalukaPage').then((m) => ({ default: m.OpsSyntheticTalukaPage })),
);
const OpsDisputesPage = lazy(() =>
  import('@/features/ops/OpsDisputesPage').then((m) => ({ default: m.OpsDisputesPage })),
);
const OpsLedgerOnboardingPage = lazy(() =>
  import('@/features/ops/OpsLedgerOnboardingPage').then((m) => ({ default: m.OpsLedgerOnboardingPage })),
);
const OpsAnalyticsSettingsPage = lazy(() =>
  import('@/features/ops/OpsAnalyticsSettingsPage').then((m) => ({ default: m.OpsAnalyticsSettingsPage })),
);

export default function App() {
  const hydrateAuditHashes = useAppStore((s) => s.hydrateAuditHashes);
  const simulationTick = useAppStore((s) => s.simulationTick);
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);

  useEffect(() => {
    document.title = `${APP_NAME} — Rural Freight Pooling & Return-Leg Network`;
    hydrateAuditHashes();

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.matches) setReduceMotion(true);
    }

    const interval = window.setInterval(() => {
      simulationTick();
    }, 2800);
    return () => window.clearInterval(interval);
  }, [hydrateAuditHashes, simulationTick, setReduceMotion]);

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<BrandedRoadLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Farmer Workspace */}
            <Route path="/farmer" element={<Navigate to="/farmer/book" replace />} />
            <Route path="/farmer/book" element={<FarmerBookingPage />} />
            <Route path="/farmer/pool" element={<FarmerPoolReceiptPage />} />
            <Route path="/farmer/track" element={<FarmerPayTrackPage />} />
            <Route path="/farmer/messages" element={<FarmerMessagesPage />} />

            {/* Transporter Workspace */}
            <Route path="/transporter" element={<Navigate to="/transporter/offers" replace />} />
            <Route path="/transporter/offers" element={<TransporterOffersPage />} />
            <Route path="/transporter/tour" element={<TransporterTourPage />} />
            <Route path="/transporter/corridor" element={<TransporterCorridorBotPage />} />
            <Route path="/transporter/shadow" element={<TransporterShadowPage />} />
            <Route path="/transporter/wallet" element={<TransporterWalletPassportPage />} />
            <Route path="/transporter/onboard" element={<TransporterOnboardingPage />} />

            {/* Business Shipper Workspace */}
            <Route path="/business" element={<Navigate to="/business/corridors" replace />} />
            <Route path="/business/corridors" element={<BusinessCorridorsPage />} />
            <Route path="/business/orders" element={<BusinessStandingCsvPage />} />
            <Route path="/business/invoices" element={<BusinessInvoicesPage />} />

            {/* FPO Coordinator Workspace */}
            <Route path="/fpo" element={<Navigate to="/fpo/members" replace />} />
            <Route path="/fpo/members" element={<FpoMembersPage />} />
            <Route path="/fpo/pools" element={<FpoPoolsAnalyticsPage />} />
            <Route path="/fpo/broadcast" element={<FpoBroadcastPage />} />

            {/* Freight Sakhi Kiosk Mode */}
            <Route path="/kiosk" element={<Navigate to="/kiosk/desk" replace />} />
            <Route path="/kiosk/desk" element={<KioskDeskPage />} />

            {/* Operations Control Tower */}
            <Route path="/ops" element={<Navigate to="/ops/map" replace />} />
            <Route path="/ops/map" element={<OpsLiveMapPage />} />
            <Route path="/ops/pools" element={<OpsPoolInspectorPage />} />
            <Route path="/ops/healing" element={<OpsSelfHealingPage />} />
            <Route path="/ops/benchmarks" element={<OpsBenchmarkLabPage />} />
            <Route path="/ops/twin" element={<OpsDigitalTwinPage />} />
            <Route path="/ops/taluka" element={<OpsSyntheticTalukaPage />} />
            <Route path="/ops/disputes" element={<OpsDisputesPage />} />
            <Route path="/ops/ledger" element={<OpsLedgerOnboardingPage />} />
            <Route path="/ops/analytics" element={<OpsAnalyticsSettingsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <FeedbackLayer />
    </BrowserRouter>
  );
}
