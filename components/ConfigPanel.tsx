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
  onCalculate,
  isCalculating
}) => {

  const addArt = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setArts([...arts, { id: newId, difficulty: 1.2, isMain: false, targetLevel: 99, count: 1 }]);
  };

  const removeArt = (id: string) => {
    const newArts = arts.filter(a => a.id !== id);
    setArts(newArts);
    if (referenceArtId === id) {
        // If we removed the reference art, try to set a new one or clear it
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

  // Ensure referenceArtId is valid
  React.useEffect(() => {
      if (targetType === 'level' && !referenceArtId && arts.length > 0) {
          setReferenceArtId(arts[0].id);
      }
  }, [targetType, arts, referenceArtId, setReferenceArtId]);

  return (
    <div className="bg-game-panel p-4 rounded-lg shadow-sm flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
      <div>
        <h2 className="text-xl font-bold text-game-highlight mb-4 flex items-center gap-2">
          <span>⚙️</span> 修炼配置
        </h2>
        
        {/* Global Settings */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-game-muted mb-1">修炼速度 (修炼值/小时)</label>
            <input 
              type="number" 
              value={speed}
              step={1000}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full bg-game-dark border border-game-border rounded px-3 py-2 focus:border-game-accent outline-none text-game-text font-mono transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-game-muted mb-1">突破时间减免 (%)</label>
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

        {/* Target Settings */}
        <div className="space-y-4 mb-6">
           <h3 className="text-lg font-semibold text-game-warning flex items-center gap-2">
             <span>🎯</span> 目标设定
           </h3>
           <div className="flex bg-game-dark rounded p-1 border border-game-border flex-wrap">
             <button 
                className={`flex-1 py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'zhenyuan' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('zhenyuan')}
             >
               目标真元
             </button>
             <button 
                className={`flex-1 py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'time' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('time')}
             >
               目标时间
             </button>
             <button 
                className={`flex-1 py-2 px-1 rounded text-xs sm:text-sm transition-all font-medium ${targetType === 'level' ? 'bg-game-accent text-white shadow' : 'text-game-muted hover:text-game-text'}`}
                onClick={() => setTargetType('level')}
             >
               指定等级
             </button>
           </div>
           
           {targetType === 'level' ? (
              <div className="space-y-3 p-3 bg-gray-800/30 rounded border border-gray-700/50">
                  <div>
                      <label className="block text-xs text-game-muted mb-1">基准武学 (以此为参照)</label>
                      <select 
                        value={referenceArtId || ''}
                        onChange={(e) => setReferenceArtId(e.target.value)}
                        className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm focus:border-game-accent outline-none"
                      >
                          {arts.map((art, idx) => (
                              <option key={art.id} value={art.id}>
                                  {art.isMain ? '★' : '☆'} 难度 {art.difficulty.toFixed(1)} (x{art.count})
                              </option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs text-game-muted mb-1">目标等级 (Ending in 9)</label>
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
                  <p className="text-[10px] text-gray-500 leading-tight">
                      系统将计算该武学达到此等级时的效率，并寻找其他武学的最佳匹配等级。
                  </p>
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
        <div className="flex justify-between items-center mb-3">
           <h3 className="text-lg font-semibold text-game-success flex items-center gap-2">
             <span>📚</span> 武学列表
           </h3>
           <button onClick={addArt} className="text-xs bg-game-accent hover:opacity-80 text-white px-3 py-1.5 rounded transition-colors font-bold shadow-sm">
             + 添加
           </button>
        </div>
        
        <div className="space-y-3">
          {arts.map((art) => (
            <div 
                key={art.id} 
                className={`bg-game-dark p-3 rounded border flex flex-col gap-3 relative group transition-all ${
                    targetType === 'level' && referenceArtId === art.id 
                    ? 'border-game-accent ring-1 ring-game-accent shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                    : 'border-game-border hover:border-game-muted'
                }`}
            >
               <button 
                onClick={() => removeArt(art.id)}
                className="absolute top-2 right-2 text-game-muted hover:text-game-danger p-1 opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 ✕
               </button>
               
               {targetType === 'level' && referenceArtId === art.id && (
                   <div className="absolute top-0 right-8 bg-game-accent text-[9px] text-white px-2 py-0.5 rounded-b font-bold shadow-sm">
                       基准
                   </div>
               )}

               <div className="flex gap-3">
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
               </div>

               <div className="flex items-center gap-2">
                 <label className={`text-xs cursor-pointer flex items-center gap-2 px-2 py-1 rounded border transition-colors select-none ${art.isMain ? 'bg-game-warning/10 border-game-warning text-game-warning' : 'bg-game-panel border-game-border text-game-muted'}`}>
                   <input 
                    type="checkbox" 
                    checked={art.isMain}
                    onChange={(e) => updateArt(art.id, 'isMain', e.target.checked)}
                    className="hidden"
                   />
                   <span className="font-bold">
                     {art.isMain ? "★ 主武学" : "☆ 副武学"}
                   </span>
                 </label>
                 
                 {targetType === 'level' && referenceArtId !== art.id && (
                     <button 
                        onClick={() => setReferenceArtId(art.id)}
                        className="text-[10px] text-game-accent underline hover:text-white ml-auto"
                     >
                         设为基准
                     </button>
                 )}
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 sticky bottom-0 bg-game-panel border-t border-game-border z-10">
        <button 
          onClick={onCalculate}
          disabled={isCalculating}
          className="w-full bg-gradient-to-r from-game-success to-emerald-600 hover:brightness-110 text-white font-bold py-3 rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
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
            '🚀 计算'
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;