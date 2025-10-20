export type MachineType = "slot" | "roulette";

export type SlotProfile = "steady" | "balanced" | "volatile";

export type RouletteBet =
  | "single-number"
  | "split"
  | "street"
  | "dozen"
  | "even-money";

export interface BaseSimulationSettings {
  spins: number;
  betSize: number;
}

export interface SlotSettings extends BaseSimulationSettings {
  machine: "slot";
  profile: SlotProfile;
}

export interface RouletteSettings extends BaseSimulationSettings {
  machine: "roulette";
  bet: RouletteBet;
}

export type SimulationSettings = SlotSettings | RouletteSettings;

export interface SimulationSummary {
  totalWinSpins: number;
  totalLosingSpins: number;
  finalNet: number;
  peak: number;
  trough: number;
  volatility: number;
}

export interface SimulationLine {
  points: number[];
  summary: SimulationSummary;
}

interface Outcome {
  probability: number;
  multiplier: number;
}

const slotProfiles: Record<SlotProfile, Outcome[]> = {
  steady: [
    { probability: 0.336, multiplier: 0 },
    { probability: 0.25, multiplier: 0.5 },
    { probability: 0.2, multiplier: 1 },
    { probability: 0.1, multiplier: 1.5 },
    { probability: 0.07, multiplier: 2 },
    { probability: 0.032, multiplier: 5 },
    { probability: 0.011, multiplier: 10 },
    { probability: 0.001, multiplier: 20 },
  ],
  balanced: [
    { probability: 0.5937, multiplier: 0 },
    { probability: 0.1, multiplier: 0.5 },
    { probability: 0.15, multiplier: 1 },
    { probability: 0.09, multiplier: 2 },
    { probability: 0.049, multiplier: 5 },
    { probability: 0.015, multiplier: 10 },
    { probability: 0.002, multiplier: 50 },
    { probability: 0.0003, multiplier: 100 },
  ],


  
  volatile: [
    { probability: 0.769425, multiplier: 0 },
    { probability: 0.1, multiplier: 0.5 },
    { probability: 0.05, multiplier: 1 },
    { probability: 0.04, multiplier: 2 },
    { probability: 0.02, multiplier: 5 },
    { probability: 0.015, multiplier: 10 },
    { probability: 0.003, multiplier: 50 },
    { probability: 0.0025, multiplier: 100 },
    { probability: 0.000075, multiplier: 1000 },
  ],
};

export const slotProfileLabels: Record<SlotProfile, string> = {
  steady: "Steady (low volatility)",
  balanced: "Balanced (casino default)",
  volatile: "Volatile (high variance)",
};

interface RouletteBetDefinition {
  probability: number;
  multiplier: number;
  label: string;
}

export const rouletteBets: Record<RouletteBet, RouletteBetDefinition> = {
  "single-number": {
    probability: 1 / 37,
    multiplier: 36,
    label: "Single Number (35:1)",
  },
  split: {
    probability: 2 / 37,
    multiplier: 18,
    label: "Split (17:1)",
  },
  street: {
    probability: 3 / 37,
    multiplier: 12,
    label: "Street (11:1)",
  },
  dozen: {
    probability: 12 / 37,
    multiplier: 3,
    label: "Dozen (2:1)",
  },
  "even-money": {
    probability: 18 / 37,
    multiplier: 2,
    label: "Red / Black (1:1)",
  },
};

const randomFromDistribution = (outcomes: Outcome[], rand: () => number) => {
  const roll = rand();
  let cumulative = 0;

  for (const outcome of outcomes) {
    cumulative += outcome.probability;
    if (roll <= cumulative) {
      return outcome.multiplier;
    }
  }

  return outcomes[outcomes.length - 1]?.multiplier ?? 0;
};

const simulateSlot = (settings: SlotSettings, rand: () => number): SimulationLine => {
  const { spins, betSize, profile } = settings;
  const outcomes = slotProfiles[profile];

  let net = 0;
  let peak = 0;
  let trough = 0;
  let winSpins = 0;
  let loseSpins = 0;
  const points: number[] = [0];

  for (let i = 0; i < spins; i++) {
    const multiplier = randomFromDistribution(outcomes, rand);
    const payout = betSize * multiplier;
    const change = payout - betSize;

    if (change > 0) {
      winSpins += 1;
    } else {
      loseSpins += 1;
    }

    net += change;
    peak = Math.max(peak, net);
    trough = Math.min(trough, net);
    points.push(net);
  }

  const mean = points.reduce((acc, value) => acc + value, 0) / points.length;
  const variance =
    points.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    points.length;

  return {
    points,
    summary: {
      totalWinSpins: winSpins,
      totalLosingSpins: loseSpins,
      finalNet: net,
      peak,
      trough,
      volatility: Math.sqrt(variance),
    },
  };
};

const simulateRoulette = (
  settings: RouletteSettings,
  rand: () => number,
): SimulationLine => {
  const { spins, betSize, bet } = settings;
  const betDefinition = rouletteBets[bet];

  let net = 0;
  let peak = 0;
  let trough = 0;
  let winSpins = 0;
  let loseSpins = 0;
  const points: number[] = [0];

  for (let i = 0; i < spins; i++) {
    const roll = rand();
    const win = roll <= betDefinition.probability;
    const change = win ? betSize * (betDefinition.multiplier - 1) : -betSize;

    if (win) {
      winSpins += 1;
    } else {
      loseSpins += 1;
    }

    net += change;
    peak = Math.max(peak, net);
    trough = Math.min(trough, net);
    points.push(net);
  }

  const mean = points.reduce((acc, value) => acc + value, 0) / points.length;
  const variance =
    points.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    points.length;

  return {
    points,
    summary: {
      totalWinSpins: winSpins,
      totalLosingSpins: loseSpins,
      finalNet: net,
      peak,
      trough,
      volatility: Math.sqrt(variance),
    },
  };
};

export const runSimulation = (
  settings: SimulationSettings,
  rand: () => number = Math.random,
): SimulationLine => {
  if (settings.machine === "slot") {
    return simulateSlot(settings, rand);
  }

  return simulateRoulette(settings, rand);
};

export const calculateMeanLine = (lines: SimulationLine[]): number[] => {
  if (lines.length === 0) {
    return [];
  }

  const maxPoints = Math.max(...lines.map((line) => line.points.length));
  const meanPoints: number[] = [];

  for (let i = 0; i < maxPoints; i++) {
    let sum = 0;
    let count = 0;

    for (const line of lines) {
      if (line.points[i] !== undefined) {
        sum += line.points[i];
        count += 1;
      }
    }

    meanPoints.push(count > 0 ? sum / count : 0);
  }

  return meanPoints;
};

export const defaultSettings: SimulationSettings = {
  machine: "slot",
  spins: 200,
  betSize: 1,
  profile: "balanced",
};

export const createSeededRandom = (seed: number) => {
  let t = seed >>> 0;

  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};
