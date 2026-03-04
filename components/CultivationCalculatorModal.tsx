import React, { useState, useEffect } from 'react';
import { calculateCultivationSpeed, calculateBreakthroughReduction } from '../utils/math';

interface CultivationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (speed: number, reduction: number) => void;
  initialSpeed?: number;
  initialReduction?: number;
}

const CultivationCalculatorModal: React.FC<CultivationCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [gengu, setGengu] = useState(100);
  const [hasHanyusui, setHasHanyusui] = useState(false);
  const [xiantiangongLevel, setXiantiangongLevel] = useState(0);
  const [daimaiLevel, setDaimaiLevel] = useState(0);
  const [bedBonus, setBedBonus] = useState(0);
  const [hasMonthCard, setHasMonthCard] = useState(false);
  const [sectTitleBonus, setSectTitleBonus] = useState(0);

  const [calculatedSpeed, setCalculatedSpeed] = useState(0);
  const [calculatedReduction, setCalculatedReduction] = useState(0);

  useEffect(() => {
    const speed = calculateCultivationSpeed(gengu, {
      hasHanyusui,
      xiantiangongLevel,
      daimaiLevel,
      bedBonus,
      hasMonthCard,
      sectTitleBonus,
    });
    setCalculatedSpeed(Math.round(speed));

    const reduction = calculateBreakthroughReduction(daimaiLevel);
    setCalculatedReduction(reduction);
  }, [gengu, hasHanyusui, xiantiangongLevel, daimaiLevel, bedBonus, hasMonthCard, sectTitleBonus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-game-panel border border-game-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-game-border bg-game-dark flex justify-between items-center">
          <h3 className="text-lg font-bold text-game-highlight flex items-center gap-2">
            <span>🧮</span> 修炼计算器
          </h3>
          <button onClick={onClose} className="text-game-muted hover:text-white transition-colors">
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-4">
          {/* 修炼速度部分 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-game-accent border-l-2 border-game-accent pl-2">修炼速度计算</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-game-muted mb-1">有效根骨</label>
                <input
                  type="number"
                  value={gengu}
                  onChange={(e) => setGengu(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm outline-none focus:border-game-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-game-muted mb-1">先天功等级</label>
                <input
                  type="number"
                  value={xiantiangongLevel}
                  onChange={(e) => setXiantiangongLevel(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm outline-none focus:border-game-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-game-muted mb-1">带脉等级 (0-9)</label>
                <select
                  value={daimaiLevel}
                  onChange={(e) => setDaimaiLevel(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm outline-none focus:border-game-accent"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => (
                    <option key={v} value={v}>{v}级</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-game-muted mb-1">床加成</label>
                <select
                  value={bedBonus}
                  onChange={(e) => setBedBonus(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm outline-none focus:border-game-accent"
                >
                  <option value={0}>0%</option>
                  <option value={0.1}>10%</option>
                  <option value={0.15}>15%</option>
                  <option value={0.2}>20%</option>
                  <option value={0.25}>25%</option>
                  <option value={0.3}>30%</option>
                  <option value={0.5}>50%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-game-muted mb-1">门派称号</label>
                <select
                  value={sectTitleBonus}
                  onChange={(e) => setSectTitleBonus(Number(e.target.value))}
                  className="w-full bg-game-dark border border-game-border rounded px-2 py-1.5 text-game-text text-sm outline-none focus:border-game-accent"
                >
                  <option value={0}>0%</option>
                  <option value={0.2}>20%</option>
                  <option value={0.25}>25%</option>
                  <option value={0.3}>30%</option>
                </select>
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasHanyusui}
                    onChange={(e) => setHasHanyusui(e.target.checked)}
                    className="w-4 h-4 rounded border-game-border bg-game-dark text-game-accent focus:ring-game-accent"
                  />
                  <span className="text-xs text-game-text">寒玉髓</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasMonthCard}
                    onChange={(e) => setHasMonthCard(e.target.checked)}
                    className="w-4 h-4 rounded border-game-border bg-game-dark text-game-accent focus:ring-game-accent"
                  />
                  <span className="text-xs text-game-text">月卡</span>
                </label>
              </div>
            </div>
          </div>


          {/* 结果展示 */}
          <div className="bg-game-dark/50 p-3 rounded border border-game-border flex justify-around items-center">
            <div className="text-center">
              <div className="text-[10px] text-game-muted uppercase tracking-wider">计算修炼速度</div>
              <div className="text-xl font-mono font-bold text-game-success">{calculatedSpeed}</div>
            </div>
            <div className="w-px h-8 bg-game-border"></div>
            <div className="text-center">
              <div className="text-[10px] text-game-muted uppercase tracking-wider">计算突破减免</div>
              <div className="text-xl font-mono font-bold text-game-warning">{calculatedReduction}%</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-game-border bg-game-dark flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded border border-game-border text-game-text hover:bg-game-panel transition-colors text-sm font-bold"
          >
            取消
          </button>
          <button
            onClick={() => onApply(calculatedSpeed, calculatedReduction)}
            className="flex-1 px-4 py-2 rounded bg-game-accent text-white hover:brightness-110 transition-all text-sm font-bold shadow-lg active:scale-95"
          >
            应用结果
          </button>
        </div>
      </div>
    </div>
  );
};

export default CultivationCalculatorModal;
