'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  Title,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  MachineType,
  SimulationSettings,
  RouletteBet,
  SlotProfile,
  runSimulation,
  defaultSettings,
  slotProfileLabels,
  rouletteBets,
  createSeededRandom,
} from './lib/simulation';
import type { SimulationLine } from './lib/simulation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
);

type DisplayRun = SimulationLine & {
  id: string;
  name: string;
  color: string;
};

const palette = [
  '#7F5AF0',
  '#2CB67D',
  '#F25F4C',
  '#FF8906',
  '#3DA9FC',
  '#EF4565',
  '#7B6CF6',
  '#52A7FA',
];

const quickSpinPresets = [1, 5, 10, 20, 50, 100, 250, 500, 1000];
const MAX_DISPLAY_RUNS = 100;
const MAX_RUNS = 1000;
const SLIDER_STEPS = 100;
const SEED_STEP = 9973;

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

const colorForIndex = (index: number) => palette[index % palette.length];
const seedForIndex = (base: number, index: number) =>
  (base + index * SEED_STEP) >>> 0;

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) {
    return hex;
  }

  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const BASELINE_SEED = 9645231;

export default function Home() {
  const [settings, setSettings] = useState<SimulationSettings>(defaultSettings);
  const [runCount, setRunCount] = useState<number>(1);
  const [baseSeed, setBaseSeed] = useState<number>(BASELINE_SEED);

  const machine = settings.machine;

  const maxSpins = settings.spins;

  const sliderRunValues = useMemo(() => {
    const values: number[] = [];
    const logMax = Math.log(MAX_RUNS);

    for (let step = 0; step <= SLIDER_STEPS; step++) {
      if (step === 0) {
        values.push(1);
        continue;
      }

      const normalized = step / SLIDER_STEPS;
      const raw = Math.round(Math.exp(normalized * logMax));
      const previous = values[step - 1];
      const ensured = Math.min(MAX_RUNS, Math.max(previous + 1, raw));
      values.push(ensured);
    }

    values[SLIDER_STEPS] = MAX_RUNS;
    return values;
  }, []);

  const simulationData = useMemo(() => {
    const totalRuns = Math.max(runCount, 1);
    const accumulator = Array.from({ length: maxSpins + 1 }, () => 0);
    const displayRuns: DisplayRun[] = [];
    let aggregateFinalNet = 0;
    let tailFinalSum = 0;
    let tailWinSpins = 0;
    let tailLossSpins = 0;

    for (let index = 0; index < totalRuns; index++) {
      const seed = seedForIndex(baseSeed, index);
      const rng = createSeededRandom(seed);
      const result = runSimulation(settings, rng);
      const { points, summary } = result;

      for (let i = 0; i < points.length; i++) {
        accumulator[i] += points[i];
      }

      if (index < MAX_DISPLAY_RUNS) {
        displayRuns.push({
          id: `run-${index + 1}`,
          name: `Run ${index + 1}`,
          color: colorForIndex(index),
          ...result,
        });
      } else {
        tailFinalSum += summary.finalNet;
        tailWinSpins += summary.totalWinSpins;
        tailLossSpins += summary.totalLosingSpins;
      }

      aggregateFinalNet += summary.finalNet;
    }

    const meanLine =
      totalRuns > 0
        ? accumulator.map((sum) => sum / totalRuns)
        : Array.from({ length: maxSpins + 1 }, () => 0);

    const additionalCount =
      totalRuns > displayRuns.length ? totalRuns - displayRuns.length : 0;

    const tailSummary =
      additionalCount > 0
        ? {
            count: additionalCount,
            totalFinal: tailFinalSum,
            winRate:
              (tailWinSpins / (additionalCount * settings.spins)) * 100 || 0,
            lossRate:
              (tailLossSpins / (additionalCount * settings.spins)) * 100 || 0,
          }
        : null;

    return { displayRuns, meanLine, tailSummary, totalRuns, totalFinal: aggregateFinalNet };
  }, [runCount, baseSeed, settings, maxSpins]);

  const { displayRuns, meanLine, tailSummary, totalFinal } = simulationData;

  const chartData = useMemo(() => {
    const labels = Array.from({ length: maxSpins + 1 }, (_, index) => index);
    const fadeLines = runCount > 1;
    const datasets = displayRuns.map((run, index) => ({
      label: run.name,
      data: run.points,
      borderColor: fadeLines ? hexToRgba(run.color, 0.45) : run.color,
      backgroundColor: hexToRgba(run.color, fadeLines ? 0.08 : 0.18),
      pointRadius: 0,
      borderWidth: fadeLines ? 1.8 : 2.4,
      tension: 0.35,
      fill: false,
      order: index + 1,
    }));

    if (runCount > 1) {
      datasets.push({
        label: 'Mean payout',
        data: meanLine,
        borderColor: '#FACC15',
        backgroundColor: 'rgba(250, 204, 21, 0.12)',
        borderWidth: 3.2,
        pointRadius: 0,
        tension: 0.22,
        fill: false,
        order: 0,
      });
    }

    return { labels, datasets };
  }, [displayRuns, meanLine, maxSpins, runCount]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
        title: {
          display: false,
        },
      },
      elements: {
        point: {
          radius: 0,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            display: false,
          },
          title: {
            display: false,
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            display: true,
            color: '#A0AEC0',
            callback: (value: string | number) => {
              if (typeof value === 'string') {
                return value;
              }
              const prefix = value >= 0 ? '+' : '−';
              return `${prefix}$${Math.abs(value)}`;
            },
            maxTicksLimit: 6,
          },
          title: {
            display: false,
          },
        },
      },
    };
  }, []);

  const handleMachineChange = useCallback(
    (nextMachine: MachineType) => {
      if (nextMachine === machine) {
        return;
      }

      setSettings((prev) => {
        const base = {
          spins: prev.spins,
          betSize: prev.betSize,
        };

        if (nextMachine === 'slot') {
          const profile =
            prev.machine === 'slot' ? prev.profile : ('balanced' as SlotProfile);
          return {
            ...base,
            machine: 'slot' as const,
            profile,
          };
        }

        const bet =
          prev.machine === 'roulette'
            ? prev.bet
            : ('single-number' as RouletteBet);

        return {
          ...base,
          machine: 'roulette' as const,
          bet,
        };
      });
    },
    [machine],
  );

  const updateSpins = useCallback((value: number) => {
    setSettings((prev) => {
      if (prev.machine === 'slot') {
        return { ...prev, spins: value };
      }
      return { ...prev, spins: value };
    });
  }, []);

  const updateBetSize = useCallback((value: number) => {
    setSettings((prev) => {
      if (prev.machine === 'slot') {
        return { ...prev, betSize: value };
      }
      return { ...prev, betSize: value };
    });
  }, []);

  const updateSlotProfile = useCallback((profile: SlotProfile) => {
    setSettings((prev) => {
      if (prev.machine !== 'slot') {
        return prev;
      }
      return { ...prev, profile };
    });
  }, []);

  const updateRouletteBet = useCallback((bet: RouletteBet) => {
    setSettings((prev) => {
      if (prev.machine !== 'roulette') {
        return prev;
      }
      return { ...prev, bet };
    });
  }, []);

  const handleSetRunCount = useCallback(
    (sliderValue: number) => {
      const clamped = Math.max(0, Math.min(SLIDER_STEPS, Math.floor(sliderValue)));
      setRunCount(sliderRunValues[clamped]);
    },
    [sliderRunValues],
  );

  const handleReroll = useCallback(() => {
    setBaseSeed(randomSeed());
  }, []);

  const handleRemoveAll = useCallback(() => {
    setRunCount(1);
    setBaseSeed(BASELINE_SEED);
  }, []);

  const runSliderPosition = useMemo(() => {
    const index = sliderRunValues.findIndex((value) => value >= runCount);
    if (index === -1) {
      return SLIDER_STEPS;
    }
    return index;
  }, [runCount, sliderRunValues]);

  const runLabel = runCount === 1 ? 'run' : 'runs';
  const isVisualizationPaused = runCount > MAX_DISPLAY_RUNS;
  const shouldFadeRuns = Math.min(runCount, MAX_DISPLAY_RUNS) > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-3">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-400">
            Monte Carlo casino lab
          </span>
          <h1 className="text-4xl font-semibold text-slate-50 md:text-5xl">
            Explore how variance hits your bankroll
          </h1>
        </header>

        <section className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Game mode</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleMachineChange('slot')}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${machine === 'slot'
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100 shadow-[0_10px_40px_-20px_rgba(99,102,241,0.7)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                    }`}
                >
                  <span className="block text-sm font-medium uppercase tracking-wide text-slate-300">
                    Poker machine
                  </span>
                </button>

                <button
                  onClick={() => handleMachineChange('roulette')}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${machine === 'roulette'
                      ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-[0_10px_40px_-20px_rgba(16,185,129,0.7)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                    }`}
                >
                  <span className="block text-sm font-medium uppercase tracking-wide text-slate-300">
                    Roulette wheel
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Simulation runs
              </h3>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                  <span>1</span>
                  <span className="text-base font-semibold text-slate-100">
                    {runCount.toLocaleString()}
                  </span>
                  <span>1000</span>
                </div>
                <input
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-purple-400"
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  step={1}
                  value={runSliderPosition}
                  onChange={(event) => handleSetRunCount(Number(event.target.value))}
                />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleReroll}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/30 hover:bg-white/20"
                  >
                    ↻ Rerun
                  </button>
                  <button
                    onClick={handleRemoveAll}
                    className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Spins per run
              </h3>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                  <span>1</span>
                  <span className="text-base font-semibold text-slate-100">
                    {settings.spins}
                  </span>
                  <span>1000</span>
                </div>
                <input
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
                  type="range"
                  min={1}
                  max={1000}
                  step={1}
                  value={settings.spins}
                  onChange={(event) => updateSpins(Number(event.target.value))}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickSpinPresets.map((value) => (
                    <button
                      key={value}
                      onClick={() => updateSpins(value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        settings.spins === value
                          ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Bet size
              </h3>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                  <span>$1</span>
                  <span className="text-base font-semibold text-slate-100">
                    ${settings.betSize}
                  </span>
                  <span>$100</span>
                </div>
                <input
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-amber-400"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={settings.betSize}
                  onChange={(event) => updateBetSize(Number(event.target.value))}
                />
              </div>
            </div>

            {machine === 'slot' && (
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Volatility profile
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {(Object.keys(slotProfileLabels) as SlotProfile[]).map(
                    (profile, index) => (
                      <button
                        key={profile}
                        onClick={() => updateSlotProfile(profile)}
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${settings.machine === 'slot' && settings.profile === profile
                            ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                          }`}
                      >
                        <span
                          className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full"
                          style={{ background: colorForIndex(index) }}
                          aria-hidden
                        />
                        <div>
                          <span className="text-sm font-medium">
                            {slotProfileLabels[profile]}
                          </span>
                          <p className="mt-1 text-xs text-slate-400">
                            {profile === 'steady' &&
                              'Frequent small wins, gentle drawdowns.'}
                            {profile === 'balanced' &&
                              'Casino-style balance of hits and swings.'}
                            {profile === 'volatile' &&
                              'Long droughts chasing monster jackpots.'}
                          </p>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {machine === 'roulette' && (
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Bet structure
                </h3>
                <div className="mt-3 space-y-3">
                  {(Object.keys(rouletteBets) as RouletteBet[]).map(
                    (betKey, index) => {
                      const bet = rouletteBets[betKey];
                      return (
                        <button
                          key={betKey}
                          onClick={() => updateRouletteBet(betKey)}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${settings.machine === 'roulette' && settings.bet === betKey
                              ? 'border-emerald-300 bg-emerald-500/15 text-emerald-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                            }`}
                        >
                          <span
                            className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full"
                            style={{ background: colorForIndex(index) }}
                            aria-hidden
                          />
                          <div>
                            <span className="text-sm font-medium">{bet.label}</span>
                            <p className="mt-1 text-xs text-slate-400">
                              {`Win chance ${(bet.probability * 100).toFixed(1)}% · payout ${bet.multiplier - 1}:1`}
                            </p>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/85 p-5 shadow-inner">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-400/15 text-base font-semibold text-yellow-200">
                    Σ
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">
                      Total payout outlook
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
                      {runCount} {runLabel}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/60 px-5 py-2.5 text-right shadow-inner">
                  <span className="text-xs uppercase tracking-widest text-slate-400">
                    Total final payout
                  </span>
                  <p
                    className={`mt-1 text-2xl font-semibold ${totalFinal >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}
                  >
                    {totalFinal >= 0 ? '+' : '−'}${Math.abs(totalFinal).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-[0_25px_65px_-35px_rgba(15,23,42,0.9)] backdrop-blur">
              {isVisualizationPaused && (
                <>
                  <div className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200 shadow-sm">
                    <span aria-hidden>⏸</span>
                    <span>Graph paused at 100 runs</span>
                  </div>
                </>
              )}
              <Line options={chartOptions} data={chartData} />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 run-scroll">
              {displayRuns.map((run) => {
                const { summary } = run;
                const winRate =
                  (summary.totalWinSpins / settings.spins) * 100 || 0;
                const lossRate =
                  (summary.totalLosingSpins / settings.spins) * 100 || 0;
                const finalPositive = summary.finalNet >= 0;

                return (
                  <div
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm backdrop-blur"
                    style={{
                      borderColor: hexToRgba(run.color, shouldFadeRuns ? 0.24 : 0.4),
                      background: shouldFadeRuns
                        ? 'rgba(15, 23, 42, 0.55)'
                        : 'rgba(15, 23, 42, 0.7)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-2 w-8 rounded-full"
                        style={{ background: hexToRgba(run.color, shouldFadeRuns ? 0.4 : 0.8) }}
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
                          {run.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          σ {summary.volatility.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
                      <span
                        className={`font-semibold ${finalPositive ? 'text-emerald-200' : 'text-rose-200'}`}
                      >
                        Final {finalPositive ? '+' : '−'}${Math.abs(summary.finalNet).toFixed(2)}
                      </span>
                      <span>Wins {winRate.toFixed(1)}%</span>
                      <span>Losses {lossRate.toFixed(1)}%</span>
                      <span>Peak ${summary.peak.toFixed(2)}</span>
                      <span>Drawdown −${Math.abs(summary.trough).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              {tailSummary && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-3 text-xs sm:text-sm text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      +{tailSummary.count} aggregated runs (not visualized)
                    </span>
                    <span className="text-sm font-semibold text-slate-100">
                      Total final {tailSummary.totalFinal >= 0 ? '+' : '−'}${Math.abs(tailSummary.totalFinal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <span>Wins {tailSummary.winRate.toFixed(1)}%</span>
                    <span>Losses {tailSummary.lossRate.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
