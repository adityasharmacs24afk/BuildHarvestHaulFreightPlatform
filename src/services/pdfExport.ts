import { jsPDF } from 'jspdf';
import { APP_NAME } from '@/app/constants';
import type { Pool, ShapleyShare, TransporterProfile, Vehicle } from '@/types/domain';

export function downloadPoolReceiptPdf(pool: Pool, share: ShapleyShare): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(247, 250, 245);
  doc.rect(0, 0, 595, 842, 'F');

  doc.setFillColor(63, 163, 116);
  doc.rect(0, 0, 595, 86, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`${APP_NAME} — Transparent Freight Receipt`, 40, 44);
  doc.setFontSize(11);
  doc.text(`Pool Reference: ${pool.code}   |   Vehicle: ${pool.vehiclePlate}   |   Split Rule: ${pool.splitRule.toUpperCase()}`, 40, 66);

  doc.setTextColor(30, 43, 37);
  doc.setFontSize(13);
  doc.text(`Shipper: ${share.shipperName} (${share.villageName})`, 40, 124);
  doc.setFontSize(11);
  doc.text(`Booked Weight: ${share.weightQuintals} quintals   |   Direct Corridor: ${share.directDistanceKm} km`, 40, 144);
  doc.text(`Driver: ${pool.transporterName} (${pool.transporterPhone})`, 40, 164);
  doc.text(`Issued At: ${new Date().toLocaleString()}`, 40, 184);

  doc.setDrawColor(225, 235, 228);
  doc.line(40, 204, 555, 204);

  const rows: [string, string][] = [
    ['Dedicated Solo Vehicle Benchmark', `INR ${share.soloCostInr}`],
    ['Base Weight Allocation', `INR ${share.baseWeightChargeInr}`],
    ['Shared Trunk Distance Allocation', `INR ${share.distanceComponentInr}`],
    ['Village Pickup Detour Increment', `INR ${share.detourDeltaInr}`],
    ['Filled Return-Leg Credit (Deducted)', `- INR ${share.returnLegCreditInr}`],
    ['Final Payable Fare (Escrow Protected)', `INR ${share.finalShareInr}`],
    ['Net Savings vs Solo Booking', `${share.savingsPct}% Saved`],
  ];

  let y = 236;
  rows.forEach(([label, value], idx) => {
    if (idx === 5) {
      doc.setFillColor(221, 241, 230);
      doc.roundedRect(36, y - 16, 523, 28, 6, 6, 'F');
      doc.setFontSize(12);
    } else {
      doc.setFontSize(11);
    }
    doc.setTextColor(30, 43, 37);
    doc.text(label, 48, y);
    doc.text(value, 430, y);
    y += 32;
  });

  doc.setFontSize(10);
  doc.setTextColor(92, 111, 101);
  doc.text(
    'Escrow Guarantee: Payment is held safely in transit escrow and released upon mandi weighment confirmation.',
    40,
    y + 24,
  );
  doc.text(`Solver Verified: ${pool.solverUsed}`, 40, y + 44);

  doc.save(`${APP_NAME}-Receipt-${pool.code}.pdf`);
}

export function downloadCreditPassportPdf(
  transporter: TransporterProfile,
  vehicles: Vehicle[],
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(247, 250, 245);
  doc.rect(0, 0, 595, 842, 'F');

  doc.setFillColor(42, 127, 88);
  doc.rect(0, 0, 595, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`${APP_NAME} — Verified Transporter Credit Passport`, 40, 46);
  doc.setFontSize(11);
  doc.text(`Passport ID: HH-PASS-${transporter.id.toUpperCase()}   |   Generated: ${new Date().toLocaleDateString()}`, 40, 70);

  doc.setTextColor(30, 43, 37);
  doc.setFontSize(14);
  doc.text(`Operator: ${transporter.name}`, 40, 132);
  doc.setFontSize(11);
  doc.text(`Registered Phone: ${transporter.phone}   |   Settlement Bank: ${transporter.bankAccountMasked} (${transporter.ifsc})`, 40, 154);

  const metrics: [string, string][] = [
    ['Reliability & Completion Score', `${transporter.reliabilityScore} / 100`],
    ['Completed Verified Tours (Last 90 Days)', `${transporter.completedTours} Tours`],
    ['Verified Monthly Net Freight Income', `INR ${transporter.verifiedMonthlyEarningsInr.toLocaleString()}`],
    ['Fleet Registered on Network', vehicles.map((v) => `${v.plate} (${v.typeName})`).join(', ')],
    ['Revolving Fuel Credit Eligibility', 'Up to INR 35,000 @ 11.2% p.a.'],
    ['Commercial Vehicle Upgrade Eligibility', 'Up to INR 4,80,000 @ 12.4% p.a.'],
  ];

  let y = 205;
  metrics.forEach(([k, val]) => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(40, y - 18, 515, 34, 6, 6, 'F');
    doc.setTextColor(92, 111, 101);
    doc.text(k, 52, y + 3);
    doc.setTextColor(30, 43, 37);
    doc.text(val, 290, y + 3);
    y += 44;
  });

  doc.setFontSize(10);
  doc.setTextColor(92, 111, 101);
  doc.text(
    'All trip settlements above are backed by UPI escrow records and mandi weighbridge confirmations.',
    40,
    y + 20,
  );

  doc.save(`${APP_NAME}-Credit-Passport-${transporter.name.replace(/\s+/g, '-')}.pdf`);
}

export function downloadAnalyticsReportPdf(metrics: {
  emptyKmAvoided: number;
  avgFillPct: number;
  avgCostPerQtl: number;
  onTimePct: number;
  spoilageAvoidedQtl: number;
  transporterUpliftPct: number;
  avgRecoverySec: number;
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(63, 163, 116);
  doc.rect(0, 0, 595, 82, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text(`${APP_NAME} — Kolar Network Operations Summary`, 40, 48);

  doc.setTextColor(30, 43, 37);
  doc.setFontSize(12);
  const lines = [
    `Empty Return Kilometres Avoided: ${metrics.emptyKmAvoided.toLocaleString()} km`,
    `Average Pooled Bed Fill Rate: ${metrics.avgFillPct}%`,
    `Average Shipper Freight Cost: INR ${metrics.avgCostPerQtl} per quintal`,
    `On-Time Mandi Arrival Rate: ${metrics.onTimePct}%`,
    `Produce Spoilage Avoided: ${metrics.spoilageAvoidedQtl} quintals`,
    `Transporter Tour Earnings Uplift: +${metrics.transporterUpliftPct}%`,
    `Self-Healing Cancellation Recovery Time: ${metrics.avgRecoverySec} seconds`,
  ];
  let y = 135;
  lines.forEach((ln) => {
    doc.text(ln, 44, y);
    y += 30;
  });

  doc.save(`${APP_NAME}-Operations-Report.pdf`);
}

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (v: string | number) => {
    const str = String(v ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const content = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function speakTextAloud(text: string, lang: 'en' | 'hi' | 'kn'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = 0.96;
    window.speechSynthesis.speak(utter);
  } catch {
    // Speech synthesis optional fallback
  }
}
