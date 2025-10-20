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
import { useTheme } from './lib/theme-context';

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
  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? 'rgba(203, 213, 225, 0.75)' : '#4b5563';
  const axisGrid = theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const chartBackground = theme === 'dark' ? '#131425' : 'var(--surface-bg)';
  const chartShadow =
    theme === 'dark' ? '0 30px 60px rgba(12, 12, 25, 0.55)' : 'var(--card-shadow)';

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
            display: true,
            color: axisGrid,
            drawBorder: false,
            drawTicks: false,
            lineWidth: 1,
          },
          ticks: {
            display: true,
            color: axisColor,
            padding: 12,
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
  }, [axisColor, axisGrid]);

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
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      <div className="fixed inset-0 opacity-40 dark:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to bottom right, var(--gradient-from), transparent)' }} />
      <div className="fixed inset-0 backdrop-blur-[120px]" style={{ background: 'radial-gradient(circle at 20% 20%, var(--gradient-from) 0%, transparent 50%)' }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-6 py-16 lg:px-12">
        <header className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-[0.4em] font-medium" style={{ color: 'var(--label-text)' }}>
            Monte Carlo casino lab
          </span>
          <h1 className="text-5xl font-bold md:text-6xl lg:text-7xl leading-tight" style={{ color: 'var(--foreground)' }}>
            Explore how variance<br />hits your bankroll
          </h1>
        </header>

        <section className="grid gap-10 lg:grid-cols-[340px_1fr]">
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-muted)' }}>Game mode</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleMachineChange('slot')}
                  className="pressable group relative px-6 py-4 text-left rounded-3xl"
                  style={{ color: machine === 'slot' ? 'var(--foreground)' : 'var(--text-muted)' }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: machine === 'slot'
                        ? 'linear-gradient(to bottom right, rgba(124, 58, 237, 0.2), rgba(99, 102, 241, 0.2))'
                        : 'var(--surface-bg)',
                      borderWidth: machine === 'slot' ? '0px' : '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--border-color)',
                      boxShadow: machine === 'slot'
                        ? '0 0 50px -12px rgba(124, 58, 237, 0.5)'
                        : 'none'
                    }}
                  />
                  <span className="relative block text-sm font-bold uppercase tracking-wider">
                    Poker machine
                  </span>
                </button>

                <button
                  onClick={() => handleMachineChange('roulette')}
                  className="pressable group relative px-6 py-4 text-left rounded-3xl"
                  style={{ color: machine === 'roulette' ? 'var(--foreground)' : 'var(--text-muted)' }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: machine === 'roulette'
                        ? 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))'
                        : 'var(--surface-bg)',
                      borderWidth: machine === 'roulette' ? '0px' : '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--border-color)',
                      boxShadow: machine === 'roulette'
                        ? '0 0 50px -12px rgba(16, 185, 129, 0.5)'
                        : 'none'
                    }}
                  />
                  <span className="relative block text-sm font-bold uppercase tracking-wider">
                    Roulette wheel
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t pt-8 theme-border">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] theme-text-muted mb-4">
                Simulation runs
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest theme-text-muted">1</span>
                  <span className="text-2xl font-bold theme-text tabular-nums">
                    {runCount.toLocaleString()}
                  </span>
                  <span className="text-xs uppercase tracking-widest theme-text-muted">1000</span>
                </div>
                <input
                  className="slider-custom mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-violet-500"
                  style={{ background: 'var(--slider-track)' }}
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  step={1}
                  value={runSliderPosition}
                  onChange={(event) => handleSetRunCount(Number(event.target.value))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleReroll}
                    className="pressable rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-violet), rgba(124, 58, 237, 0.75))',
                      color: '#ffffff',
                      boxShadow: '0 15px 35px rgba(124, 58, 237, 0.25)',
                    }}
                  >
                    ↻ Rerun
                  </button>
                  <button
                    onClick={handleRemoveAll}
                    className="pressable rounded-2xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider theme-border hover:bg-[var(--surface-hover)]"
                    style={{
                      background: 'var(--surface-bg)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] theme-text-muted mb-4">
                Spins per run
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest theme-text-muted">1</span>
                  <span className="text-2xl font-bold theme-text tabular-nums">
                    {settings.spins}
                  </span>
                  <span className="text-xs uppercase tracking-widest theme-text-muted">1000</span>
                </div>
                <input
                  className="slider-custom h-1.5 w-full cursor-pointer appearance-none rounded-full accent-indigo-500"
                  style={{ background: 'var(--slider-track)' }}
                  type="range"
                  min={1}
                  max={1000}
                  step={1}
                  value={settings.spins}
                  onChange={(event) => updateSpins(Number(event.target.value))}
                />
                <div className="flex flex-wrap gap-2">
                  {quickSpinPresets.map((value) => {
                    const isActive = settings.spins === value;
                    return (
                      <button
                        key={value}
                        onClick={() => updateSpins(value)}
                        className="pressable rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-transform duration-150 hover:-translate-y-0.5"
                        style={{
                          background: isActive ? 'var(--accent-violet)' : 'var(--surface-bg)',
                          color: isActive ? 'rgba(255, 255, 255, 0.92)' : 'var(--text-muted)',
                          boxShadow: isActive ? '0 12px 28px rgba(124, 58, 237, 0.2)' : 'none',
                          opacity: isActive ? 0.84 : 1,
                          borderColor: isActive ? 'var(--accent-violet)' : 'var(--border-color)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] theme-text-muted mb-4">
                Bet size
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest theme-text-muted">$1</span>
                  <span className="text-2xl font-bold theme-text tabular-nums">
                    ${settings.betSize}
                  </span>
                  <span className="text-xs uppercase tracking-widest theme-text-muted">$100</span>
                </div>
                <input
                  className="slider-custom h-1.5 w-full cursor-pointer appearance-none rounded-full accent-amber-500"
                  style={{ background: 'var(--slider-track)' }}
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
              <div className="border-t pt-8 theme-border">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] theme-text-muted mb-4">
                  Volatility profile
                </h3>
                <div className="flex flex-col gap-3">
                  {(Object.keys(slotProfileLabels) as SlotProfile[]).map(
                    (profile, index) => {
                      const isActive = settings.machine === 'slot' && settings.profile === profile;
                      return (
                        <button
                          key={profile}
                          onClick={() => updateSlotProfile(profile)}
                          className="pressable relative flex items-start gap-3 overflow-hidden rounded-2xl border px-5 py-4 text-left transition-transform duration-150 hover:-translate-y-0.5"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(79, 70, 229, 0.25))'
                              : 'var(--surface-bg)',
                            color: isActive ? 'var(--foreground)' : 'var(--text-muted)',
                            borderColor: isActive ? 'rgba(124, 58, 237, 0.35)' : 'var(--border-color)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            boxShadow: isActive ? '0 18px 40px rgba(124, 58, 237, 0.25)' : 'none',
                          }}
                        >
                          <span
                            className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: colorForIndex(index),
                              boxShadow: `0 0 16px ${hexToRgba(colorForIndex(index), 0.5)}`,
                            }}
                            aria-hidden
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold uppercase tracking-wide">
                              {slotProfileLabels[profile]}
                            </span>
                            <p className="mt-1 text-xs theme-text-muted">
                              {profile === 'steady' &&
                                'Frequent small wins, gentle drawdowns.'}
                              {profile === 'balanced' &&
                                'Casino-style balance of hits and swings.'}
                              {profile === 'volatile' &&
                                'Long droughts chasing monster jackpots.'}
                            </p>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {machine === 'roulette' && (
              <div className="border-t pt-8 theme-border">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] theme-text-muted mb-4">
                  Bet structure
                </h3>
                <div className="space-y-3">
                  {(Object.keys(rouletteBets) as RouletteBet[]).map(
                    (betKey, index) => {
                      const bet = rouletteBets[betKey];
                      const isActive =
                        settings.machine === 'roulette' && settings.bet === betKey;
                      return (
                        <button
                          key={betKey}
                          onClick={() => updateRouletteBet(betKey)}
                          className="pressable relative flex items-start gap-3 overflow-hidden rounded-2xl border px-5 py-4 text-left transition-transform duration-150 hover:-translate-y-0.5"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(45, 212, 191, 0.24))'
                              : 'var(--surface-bg)',
                            color: isActive ? 'var(--foreground)' : 'var(--text-muted)',
                            borderColor: isActive ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            boxShadow: isActive ? '0 18px 40px rgba(16, 185, 129, 0.25)' : 'none',
                          }}
                        >
                          <span
                            className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: colorForIndex(index),
                              boxShadow: `0 0 16px ${hexToRgba(colorForIndex(index), 0.45)}`,
                            }}
                            aria-hidden
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold uppercase tracking-wide">{bet.label}</span>
                            <p className="mt-1 text-xs theme-text-muted">
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

          <div className="flex flex-col gap-8">
            <div className="relative overflow-hidden rounded-2xl theme-card">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(251, 191, 36, 0.08))'
                      : 'linear-gradient(135deg, rgba(254, 240, 138, 0.35), rgba(253, 224, 71, 0.15))',
                }}
              />
              <div className="relative flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20 text-2xl font-bold text-yellow-300 shadow-[0_0_30px_-10px_rgba(250,204,21,0.6)]">
                    Σ
                  </span>
                  <div>
                    <h3 className="text-lg font-bold theme-text">
                      Total payout outlook
                    </h3>
                    <p className="text-xs uppercase tracking-[0.3em] theme-text-muted">
                      {runCount} {runLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-[0.3em] theme-text-muted">
                    Total final payout
                  </span>
                  <p
                    className={`mt-1.5 text-4xl font-black tabular-nums ${totalFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {totalFinal >= 0 ? '+' : '−'}${Math.abs(totalFinal).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative h-[440px] w-full overflow-hidden rounded-3xl border theme-border"
              style={{
                background: chartBackground,
                boxShadow: chartShadow,
              }}
            >
              {isVisualizationPaused && (
                <div className="pointer-events-none absolute top-6 right-6 z-10 flex items-center gap-2 bg-amber-400/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-300 shadow-[0_0_40px_-12px_rgba(251,191,36,0.5)] backdrop-blur-sm rounded-full">
                  <span aria-hidden>⏸</span>
                  <span>Graph paused at 100 runs</span>
                </div>
              )}
              <div className="absolute inset-0 p-6">
                <Line options={chartOptions} data={chartData} />
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 run-scroll">
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
                    className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-4 text-xs sm:text-sm theme-border"
                    style={{
                      background: shouldFadeRuns
                        ? 'var(--surface-bg)'
                        : 'var(--surface-alt)',
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{
                        background: `linear-gradient(180deg, ${run.color}, ${hexToRgba(run.color, 0.3)})`,
                        boxShadow: `0 0 20px ${hexToRgba(run.color, 0.4)}`
                      }}
                    />
                    <div className="relative flex items-center gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] theme-text">
                          {run.name}
                        </p>
                        <p className="text-xs font-mono theme-text-muted">
                          σ {summary.volatility.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 theme-text-muted text-xs">
                      <span
                        className={`font-bold tabular-nums ${finalPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {finalPositive ? '+' : '−'}${Math.abs(summary.finalNet).toFixed(2)}
                      </span>
                      <span className="theme-text-muted">Wins {winRate.toFixed(1)}%</span>
                      <span className="theme-text-muted">Loss {lossRate.toFixed(1)}%</span>
                      <span className="theme-text-muted">Peak ${summary.peak.toFixed(2)}</span>
                      <span className="theme-text-muted">DD −${Math.abs(summary.trough).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              {tailSummary && (
                <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-dashed px-5 py-4 text-xs sm:text-sm theme-border">
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'var(--surface-bg)',
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(124, 58, 237, 0.08) 10px, rgba(124, 58, 237, 0.08) 20px)',
                    }}
                  />
                  <div className="relative flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] theme-text-muted">
                      +{tailSummary.count} aggregated runs (not visualized)
                    </span>
                    <span className="mt-1 text-sm font-bold theme-text tabular-nums">
                      Total {tailSummary.totalFinal >= 0 ? '+' : '−'}${Math.abs(tailSummary.totalFinal).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative flex items-center gap-5 text-xs theme-text-muted">
                    <span>Wins {tailSummary.winRate.toFixed(1)}%</span>
                    <span>Loss {tailSummary.lossRate.toFixed(1)}%</span>
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
