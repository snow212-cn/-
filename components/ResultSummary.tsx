import React from 'react';
import { OptimizationResult } from '../types';

interface ResultSummaryProps {
  result: OptimizationResult | null;
  userArts: { id: string; difficulty: number; isMain: boolean; count: number }[];
}

const ResultSummary: React.FC<ResultSummaryProps> = ({ result, userArts }) => {
  if (!result) return null;

  // Aggregate results
  // We want to show: Main: [Diff 1.5 -> 349], [Diff 2.0 -> 309] ...
  
  const processGroup = (isMain: boolean) => {
    const items: { diff: number, level: number, count: number }[] = [];
    
    userArts.filter(ua => ua.isMain === isMain).forEach(ua => {
        // We need to look at the individual instances in the result
        // Since user might have 2 arts of diff 1.2, they might have different targets (unlikely in pure optimization but possible in theory or future updates)
        // For simple display, let's group by difficulty and level.
        const map = new Map<string, number>(); // key "level", val count
        
        for(let i=0; i<ua.count; i++) {
            const uniqueId = `${ua.id}_${i}`;
            const lvl = result.arts[uniqueId];
            if (lvl) {
                // Key by level
                // We actually want to group by (Difficulty, Level)
                items.push({ diff: ua.difficulty, level: lvl, count: 1 });
            }
        }
    });

    // Consolidate
    const finalDisplay: string[] = [];
    // Sort by Difficulty desc, then Level desc
    items.sort((a, b) => b.diff - a.diff || b.level - a.level);

    // Compress: if multiple same diff same level, say "x2"
    const compressed: { diff: number, level: number, count: number }[] = [];
    items.forEach(item => {
        const existing = compressed.find(c => c.diff === item.diff && c.level === item.level);
        if (existing) existing.count++;
        else compressed.push({ ...item });
    });

    return compressed.map((c, i) => (
        <span key={i} className="inline-flex items-center bg-game-dark border border-game-border rounded px-2 py-0.5 text-xs mr-2 mb-1">
            <span className="text-game-muted mr-1">{c.diff.toFixed(1)}</span>
            <span className="text-game-muted mx-1">→</span>
            <span className={`font-bold font-mono ${isMain ? 'text-game-warning' : 'text-game-accent'}`}>{c.level}级</span>
            {c.count > 1 && <span className="ml-1 text-[10px] text-game-muted">x{c.count}</span>}
        </span>
    ));
  };

  const mainList = processGroup(true);
  const subList = processGroup(false);

  return (
    <div className="bg-game-panel rounded-lg p-3 border border-game-border flex flex-col sm:flex-row gap-4 text-sm animate-in slide-in-from-top-2 duration-300">
        <div className="flex-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-game-warning"></span> 
                主武学推荐方案
            </div>
            <div className="flex flex-wrap">
                {mainList.length > 0 ? mainList : <span className="text-game-muted italic text-xs">无主武学</span>}
            </div>
        </div>
        <div className="w-px bg-game-border hidden sm:block"></div>
        <div className="flex-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-game-accent"></span>
                副武学推荐方案
            </div>
             <div className="flex flex-wrap">
                {subList.length > 0 ? subList : <span className="text-game-muted italic text-xs">无副武学</span>}
            </div>
        </div>
    </div>
  );
};

export default ResultSummary;
