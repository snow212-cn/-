import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-game-panel border border-game-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-game-border bg-game-dark sticky top-0">
          <h2 className="text-lg sm:text-xl font-bold text-game-highlight">📖 使用指南</h2>
          <button onClick={onClose} className="text-game-muted hover:text-game-text text-xl sm:text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-game-text text-xs sm:text-sm leading-relaxed">
          <section>
            <h3 className="text-sm sm:text-base font-bold text-game-accent mb-2">核心概念</h3>
            <ul className="list-disc pl-5 space-y-1 text-game-muted">
              <li><strong className="text-game-text">真元</strong>：决定转世后属性的关键资源。武学等级越高、难度系数越高，提供的真元越多。</li>
              <li><strong className="text-game-text">突破</strong>：武学每到 x9 级（如 99, 109）需要闭关。这是真元规划的关键，因为闭关时间固定，会导致低等级时频繁闭关效率低下。</li>
              <li><strong className="text-game-text">主/副武学</strong>：主武学提供 100% 真元，副武学提供 50% 真元。通常修炼难度高、等级高的为主武学。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm sm:text-base font-bold text-game-warning mb-2">如何使用本计算器</h3>
            <ol className="list-decimal pl-5 space-y-2 text-game-muted">
              <li>
                <strong className="text-game-text">设置基础参数</strong>：在左侧输入您的面板“修炼速度”（如 350000）和“突破时间减免”（%）。
              </li>
              <li>
                <strong className="text-game-text">添加武学</strong>：列出所有打算修炼的武学。设置它们的“难度系数”和是否为“主武学”。如果有多门相同难度的武学，可以调整“数量”。可将某武学固定等级，计算时不再变动。
              </li>
              <li>
                <strong className="text-game-text">设定目标</strong>：
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>目标真元</strong>：输入您想凑齐的总真元，计算器会算出最快达到该真元的方案。</li>
                  <li><strong>目标时间</strong>：输入您打算挂机的时间，计算器会算出该时间内能获得的最高真元方案。</li>
                </ul>
              </li>
              <li>
                <strong className="text-game-text">查看热力图</strong>：右侧表格展示了不同等级的“真元获取效率”。
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mx-1"></span> 红色越深代表当前等级每小时获得的真元越多。
                带有 <span className="px-1 border border-game-warning text-game-warning text-[10px] rounded">1</span> 角标的格子表示推荐方案中的目标等级（主/副武会用不同颜色高亮）。
              </li>
            </ol>
          </section>

        </div>

        <div className="p-3 sm:p-4 border-t border-game-border bg-game-dark sticky bottom-0 text-right">
          <button
            onClick={onClose}
            className="px-5 py-1.5 sm:px-6 sm:py-2 bg-game-accent hover:opacity-90 text-white rounded font-bold transition-opacity text-sm"
          >
            我明白了
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
