import React, { useState, useMemo, useEffect } from 'react';
import { getStepCost, getZhenyuan } from '../utils/math';
import { OptimizationResult } from '../types';

interface ZhenyuanTableProps {
  speed: number;
  reduction: number;
  optimizationResult: OptimizationResult | null;
  userArts: { id: string; difficulty: number; isMain: boolean; count: number }[];
  /**
   * 用于在“自动列模式”(used/all)下触发一次同步（例如点击“一键规划”时）。
   * 值变化即可触发，无需语义。
   */
  heatmapSyncToken?: number;
}

type DiffSelectionMode = 'manual' | 'used' | 'all';

const ALL_DIFFICULTIES = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
const HEATMAP_STORAGE_KEY = 'zhenyuan_calc_heatmap_state_v1';

const arraysEqual = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const readPersistedHeatmapState = (): { mode?: DiffSelectionMode; selectedDifficulties?: unknown } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HEATMAP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeDifficultyList = (list: unknown): number[] => {
  if (!Array.isArray(list)) return [];
  const set = new Set<number>();
  list.forEach((x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return;
    const rounded = Number(n.toFixed(1));
    if (ALL_DIFFICULTIES.includes(rounded)) set.add(rounded);
  });
  return ALL_DIFFICULTIES.filter((d) => set.has(d));
};

const ZhenyuanTable: React.FC<ZhenyuanTableProps> = ({
  speed,
  reduction,
  optimizationResult,
  userArts,
  heatmapSyncToken
}) => {
  // Filters
  const [minLevel, setMinLevel] = useState(99);
  const [maxLevel, setMaxLevel] = useState(489);

  // 难度列选择模式：
  // - all：始终显示全部列
  // - used：仅显示“已添加武学”涉及到的难度列（当武学列表变化时自动同步）
  // - manual：用户手动勾选列，不自动改动
  const [diffSelectionMode, setDiffSelectionMode] = useState<DiffSelectionMode>(() => {
    const persisted = readPersistedHeatmapState();
    const mode = persisted?.mode;
    if (mode === 'manual' || mode === 'used' || mode === 'all') return mode;

    const used = new Set<number>();
    userArts.forEach((ua) => used.add(Number(ua.difficulty.toFixed(1))));
    return used.size > 0 ? 'used' : 'all';
  });

  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>(() => {
    const persisted = readPersistedHeatmapState();
    const persistedSelected = normalizeDifficultyList(persisted?.selectedDifficulties);
    if (persistedSelected.length > 0) return persistedSelected;

    const used = new Set<number>();
    userArts.forEach((ua) => used.add(Number(ua.difficulty.toFixed(1))));
    const initial = ALL_DIFFICULTIES.filter((d) => used.has(d));
    return initial.length > 0 ? initial : [...ALL_DIFFICULTIES];
  });
  const [diffPanelOpen, setDiffPanelOpen] = useState(false);

  const artDifficulties = useMemo(() => {
    const used = new Set<number>();
    userArts.forEach((ua) => used.add(Number(ua.difficulty.toFixed(1))));
    return ALL_DIFFICULTIES.filter((d) => used.has(d));
  }, [userArts]);

  // 当处于“全部 / 已添加”模式时，只在触发信号（默认：一键规划）时同步一次，避免频繁增删武学时一直跳列
  useEffect(() => {
    if (diffSelectionMode === 'manual') return;

    const next =
      diffSelectionMode === 'all'
        ? [...ALL_DIFFICULTIES]
        : artDifficulties.length
          ? artDifficulties
          : [...ALL_DIFFICULTIES];

    setSelectedDifficulties((prev) => (arraysEqual(prev, next) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapSyncToken, diffSelectionMode]);

  // 持久化热力图难度列状态（刷新/重新打开页面后可恢复）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        HEATMAP_STORAGE_KEY,
        JSON.stringify({ mode: diffSelectionMode, selectedDifficulties })
      );
    } catch {
      // ignore
    }
  }, [diffSelectionMode, selectedDifficulties]);

  const selectedDiffSet = useMemo(() => new Set(selectedDifficulties), [selectedDifficulties]);

  const toggleDifficulty = (d: number) => {
    setDiffSelectionMode('manual');
    setSelectedDifficulties((prev) => {
      const set = new Set(prev);

      if (set.has(d)) {
        // Keep at least one column visible to avoid an empty table
        if (set.size <= 1) return prev;
        set.delete(d);
      } else {
        set.add(d);
      }

      // Keep the column order stable (1.1 -> 2.0)
      return ALL_DIFFICULTIES.filter((x) => set.has(x));
    });
  };

  // Generate all possible levels and difficulties first
  const allLevels = useMemo(() => {
    const l = [];
    for (let i = 99; i <= 589; i += 10) l.push(i);
    return l;
  }, []);

  const minLevelOptions = useMemo(() => allLevels.filter((l) => l <= 489), [allLevels]);
  const maxLevelOptions = useMemo(() => allLevels.filter((l) => l >= 199), [allLevels]);

  // Filtered Lists
  const visibleLevels = allLevels.filter((l) => l >= minLevel && l <= maxLevel);
  const visibleDifficulties = selectedDifficulties;

  // Precompute cell data for visible range to determine Heatmap Scale
  const { cellDataMap, maxEff, minEff } = useMemo(() => {
    let max = 0;
    let min = Infinity;
    const map = new Map<string, number>();

    visibleLevels.forEach(level => {
      visibleDifficulties.forEach(diff => {
        const cost = getStepCost(level, diff, speed, reduction);
        const zCurr = getZhenyuan(level, diff, true);
        const zNext = getZhenyuan(level + 10, diff, true);
        const eff = cost > 0 ? (zNext - zCurr) / cost : 0;
        
        const key = `${level}-${diff}`;
        map.set(key, eff);

        if (eff > max) max = eff;
        if (eff < min) min = eff;
      });
    });

    return { cellDataMap: map, maxEff: max, minEff: min === Infinity ? 0 : min };
  }, [speed, reduction, visibleLevels, visibleDifficulties]);

  const getHeatColor = (value: number) => {
    if (maxEff === minEff) return 'transparent';
    const ratio = (value - minEff) / (maxEff - minEff);
    const hue = 240 * (1 - ratio); 
    return `hsla(${hue}, 70%, 25%, 0.6)`;
  };

  // Precompute optimal markers for O(1) lookup during cell rendering
  const optimalMap = useMemo(() => {
    const map = new Map<string, { count: number; type: 'main' | 'sub' | 'mixed' | '' }>();
    if (!optimizationResult) return map;

    userArts.forEach(ua => {
      for (let i = 0; i < ua.count; i++) {
        const tempId = `${ua.id}_${i}`;
        const finalLvl = optimizationResult.arts[tempId];
        if (finalLvl !== undefined) {
          const key = `${finalLvl}-${ua.difficulty.toFixed(1)}`;
          const existing = map.get(key) || { count: 0, type: '' };
          
          let newType = existing.type;
          const currentType = ua.isMain ? 'main' : 'sub';
          if (!newType) {
            newType = currentType;
          } else if (newType !== currentType && newType !== 'mixed') {
            newType = 'mixed';
          }

          map.set(key, {
            count: existing.count + 1,
            type: newType as any
          });
        }
      }
    });
    return map;
  }, [optimizationResult, userArts]);

  const getOptimalInfo = (level: number, diff: number) => {
    return optimalMap.get(`${level}-${diff.toFixed(1)}`) || { count: 0, type: '' };
  };

  return (
    <div className="bg-game-panel rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-game-border min-h-[360px]">
       {/* Header & Controls */}
       <div className="p-2 sm:p-3 border-b border-game-border bg-game-dark flex flex-col gap-2 sm:gap-3">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-game-highlight flex items-center gap-2">
                 📊 效率热力图
                 {/* Mobile: avoid a big pill; keep it compact */}
                 <span className="sm:hidden text-[10px] font-normal text-game-muted">
                    (真元/小时)
                 </span>
                 {/* Desktop: keep the pill */}
                 <span className="hidden sm:inline text-xs font-normal text-game-muted bg-game-panel px-2 py-0.5 rounded border border-game-border">
                    值 = 真元/小时
                 </span>
              </h2>
            </div>
            <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-game-warning rounded-sm shadow-[0_0_5px_rgba(224,175,104,0.8)]"></div> 主武学</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-game-accent rounded-sm shadow-[0_0_5px_rgba(122,162,247,0.8)]"></div> 副武学</div>
            </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-xs items-center bg-game-panel p-1.5 sm:p-2 rounded border border-game-border">
            <div className="flex items-center gap-2">
                <span className="text-game-muted">等级:</span>
                <select
                    value={minLevel}
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMinLevel(v);
                        if(v > maxLevel) setMaxLevel(v);
                    }}
                    className="bg-game-dark border border-game-border rounded px-1 py-0.5 text-game-text outline-none focus:border-game-accent"
                >
                    {minLevelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-game-muted">-</span>
                <select
                    value={maxLevel}
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMaxLevel(v);
                        if(v < minLevel) setMinLevel(v);
                    }}
                    className="bg-game-dark border border-game-border rounded px-1 py-0.5 text-game-text outline-none focus:border-game-accent"
                >
                    {maxLevelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>

            <div className="hidden sm:block w-px h-4 bg-game-border"></div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-game-muted whitespace-nowrap">难度:</span>

              {/* Mobile: just a compact button; the selector is a fixed bottom-sheet to avoid wasting vertical space */}
              <button
                type="button"
                onClick={() => setDiffPanelOpen(true)}
                className="sm:hidden px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors whitespace-nowrap"
                aria-expanded={diffPanelOpen}
                title="选择要显示的难度列"
              >
                已选 {selectedDifficulties.length}/{ALL_DIFFICULTIES.length}
                <span className="ml-1">▼</span>
              </button>

              {/* Desktop: always show multi-select chips */}
              <div className="hidden sm:flex flex-wrap gap-1">
                {ALL_DIFFICULTIES.map((d) => {
                  const checked = selectedDiffSet.has(d);
                  return (
                    <label key={d} className="cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDifficulty(d)}
                        className="sr-only"
                      />
                      <span
                        className={`inline-flex items-center justify-center min-w-[42px] px-2 py-1 rounded border font-mono transition-colors ${
                          checked
                            ? 'bg-game-accent/20 text-game-accent border-game-accent'
                            : 'bg-game-dark text-game-muted border-game-border hover:text-game-text hover:border-game-accent'
                        }`}
                        title={checked ? '点击隐藏该难度列' : '点击显示该难度列'}
                      >
                        {d.toFixed(1)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setDiffSelectionMode('all');
                    setSelectedDifficulties([...ALL_DIFFICULTIES]);
                  }}
                  className="px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors whitespace-nowrap"
                  title="显示所有难度列"
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiffSelectionMode('used');
                    setSelectedDifficulties(artDifficulties.length ? artDifficulties : [...ALL_DIFFICULTIES]);
                  }}
                  className="px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors whitespace-nowrap"
                  title="仅显示已添加武学对应的难度列"
                >
                  已添加
                </button>
              </div>
            </div>
        </div>

        {/* Mobile difficulty selector (bottom sheet) */}
        {diffPanelOpen && (
          <div className="sm:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDiffPanelOpen(false)}
              aria-hidden="true"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-game-panel border-t border-game-border rounded-t-lg p-3 max-h-[70vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-game-text">选择难度列</div>
                <button
                  type="button"
                  onClick={() => setDiffPanelOpen(false)}
                  className="px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors"
                >
                  关闭
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {ALL_DIFFICULTIES.map((d) => {
                  const checked = selectedDiffSet.has(d);
                  return (
                    <label key={d} className="cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDifficulty(d)}
                        className="sr-only"
                      />
                      <span
                        className={`inline-flex w-full items-center justify-center px-2 py-1 rounded border font-mono transition-colors ${
                          checked
                            ? 'bg-game-accent/20 text-game-accent border-game-accent'
                            : 'bg-game-dark text-game-muted border-game-border'
                        }`}
                      >
                        {d.toFixed(1)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDiffSelectionMode('all');
                      setSelectedDifficulties([...ALL_DIFFICULTIES]);
                    }}
                    className="px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors whitespace-nowrap"
                    title="显示所有难度列"
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiffSelectionMode('used');
                      setSelectedDifficulties(artDifficulties.length ? artDifficulties : [...ALL_DIFFICULTIES]);
                    }}
                    className="px-2 py-1 rounded border border-game-border bg-game-dark text-game-muted hover:text-game-text hover:border-game-accent transition-colors whitespace-nowrap"
                    title="仅显示已添加武学对应的难度列"
                  >
                    已添加
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDiffPanelOpen(false)}
                  className="px-3 py-1 rounded border border-game-accent bg-game-accent/20 text-game-accent hover:text-white hover:bg-game-accent transition-colors whitespace-nowrap"
                >
                  完成
                </button>
              </div>

              <div className="mt-2 text-[10px] text-game-muted">至少保留 1 个难度列</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Table Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-game-dark">
        <table className="w-full text-center text-[9px] sm:text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-game-panel shadow-md ring-1 ring-game-border">
            <tr>
              <th
                className="p-1.5 sm:p-3 border-b border-game-border bg-game-panel sticky left-0 z-30 w-16 sm:w-20 text-game-text font-bold border-r shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)]"
                title="行=等级起点（左侧），列=难度（顶部）"
              >
                <div className="flex flex-col items-center leading-tight">
                  {/* Desktop: keep the original meaning */}
                  <span className="hidden sm:block whitespace-nowrap break-keep">等级</span>
                  <span className="hidden sm:block text-[9px] sm:text-[10px] font-normal text-game-muted whitespace-nowrap break-keep">起点</span>

                  {/* Mobile: avoid per-character wrapping; clarify axes */}
                  <span className="sm:hidden text-[9px] font-normal whitespace-nowrap break-keep">难度 →</span>
                  <span className="sm:hidden text-[9px] font-normal text-game-muted whitespace-nowrap break-keep">等级起点</span>
                </div>
              </th>
              {visibleDifficulties.map(d => (
                <th key={d} className="p-1.5 sm:p-2 border-b border-game-border min-w-[46px] sm:min-w-[60px] font-medium text-game-text border-r border-game-border last:border-0">
                    {d.toFixed(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleLevels.map(level => (
              <tr key={level} className="group">
                <th className="p-1.5 sm:p-2 border-r border-b border-game-border bg-game-panel sticky left-0 z-10 text-game-muted font-mono text-right pr-2 sm:pr-4 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:text-game-text transition-colors">
                  {level}
                </th>
                
                {visibleDifficulties.map(d => {
                  const eff = cellDataMap.get(`${level}-${d}`) || 0;
                  const { count, type } = getOptimalInfo(level, d);
                  const isOptimal = count > 0;
                  const heatColor = getHeatColor(eff);
                  const hasHeat = heatColor !== 'transparent';
                  
                  let cellClass = "border-b border-r border-game-border relative transition-all duration-200";
                  let contentClass = `${hasHeat ? 'text-white' : 'text-game-text'} opacity-70 group-hover:opacity-100 transition-opacity`;
                  let badge = null;

                  if (isOptimal) {
                      cellClass += " z-0";
                      contentClass = "font-bold text-white drop-shadow-md";
                      const borderColor = type === 'main' ? 'border-game-warning' : type === 'sub' ? 'border-game-accent' : 'border-purple-500';
                      const glowColor = type === 'main' ? 'rgba(224,175,104,0.3)' : type === 'sub' ? 'rgba(122,162,247,0.3)' : 'rgba(168,85,247,0.3)';
                      const badgeBg = type === 'main' ? 'bg-game-warning' : type === 'sub' ? 'bg-game-accent' : 'bg-purple-500';
                      
                      badge = (
                        <>
                            <div
                              className={`absolute inset-0 border-2 ${borderColor} z-10 pointer-events-none`}
                              style={{ boxShadow: `inset 0 0 10px ${glowColor}` }}
                            ></div>
                            <div className={`absolute top-0 right-0 ${badgeBg} text-white text-[8px] sm:text-[9px] font-bold px-1 min-w-[14px] sm:min-w-[16px] h-[14px] sm:h-[16px] flex items-center justify-center rounded-bl shadow-md z-20 leading-none`}>
                                {count}
                            </div>
                        </>
                      );
                  }

                  return (
                    <td
                        key={d}
                        className={cellClass}
                        style={{ backgroundColor: heatColor }}
                        title={`等级: ${level} -> ${level+10}\n难度: ${d}\n效率: ${eff.toFixed(1)} 真元/小时`}
                    >
                      {badge}
                      <div className={`relative p-1 sm:p-2 ${contentClass}`}>
                        {Math.round(eff)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ZhenyuanTable;
