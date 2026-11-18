import { describe, expect, it } from 'vitest';
import { KOLAR_NODES, SYNTHETIC_PERSONAS } from '@/data/seed/geographyAndUsers';
import { generateInitialWorld, rebuildRealSha256AuditChain } from '@/data/seed';
import { evaluatePolicyOnTaluka } from '@/engine/behaviour';
import {
  areCargosCompatible,
  computeLifoLoadingOrder,
  isPoolCargoSetCompatible,
} from '@/engine/compatibility';
import {
  calculateTourCost,
  computePoolCostShares,
  verifyAuditChain,
} from '@/engine/pricing';
import {
  minimalChangeReplan,
  runGreedyFirstCome,
  runLocalSearchRouter,
  runQuboAnnealingSolver,
  type SolverLoadInput,
  type SolverVehicleInput,
} from '@/engine/solvers';
import {
  adjustedShelfLifeHours,
  computeSpoilageStatus,
  evaluateWaitOrGo,
} from '@/engine/spoilage';
import { parseVoiceBookingInput } from '@/engine/voiceParser';

describe('HarvestHaul Core Engines', () => {
  describe('Multilingual Voice Parser', () => {
    it('parses English voice booking accurately', () => {
      const res = parseVoiceBookingInput(
        '20 quintal tomato, tomorrow morning, Kolar APMC from Vemgal',
        KOLAR_NODES,
      );
      expect(res.crop).toBe('tomato');
      expect(res.weightQuintals).toBe(20);
      expect(res.pickupNodeId).toBe('v_vemgal');
      expect(res.dropNodeId).toBe('m_kolar_apmc');
      expect(res.confidencePct).toBeGreaterThanOrEqual(80);
    });

    it('parses Hindi voice booking accurately', () => {
      const res = parseVoiceBookingInput(
        'कल सुबह 25 क्विंटल आलू मुलबगल से कोलार मंडी भेजना है',
        KOLAR_NODES,
      );
      expect(res.crop).toBe('potato');
      expect(res.weightQuintals).toBe(25);
      expect(res.pickupNodeId).toBe('v_mulbagal');
      expect(res.dropNodeId).toBe('m_kolar_apmc');
    });

    it('parses Kannada voice booking and converts bags/crates units', () => {
      const kn = parseVoiceBookingInput(
        'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 20 ಕ್ವಿಂಟಲ್ ಟೊಮೆಟೊ ವೇಮಗಲ್ ನಿಂದ ಕೋಲಾರ ಎಪಿಎಂಸಿ ಮಂಡಿಗೆ ಕಳುಹಿಸಬೇಕು',
        KOLAR_NODES,
      );
      expect(kn.crop).toBe('tomato');
      expect(kn.weightQuintals).toBe(20);

      const bags = parseVoiceBookingInput(
        '30 bags potato from Mulbagal to Kolar APMC',
        KOLAR_NODES,
      );
      expect(bags.weightQuintals).toBe(15);
    });
  });

  describe('Cargo Compatibility Matrix & LIFO Order', () => {
    it('blocks fertiliser from sharing a bed with fresh produce', () => {
      expect(areCargosCompatible('fertiliser', 'tomato').compatible).toBe(false);
      expect(areCargosCompatible('poultry_feed', 'flowers').compatible).toBe(false);
      expect(areCargosCompatible('flowers', 'tomato').compatible).toBe(false);
      expect(areCargosCompatible('tomato', 'beans').compatible).toBe(true);
      expect(isPoolCargoSetCompatible(['tomato', 'beans', 'capsicum']).compatible).toBe(true);
    });

    it('computes strict Last-In-First-Out loading order', () => {
      const lifo = computeLifoLoadingOrder([
        { id: 'first_mandi_drop', dropOrderIndex: 1 },
        { id: 'second_mandi_drop', dropOrderIndex: 2 },
        { id: 'third_mandi_drop', dropOrderIndex: 3 },
      ]);
      const firstDrop = lifo.find((x) => x.id === 'first_mandi_drop')!;
      const lastDrop = lifo.find((x) => x.id === 'third_mandi_drop')!;
      expect(firstDrop.loadOrder).toBe(3);
      expect(lastDrop.loadOrder).toBe(1);
    });
  });

  describe('Tour Pricing & Shapley Efficiency Property', () => {
    it('applies return-leg discount to net outbound tour cost', () => {
      const emptyReturn = calculateTourCost({
        outboundKm: 32,
        returnKm: 32,
        vehicleCostPerKmInr: 22,
        returnFillRatio: 0,
      });
      const filledReturn = calculateTourCost({
        outboundKm: 32,
        returnKm: 32,
        vehicleCostPerKmInr: 22,
        returnFillRatio: 0.75,
        returnLoadRevenueInr: 1050,
      });
      expect(filledReturn.returnDiscountInr).toBeGreaterThan(0);
      expect(filledReturn.netOutboundPoolCostInr).toBeLessThan(emptyReturn.netOutboundPoolCostInr);
    });

    it('satisfies exact Shapley efficiency (sum of shares === netPoolCostInr) for <= 8 shippers', () => {
      const shippers = [
        { loadId: 'l1', shipperName: 'Ramesh', villageName: 'Vemgal', weightQuintals: 8, directDistanceKm: 19, marginalDetourKm: 1.8 },
        { loadId: 'l2', shipperName: 'Sunita', villageName: 'Narasapura', weightQuintals: 12, directDistanceKm: 16, marginalDetourKm: 3.1 },
        { loadId: 'l3', shipperName: 'Lakshmi', villageName: 'Kolar', weightQuintals: 5, directDistanceKm: 6, marginalDetourKm: 1.2 },
      ];
      const targetNetCost = 1487;
      const shares = computePoolCostShares({
        shippers,
        netPoolCostInr: targetNetCost,
        returnDiscountInr: 310,
        costPerKmInr: 21,
        activeSplitRule: 'shapley',
      });
      const sumShapley = shares.reduce((acc, s) => acc + s.shapleyShareInr, 0);
      const sumWeight = shares.reduce((acc, s) => acc + s.weightRuleShareInr, 0);
      const sumEqual = shares.reduce((acc, s) => acc + s.equalRuleShareInr, 0);
      expect(sumShapley).toBe(targetNetCost);
      expect(sumWeight).toBe(targetNetCost);
      expect(sumEqual).toBe(targetNetCost);
    });

    it('satisfies efficiency under Monte Carlo Shapley for > 8 shippers', () => {
      const shippers = Array.from({ length: 10 }, (_, idx) => ({
        loadId: `mc_${idx}`,
        shipperName: `Farmer ${idx}`,
        villageName: 'Vemgal',
        weightQuintals: 3 + (idx % 5),
        directDistanceKm: 14 + idx * 2,
        marginalDetourKm: 2,
      }));
      const targetNetCost = 3940;
      const shares = computePoolCostShares({
        shippers,
        netPoolCostInr: targetNetCost,
        returnDiscountInr: 500,
        costPerKmInr: 28,
        activeSplitRule: 'shapley',
      });
      expect(shares.reduce((a, s) => a + s.finalShareInr, 0)).toBe(targetNetCost);
    });
  });

  describe('Spoilage Curve & Wait-or-Go Optimal Stopping', () => {
    it('shortens shelf life at higher ambient temperatures', () => {
      const coolHours = adjustedShelfLifeHours('tomato', 22, 90);
      const hotHours = adjustedShelfLifeHours('tomato', 35, 90);
      expect(hotHours).toBeLessThan(coolHours);

      const status = computeSpoilageStatus(
        'flowers',
        new Date(Date.now() - 10 * 3_600_000).toISOString(),
        31,
        72,
      );
      expect(status.urgencyTag).toBe('urgent');

      const advice = evaluateWaitOrGo({
        crop: 'potato',
        weightQuintals: 15,
        soloPriceInr: 1800,
        remainingShelfHours: 72,
      });
      expect(advice.points).toHaveLength(7);
      expect(advice.recommendation).toBe('wait');
    });
  });

  describe('Solvers & Self-Healing Re-Planner', () => {
    const sampleLoads: SolverLoadInput[] = [
      { id: 's1', crop: 'tomato', weightQuintals: 8, pickupNodeId: 'v_vemgal', dropNodeId: 'm_kolar_apmc', readyMinutesFromNow: 0, spoilageDeadlineMinutes: 240 },
      { id: 's2', crop: 'beans', weightQuintals: 7, pickupNodeId: 'v_narasapura', dropNodeId: 'm_kolar_apmc', readyMinutesFromNow: 10, spoilageDeadlineMinutes: 240 },
      { id: 's3', crop: 'potato', weightQuintals: 11, pickupNodeId: 'v_mulbagal', dropNodeId: 'm_kolar_apmc', readyMinutesFromNow: 15, spoilageDeadlineMinutes: 300 },
      { id: 's4', crop: 'carrot', weightQuintals: 9, pickupNodeId: 'v_tayalur', dropNodeId: 'm_kolar_apmc', readyMinutesFromNow: 20, spoilageDeadlineMinutes: 300 },
    ];
    const sampleVehicles: SolverVehicleInput[] = [
      { id: 'v1', capacityQuintals: 20, costPerKmInr: 20, baseNodeId: 'v_vemgal', homeNodeId: 'v_kolar', detourBudgetKm: 15 },
      { id: 'v2', capacityQuintals: 25, costPerKmInr: 22, baseNodeId: 'v_mulbagal', homeNodeId: 'v_mulbagal', detourBudgetKm: 15 },
      { id: 'v3', capacityQuintals: 45, costPerKmInr: 30, baseNodeId: 'v_kolar', homeNodeId: 'v_srinivaspur', detourBudgetKm: 20 },
    ];

    it('runs Greedy, Local-search router, and Annealing (QUBO) assigning every load', () => {
      const g = runGreedyFirstCome({ loads: sampleLoads, vehicles: sampleVehicles, nodes: KOLAR_NODES, scenarioId: 'small', seed: 7 });
      const ls = runLocalSearchRouter({ loads: sampleLoads, vehicles: sampleVehicles, nodes: KOLAR_NODES, scenarioId: 'small', seed: 7 });
      const qubo = runQuboAnnealingSolver({ loads: sampleLoads, vehicles: sampleVehicles, nodes: KOLAR_NODES, scenarioId: 'small', seed: 7, iterations: 400 });

      for (const res of [g, ls, qubo]) {
        const assignedCount = res.assignments.reduce((a, b) => a + b.loadIds.length, 0);
        expect(assignedCount).toBe(sampleLoads.length);
        expect(res.avgFillPct).toBeGreaterThan(0);
        expect(res.costPerQuintalInr).toBeGreaterThan(0);
      }
    });

    it('performs minimal-change self-healing onto an alternate vehicle', () => {
      const world = generateInitialWorld();
      const replan = minimalChangeReplan({
        affectedLoads: sampleLoads.slice(0, 2),
        candidateVehicles: world.vehicles,
        excludedVehicleId: world.vehicles[0].id,
        nodes: world.nodes,
      });
      expect(replan.selectedVehicle.id).not.toBe(world.vehicles[0].id);
      expect(replan.newRouteNodeIds.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('SHA-256 Cryptographic Audit Chain & Synthetic Taluka', () => {
    it('builds and verifies real SHA-256 hash chain and catches tampering', async () => {
      const world = generateInitialWorld();
      const validChain = await rebuildRealSha256AuditChain(world.auditChain.slice(0, 4));
      const checkOk = await verifyAuditChain(validChain);
      expect(checkOk.valid).toBe(true);
      expect(checkOk.checkedCount).toBe(4);

      // Tamper with entry #2 totalInr
      const tampered = validChain.map((e, i) => (i === 1 ? { ...e, totalInr: e.totalInr + 50 } : e));
      const checkBad = await verifyAuditChain(tampered);
      expect(checkBad.valid).toBe(false);
      expect(checkBad.brokenAtIndex).toBe(2);
    });

    it('increases Synthetic Taluka acceptance when suggested fix replaces punitive cancellation fee', () => {
      const punitive = evaluatePolicyOnTaluka(
        'Add a ₹200 fee when a transporter cancels',
        SYNTHETIC_PERSONAS,
      );
      const fixed = evaluatePolicyOnTaluka(punitive.suggestedFixText, SYNTHETIC_PERSONAS);
      expect(fixed.acceptancePct).toBeGreaterThan(punitive.acceptancePct);
    });
  });
});
