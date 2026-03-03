import React from 'react';
import { MartialArtConfig } from '../types';

interface ConfigPanelProps {
  arts: MartialArtConfig[];
  setArts: React.Dispatch<React.SetStateAction<MartialArtConfig[]>>;
  speed: number;
  setSpeed: (val: number) => void;
  reduction: number;
  setReduction: (val: number) => void;
  targetType: 'zhenyuan' | 'time' | 'level';
  setTargetType: (val: 'zhenyuan' | 'time' | 'level') => void;
  targetValue: number;
  setTargetValue: (val: number) => void;
  referenceArtId: string | undefined;
  setReferenceArtId: (val: string) => void;
  strategy: 'dp' | 'greedy';
  setStrategy: (val: 'dp' | 'greedy') => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  arts,
  setArts,
  speed,
  setSpeed,
  reduction,
  setReduction,
  targetType,
  setTargetType,
  targetValue,
  setTargetValue,
  referenceArtId,
  setReferenceArtId,
  strategy,
  setStrategy,
  onCalculate,
  isCalculating
}) => {

  const addArt = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setShowArtList(true);
    setLastAddedArtId(newId);
    setArts([...arts, { id: newId, difficulty: 1.2, isMain: false, targetLevel: 99, count: 1, isLocked: false, lockedLevel: 99 }]);
  };

  const removeArt = (id: string) => {
    const newArts = arts.filter(a => a.id !== id);
    setArts(newArts);
    if (referenceArtId === id) {
        if (newArts.length > 0) {
            setReferenceArtId(newArts[0].id);
        } else {
            setReferenceArtId('');
            if (targetType === 'level') setTargetType('zhenyuan');
        }
    }
  };

  const updateArt = (id: string, field: keyof MartialArtConfig, value: any) => {
    setArts(arts.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  React.useEffect(() => {
      if (targetType === 'level' && !referenceArtId && arts.length > 0) {
          setReferenceArtId(arts[0].id);
      }
  }, [targetType, arts, referenceArtId, setReferenceArtId]);

  const [showArtList, setShowArtList] = React.useState(true);
  const [artFilter, setArtFilter] = React.useState<'all' | 'main' | 'sub' | 'locked'>('all');
  const artListRef = React.useRef<HTMLDivElement | null>(null);
  const [lastAddedArtId, setLastAddedArtId] = React.useState<string | null>(null);

  const artStats = React.useMemo(() => {
    const main = arts.filter((art) => art.isMain).length;
    const sub = arts.length - main;
    const locked = arts.filter((art) => art.isLocked).length;
    return { total: arts.length, main, sub, locked };
  }, [arts]);

  const filteredArts = React.useMemo(() => {
    switch (artFilter) {
      case 'main':
        return arts.filter((art) => art.isMain);
      case 'sub':
        return arts.filter((art) => !art.isMain);
      case 'locked':
        return arts.filter((art) => art.isLocked);
      default:
        return arts;
    }
  }, [arts, artFilter]);

  React.useEffect(() => {
    if (!lastAddedArtId) return;
    if (!showArtList) return;

    // 如果当前筛选看不到新条目，则不进行滚动，避免滚动到“无意义”的位置
    if (!filteredArts.some((a) => a.id === lastAddedArtId)) {
      setLastAddedArtId(null);
      return;
    }

    const raf = requestAnimationFrame(() => {
      const container = artListRef.current;
      if (!container) return;

      const el = container.querySelector(`[data-art-id="${lastAddedArtId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }

      setLastAddedArtId(null);
    });

    return () => cancelAnimationFrame(raf);
  }, [filteredArts, lastAddedArtId, showArtList]);

  return (
    <div className="bg-game-panel p-4 rounded-lg shadow-sm flex flex-col gap-6 md:h-full md:overflow-y-auto custom-scrollbar">
      <div>
        <h2 className="text-xl font-bold text-game-highlight mb-4 flex items-center gap-2">
          <span>⚙️</span> 修炼配置
        </h2>
        
        {/* Global Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 mb-6">
          <div>
            <label className="block text-sm text-game-muted mb-1">修炼速度 (值/小时)</label>
            <input 
              type="number" 
              value={speed}
              step={1000}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full bg-game-dark border border-game-border rounded px-3 py-2 focus:border-game-accent outline-none text-game-text font-mono transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-game-muted mb-1">突破减免 (%)</label>
            <input 
              type="number" 
              value={reduction}
              step={5}
              min={0}
              max={100}
              onChange={(e) => setReduction(Number(e.target.value))}
              className="w-full bg-game-dark border border-game-border rounded px-3 py-2 focus:border-game-accent outline-none text-game-text font-mono transition-colors"
            />
          </div>
        </div>

        <hr className="border-game-border mb-6" />

        {/* Optimization Strategy */}
        <div className="mb-6">
           <label className="block text-sm text-game-muted mb-2">优化策略</label>
           <div className="flex bg-game-dark rounded p-1 border border-game-border">
             <button
                className={`flex-1 py-2 rounded text-xs transition-all ${strategy === 'greedy' ? 'bg-game-success/20 text-game-success border border-game-success/50 font-bold' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setStrategy('greedy')}
                title="均衡算法：每次选择当前效率最高的升级项"
             >
               均衡 (推荐)
             </button>
             <button
                className={`flex-1 py-2 rounded text-xs transition-all ${strategy === 'dp' ? 'bg-game-accent/20 text-game-accent border border-game-accent/50 font-bold' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setStrategy('dp')}
                title="极限算法：寻找理论最短时间"
             >
               极限 (DP)
             </button>
           </div>
        </div>

        <hr className="border-game-border mb-6" />

        {/* Target Settings */}
        <div className="space-y-4 mb-6">
           <h3 className="text-lg font-semibold text-game-warning flex items-center gap-2">
             <span>🎯</span> 目标设定
           </h3>
           <div className="grid grid-cols-3 bg-game-dark rounded p-1 border border-game-border">
             <button 
                className={`py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'zhenyuan' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('zhenyuan')}
             >
               真元
             </button>
             <button 
                className={`py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'time' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('time')}
             >
               时间
             </button>
             <button 
                className={`py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'level' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('level')}
             >
               等级
             </button>
           </div>
           
           {targetType === 'level' ? (
               <div className="space-y-3 p-3 bg-game-panel rounded border border-game-border">
                   <div>
                       <label className="block text-xs text-game-muted mb-1">基准武学</label>
                       <select
                         value={referenceArtId || ''}
                         onChange={(e) => setReferenceArtId(e.target.value)}
                         className="w-full bg-game-dark border border-game-border rounded px-2 py-2 text-game-text text-sm focus:border-game-accent outline-none"
                       >
                           {arts.map((art) => (
                               <option key={art.id} value={art.id}>
                                   {art.isMain ? '★' : '☆'} 难度 {art.difficulty.toFixed(1)} (x{art.count})
                               </option>
                           ))}
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs text-game-muted mb-1">目标等级</label>
                       <input
                         type="number"
                         min={99}
                         max={599}
                         step={10}
                         value={targetValue}
                         onChange={(e) => setTargetValue(Number(e.target.value))}
                         className="w-full bg-game-dark border border-game-border rounded px-3 py-2 focus:border-game-accent outline-none text-game-text font-mono text-lg transition-colors"
                       />
                   </div>
               </div>
            ) : (
              <div>
                <label className="block text-sm text-game-muted mb-1">
                  {targetType === 'zhenyuan' ? '预期总真元' : '预期总时间 (小时)'}
                </label>
                <input 
                  type="number" 
                  value={targetValue}
                  step={targetType === 'zhenyuan' ? 1000 : 10}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-3 py-2 focus:border-game-accent outline-none text-game-text font-mono text-lg transition-colors"
                />
              </div>
           )}
        </div>
      </div>

      <hr className="border-game-border" />

      {/* Martial Arts List */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3 gap-2">
           <h3 className="text-lg font-semibold text-game-success flex items-center gap-2">
             <span>📚</span> 武学列表
           </h3>
           <div className="flex items-center gap-2">
             <button
               onClick={() => setShowArtList((v) => !v)}
               className="text-xs bg-game-panel border border-game-border hover:border-game-accent text-game-text px-3 py-2 rounded transition-colors font-bold"
             >
               {showArtList ? '收起' : '展开'}
             </button>
             <button onClick={addArt} className="text-xs bg-game-accent hover:opacity-80 text-white px-4 py-2 rounded transition-colors font-bold shadow-sm">
               + 添加
             </button>
           </div>
        </div>

        {showArtList && (
          <>
            <div className="grid grid-cols-4 bg-game-dark rounded p-1 border border-game-border mb-3 text-xs">
              <button
                className={`py-1.5 rounded transition-colors ${artFilter === 'all' ? 'bg-game-accent text-white' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setArtFilter('all')}
              >
                全部({artStats.total})
              </button>
              <button
                className={`py-1.5 rounded transition-colors ${artFilter === 'main' ? 'bg-game-warning/20 text-game-warning border border-game-warning/50' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setArtFilter('main')}
              >
                主武({artStats.main})
              </button>
              <button
                className={`py-1.5 rounded transition-colors ${artFilter === 'sub' ? 'bg-game-panel text-game-text border border-game-border' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setArtFilter('sub')}
              >
                副武({artStats.sub})
              </button>
              <button
                className={`py-1.5 rounded transition-colors ${artFilter === 'locked' ? 'bg-game-success/20 text-game-success border border-game-success/50' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setArtFilter('locked')}
              >
                锁定({artStats.locked})
              </button>
            </div>

            <div ref={artListRef} className="space-y-3 max-h-[52vh] md:max-h-none overflow-y-auto pr-1 custom-scrollbar">
              {filteredArts.map((art) => (
                <div
                    key={art.id}
                    data-art-id={art.id}
                    className={`bg-game-dark p-3 rounded border flex flex-col gap-3 relative group transition-all ${
                        targetType === 'level' && referenceArtId === art.id
                        ? 'border-game-accent ring-1 ring-game-accent shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                        : 'border-game-border'
                    }`}
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider block text-game-muted mb-1">难度</label>
                      <select
                        value={art.difficulty}
                        onChange={(e) => updateArt(art.id, 'difficulty', Number(e.target.value))}
                        className="w-full bg-game-panel text-sm rounded border border-game-border px-2 py-1.5 text-game-text focus:border-game-accent outline-none"
                      >
                        {[1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0].map(d => (
                          <option key={d} value={d}>{d.toFixed(1)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider block text-game-muted mb-1">数量</label>
                      <input
                        type="number"
                        min={1}
                        value={art.count}
                        onChange={(e) => updateArt(art.id, 'count', Number(e.target.value))}
                        className="w-full bg-game-panel text-sm rounded border border-game-border px-2 py-1.5 text-game-text focus:border-game-accent outline-none"
                      />
                    </div>

                    <button
                      onClick={() => removeArt(art.id)}
                      className="text-game-muted hover:text-game-danger p-2 h-[34px] flex items-center justify-center rounded hover:bg-game-panel transition-colors"
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <label className={`text-xs cursor-pointer flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors select-none ${art.isMain ? 'bg-game-warning/10 border-game-warning text-game-warning' : 'bg-game-panel border-game-border text-game-muted'}`}>
                      <input
                        type="checkbox"
                        checked={art.isMain}
                        onChange={(e) => updateArt(art.id, 'isMain', e.target.checked)}
                        className="hidden"
                      />
                      <span className="font-bold whitespace-nowrap">
                        {art.isMain ? "★ 主武学" : "☆ 副武学"}
                      </span>
                    </label>

                    <div className="flex items-center gap-1 flex-1">
                      <button
                        onClick={() => updateArt(art.id, 'isLocked', !art.isLocked)}
                        className={`px-2 py-1.5 rounded border transition-colors text-xs font-bold whitespace-nowrap ${art.isLocked ? 'bg-game-accent text-white border-game-accent' : 'bg-game-panel text-game-muted border-game-border hover:text-game-text'}`}
                        title={art.isLocked ? "点击解锁" : "点击锁定等级"}
                      >
                        {art.isLocked ? '🔒 ' : '🔓 '}
                      </button>

                      {art.isLocked && (
                        <input
                          type="number"
                          min={99}
                          max={599}
                          step={10}
                          value={art.lockedLevel || 99}
                          onChange={(e) => updateArt(art.id, 'lockedLevel', Number(e.target.value))}
                          className="w-20 bg-game-panel text-sm rounded border border-game-border px-2 py-1.5 text-game-text focus:border-game-accent outline-none"
                          placeholder="等级"
                        />
                      )}

                      {targetType === 'level' && referenceArtId !== art.id && !art.isLocked && (
                        <button
                          onClick={() => setReferenceArtId(art.id)}
                          className="text-xs text-game-accent underline hover:text-white ml-auto px-2 whitespace-nowrap"
                        >
                          设为基准
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredArts.length === 0 && (
                <div className="text-xs text-game-muted italic text-center py-4 bg-game-dark border border-game-border rounded">
                  当前筛选下没有武学
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="pt-6 sticky bottom-0 bg-game-panel border-t border-game-border z-10 -mx-4 px-4 pb-2 md:pb-0">
        <button 
          onClick={onCalculate}
          disabled={isCalculating}
          className="w-full bg-gradient-to-r from-game-success to-emerald-600 hover:brightness-110 text-white font-bold py-4 rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isCalculating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              正在计算...
            </>
          ) : (
            '🚀 开始计算'
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
