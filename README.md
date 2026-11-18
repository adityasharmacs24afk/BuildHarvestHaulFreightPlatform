# HarvestHaul

**HarvestHaul** is an interactive rural freight pooling and return-leg coordination web platform built for growers, informal tempo/tractor owners, FPOs, agro-input dealers, village Freight Sakhi kiosks, and network operations teams across Kolar and Bengaluru districts.

> **Development Data Note:** All geography, stakeholder profiles, trips, pools, and ledger records are deterministically seeded in the browser at first load and persisted to `localStorage` so every flow runs offline with zero external API keys required.

---

## Quick Setup

```bash
npm install
npm run dev
```

- Run unit tests: `npm test`
- Build production bundle: `npm run build`
- Rename the product in one place: edit `APP_NAME` in `src/app/constants.ts`.

---

## Seeded Role Logins

Sign in via `/login` with any 6-digit OTP (for example `482910`), or use **Switch account** in the top-right profile menu to jump between roles immediately. Entering any unseeded 10-digit mobile number launches role-aware registration.

| Role | Account 1 | Account 2 | Default Workspace |
|---|---|---|---|
| **Farmer** | Ramesh Gowda (`+91 90001 10001`) | Lakshmi Devi (`+91 90001 10002`) | `/farmer/book` |
| **Transporter** | Mohan Kumar (`+91 90001 10011`) | Kiran Byregowda (`+91 90001 10012`) | `/transporter/offers` |
| **Business Shipper** | Priya Shetty — Chowdeshwari Agro Inputs (`+91 90001 10021`) | Raghavendra Setty — Vemgal Tomato Pulp Unit (`+91 90001 10022`) | `/business/corridors` |
| **FPO Coordinator** | Sunita Gowda — Vemgal Horti Growers FPO (`+91 90001 10041`) | Byregowda Reddy — Srinivaspur Totapuri FPO (`+91 90001 10042`) | `/fpo/members` |
| **Freight Sakhi Kiosk** | Kavitha (`+91 90001 10051`) | Bhavani (`+91 90001 10052`) | `/kiosk/desk` |
| **Operations Control Tower** | Aditi Deshpande (`+91 90001 10061`) | Chethan Gowda (`+91 90001 10062`) | `/ops/map` |

---

## Ten Golden-Path Presenter Walkthrough

1. **Voice Note to Pool (`/farmer/book` → `/farmer/pool`):** Tap the microphone or select a Kannada/Hindi/English voice phrase, verify extracted crop/weight/village chips, adjust flex-for-discount sliders, click **Confirm & Join Shared Pool**, and watch crates snap into the vehicle bed in LIFO sequence.
2. **Shapley Price Receipt (`/farmer/pool`):** Inspect the waterfall chart, click **ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ (Ask in Kannada)** to hear the plain-language explanation aloud, and cast a **Pool Split-Rule Vote** (`Shapley`, `Weight`, `Distance`, `Equal`) to see every shipper's share update live.
3. **Pay Escrow & Track (`/farmer/track`):** Complete the UPI QR + PIN escrow flow, watch the live truck move along the Kolar SVG corridor, confirm mandi weighbridge weight, rate the driver, release escrow, and download the PDF receipt.
4. **Cancellation Self-Healing (`/ops/map` or `/ops/healing`):** Click **Transporter Cancellation** in Ops; watch only the disrupted pool shake and re-plan onto a standby vehicle in ~3 seconds while neighbouring pools remain untouched and notifications arrive across roles.
5. **Return Load Attach (`/transporter/corridor`):** Tell the Corridor Bot `"I'm heading home to Srinivaspur"`, adjust the detour slider, and tap **Attach to Tour** to see tour income count up immediately.
6. **Solver Benchmark Lab (`/ops/benchmarks`):** Select **Harvest-Peak (48 Loads)** and click **Run Benchmark Race** to run `Greedy first-come`, `Local-search router`, and `Annealing (QUBO)` inside the Web Worker and export CSV metrics.
7. **Synthetic Taluka (`/ops/taluka`):** Evaluate `"Add a ₹200 fee when a transporter cancels"`, inspect persona objections and the tea-stall rumour graph, click **Apply Suggested Fix & Re-Run** to watch acceptance jump, and switch to **Red-Team Defences**.
8. **1-Minute Transporter Onboarding (`/transporter/onboard`):** Complete missed-call verification, chat corridor selection, and animated RC/plate scan, then jump straight into `/transporter/shadow` to replay last month's earnings uplift.
9. **Freight Sakhi Offline Queue (`/kiosk/desk`):** Click **Simulate Village Signal Drop**, record three walk-in bookings into the local store-and-forward queue, then click **Reconnect & Sync** to forward them into live pools.
10. **Transporter Credit Passport (`/transporter/wallet`):** Download the verified Credit Passport PDF, click **Apply with Passport** on the revolving fuel credit card, and track sanction status.

---

## Seeded Scenarios

- **Geography:** 24 Kolar district villages/towns, 4 mandis (`Kolar APMC`, `Srinivaspur Market`, `Bengaluru KR Market`, `Bengaluru Yeshwantpur`), 3 cold-chain/packhouses, 5 agro-input dealers, and 2 processing mills connected by highway, state, and rural road edges.
- **Benchmark Scenarios:** `small` (16 loads / 10 vehicles), `medium` (30 loads / 18 vehicles), and `harvest_peak` (48 loads / 28 vehicles), reproducible with any integer PRNG seed.
- **Digital Twin Policies:** `solo_first_come`, `rolling_pool_shapley`, and `tour_return_standby`.

---

## Swapping Simulated Services for a Production REST Backend

All asynchronous actions in `src/stores/useAppStore.ts` mirror REST resource boundaries (`POST /loads`, `POST /pools/:id/votes`, `POST /escrow/hold`, `POST /return-offers/:id/attach`, `POST /events/replan`, `GET /audit-chain`). To connect a live server:

1. Replace the local state mutations inside `useAppStore.ts` action handlers with `fetch('/api/...')` calls validated against the existing Zod schemas and TypeScript interfaces in `src/types/domain.ts`.
2. Replace the `simulationTick` interval in `src/App.tsx` with a WebSocket or Server-Sent Events stream publishing into `src/services/eventBus.ts`.
3. Move `src/engine/{solvers,pricing,spoilage,compatibility}` onto your backend worker service while keeping `verifyAuditChain` in the browser for client-side cryptographic receipt verification.
