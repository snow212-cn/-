import React, { useState, useMemo } from 'react';
import { getStepCost, getZhenyuan } from '../utils/math';
import { OptimizationResult } from '../types';

interface ZhenyuanTableProps {
  speed: number;
  reduction: number;
  optimizationResult: OptimizationResult | null;
  userArts: { id: string; difficulty: number; isMain: boolean; count: number }[];
}

const ZhenyuanTable: React.FC<ZhenyuanTableProps> = ({ speed, reduction, optimizationResult, userArts }) => {
  // Filters
  const [minLevel, setMinLevel] = useState(99);
  const [maxLevel, setMaxLevel] = useState(489);
  const [minDiff, setMinDiff] = useState(1.1);
  const [maxDiff, setMaxDiff] = useState(2.0);

  // Generate all possible levels and difficulties first
  const allLevels = useMemo(() => {
    const l = [];
    for (let i = 99; i <= 489; i += 10) l.push(i);
    return l;
  }, []);
  
  const allDifficulties = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];

  // Filtered Lists
  const visibleLevels = allLevels.filter(l => l >= minLevel && l <= maxLevel);
  const visibleDifficulties = allDifficulties.filter(d => d >= minDiff && d <= maxDiff);

  // Precompute cell data for visible range to determine Heatmap Scale
  const { cellDataMap, maxEff, minEff } = useMemo(() => {
    let max = 0;
    let min = Infinity;
    const map = new Map<string, number>();

    visibleLevels.forEach(level => {
      visibleDifficulties.forEach(diff => {
        // Efficiency = (Zhenyuan at L+10 - Zhenyuan at L) / Cost to go L->L+10
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

  // Color Interpolation for Heatmap
  const getHeatColor = (value: number) => {
    if (maxEff === minEff) return 'transparent';
    const ratio = (value - minEff) / (maxEff - minEff);
    // Gradient: Low (Blue/240) -> High (Red/0)
    // We limit the range slightly to avoid unreadable dark blues or too bright reds if needed
    // Hue: 240 (Blue) -> 120 (Green) -> 60 (Yellow) -> 0 (Red)
    const hue = 240 * (1 - ratio); 
    return `hsla(${hue}, 70%, 25%, 0.6)`; // Darker background for text contrast
  };

  // Determine if a cell is "Selected" in the optimal solution
  const getOptimalInfo = (level: number, diff: number) => {
    if (!optimizationResult) return { count: 0, type: '' };
    
    let count = 0;
    let type = ''; 

    userArts.forEach(ua => {
        // Float comparison check
        if (Math.abs(ua.difficulty - diff) < 0.001) {
            for(let i=0; i<ua.count; i++) {
                const tempId = `${ua.id}_${i}`;
                const finalLvl = optimizationResult.arts[tempId];
                if (finalLvl === level) {
                    count++;
                    if (!type) type = ua.isMain ? 'main' : 'sub';
                    else if (type === 'main' && !ua.isMain) type = 'mixed';
                    else if (type === 'sub' && ua.isMain) type = 'mixed';
                }
            }
        }
    });

    return { count, type };
  };

  return (
    <div className="bg-game-panel rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700">
      {/* Header & Controls */}
      <div className="p-3 border-b border-gray-700 bg-game-dark flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-game-highlight flex items-center gap-2">
                 📊 效率热力图 
                 <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                    值 = 真元/小时
                 </span>
              </h2>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-game-warning rounded-sm shadow-[0_0_5px_rgba(224,175,104,0.8)]"></div> 主武学</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-game-accent rounded-sm shadow-[0_0_5px_rgba(122,162,247,0.8)]"></div> 副武学</div>
            </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 text-xs items-center bg-gray-800/50 p-2 rounded border border-gray-700/50">
            <div className="flex items-center gap-2">
                <span className="text-gray-400">等级范围:</span>
                <select 
                    value={minLevel} 
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMinLevel(v);
                        if(v > maxLevel) setMaxLevel(v);
                    }}
                    className="bg-game-dark border border-gray-600 rounded px-1 py-0.5 text-white outline-none focus:border-game-accent"
                >
                    {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-gray-500">-</span>
                <select 
                    value={maxLevel} 
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMaxLevel(v);
                        if(v < minLevel) setMinLevel(v);
                    }}
                    className="bg-game-dark border border-gray-600 rounded px-1 py-0.5 text-white outline-none focus:border-game-accent"
                >
                    {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>

            <div className="w-px h-4 bg-gray-700"></div>

            <div className="flex items-center gap-2">
                <span className="text-gray-400">难度范围:</span>
                <select 
                    value={minDiff} 
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMinDiff(v);
                        if(v > maxDiff) setMaxDiff(v);
                    }}
                    className="bg-game-dark border border-gray-600 rounded px-1 py-0.5 text-white outline-none focus:border-game-accent"
                >
                    {allDifficulties.map(d => <option key={d} value={d}>{d.toFixed(1)}</option>)}
                </select>
                <span className="text-gray-500">-</span>
                <select 
                    value={maxDiff} 
                    onChange={e => {
                        const v = Number(e.target.value);
                        setMaxDiff(v);
                        if(v < minDiff) setMinDiff(v);
                    }}
                    className="bg-game-dark border border-gray-600 rounded px-1 py-0.5 text-white outline-none focus:border-game-accent"
                >
                    {allDifficulties.map(d => <option key={d} value={d}>{d.toFixed(1)}</option>)}
                </select>
            </div>
        </div>
      </div>
      
      {/* Table Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-[#16161e]">
        <table className="w-full text-center text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-game-panel shadow-md ring-1 ring-gray-700/50">
            <tr>
              <th className="p-3 border-b border-gray-700 bg-game-panel sticky left-0 z-30 w-20 text-gray-300 font-bold border-r shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)]">
                等级<br/><span className="text-[10px] font-normal text-gray-500">起点</span>
              </th>
              {visibleDifficulties.map(d => (
                <th key={d} className="p-2 border-b border-gray-700 min-w-[60px] font-medium text-gray-300 border-r border-gray-800/50 last:border-0">
                    {d.toFixed(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleLevels.map(level => (
              <tr key={level} className="group">
                {/* Row Header */}
                <th className="p-2 border-r border-b border-gray-700 bg-game-panel sticky left-0 z-10 text-gray-400 font-mono text-right pr-4 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:text-white transition-colors">
                  {level}
                </th>
                
                {/* Data Cells */}
                {visibleDifficulties.map(d => {
                  const eff = cellDataMap.get(`${level}-${d}`) || 0;
                  const { count, type } = getOptimalInfo(level, d);
                  
                  // Styles based on State
                  const isOptimal = count > 0;
                  const heatColor = getHeatColor(eff);
                  
                  let cellClass = "border-b border-r border-gray-800/50 relative transition-all duration-200";
                  let contentClass = "opacity-70 group-hover:opacity-100 transition-opacity";
                  let badge = null;

                  if (isOptimal) {
                      cellClass += " z-0"; // Ensure it's above non-optimal
                      contentClass = "font-bold text-white drop-shadow-md";
                      
                      const borderColor = type === 'main' ? 'border-game-warning' : type === 'sub' ? 'border-game-accent' : 'border-purple-500';
                      const glowColor = type === 'main' ? 'rgba(224,175,104,0.3)' : type === 'sub' ? 'rgba(122,162,247,0.3)' : 'rgba(168,85,247,0.3)';
                      const badgeBg = type === 'main' ? 'bg-game-warning' : type === 'sub' ? 'bg-game-accent' : 'bg-purple-500';
                      
                      // Highlight effect
                      badge = (
                        <>
                            <div className={`absolute inset-0 border-2 ${borderColor} z-10 pointer-events-none shadow-[inset_0_0_10px_${glowColor}]`}></div>
                            <div className={`absolute top-0 right-0 ${badgeBg} text-game-dark text-[9px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-bl shadow-md z-20 leading-none`}>
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
                      <div className={`relative p-2 ${contentClass}`}>
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
