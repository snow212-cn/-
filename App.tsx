import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ZhenyuanTable from './components/ZhenyuanTable';
import ResultSummary from './components/ResultSummary';
import HelpModal from './components/HelpModal';
import { MartialArtConfig, OptimizationResult } from './types';
import { optimize } from './utils/math';

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showHelp, setShowHelp] = useState(false);

  // App Data State
  const [arts, setArts] = useState<MartialArtConfig[]>([
    { id: '1', difficulty: 1.5, isMain: true, targetLevel: 99, count: 1 },
    { id: '2', difficulty: 1.2, isMain: false, targetLevel: 99, count: 2 },
  ]);
  const [speed, setSpeed] = useState<number>(350000);
  const [reduction, setReduction] = useState<number>(0);
  const [targetType, setTargetType] = useState<'zhenyuan' | 'time'>('zhenyuan');
  const [targetValue, setTargetValue] = useState<number>(50000); 
  
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Apply Theme
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      const res = optimize(arts, {
        speed,
        reduction,
        targetType,
        targetValue
      });
      setResult(res);
      setIsCalculating(false);
    }, 100);
  }, [arts, speed, reduction, targetType, targetValue]);

  // Derived Stats
  const globalEfficiency = useMemo(() => {
    if (!result || result.totalTimeHours <= 0) return 0;
    return result.totalZhenyuan / result.totalTimeHours;
  }, [result]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-game-dark text-game-text font-sans">
      {/* Header */}
      <header className="h-14 bg-game-panel border-b border-game-border flex items-center px-4 sm:px-6 shadow-sm z-20 shrink-0 justify-between">
        <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-game-accent to-game-highlight truncate">
          暴走英雄坛 · 真元效率计算器
        </h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-game-dark border border-game-border text-game-muted hover:text-game-highlight hover:border-game-highlight transition-all"
            title="使用帮助"
          >
            ?
          </button>
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-game-dark border border-game-border text-game-warning hover:bg-game-warning/10 transition-all"
            title="切换主题"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left: Configuration */}
        <aside className="w-full md:w-80 lg:w-96 p-4 shrink-0 bg-game-dark z-10 border-r border-game-border overflow-hidden flex flex-col">
          <ConfigPanel 
            arts={arts}
            setArts={setArts}
            speed={speed}
            setSpeed={setSpeed}
            reduction={reduction}
            setReduction={setReduction}
            targetType={targetType}
            setTargetType={setTargetType}
            targetValue={targetValue}
            setTargetValue={setTargetValue}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
          />
        </aside>

        {/* Right: Results & Visualization */}
        <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden relative bg-game-dark">
          
          {/* Stats Bar */}
          <div className="bg-game-panel rounded-lg p-4 shadow-sm flex flex-wrap gap-x-8 gap-y-4 items-center border border-game-border shrink-0">
             <div>
               <div className="text-xs text-game-muted">预计总真元</div>
               <div className="text-2xl font-bold text-game-highlight font-mono">
                 {result ? result.totalZhenyuan.toLocaleString() : '---'}
               </div>
             </div>
             <div>
               <div className="text-xs text-game-muted">预计总时间</div>
               <div className="text-2xl font-bold text-game-text font-mono">
                 {result ? `${result.totalTimeHours.toFixed(1)} 小时` : '---'}
               </div>
             </div>
             
             <div className="w-px h-10 bg-game-border mx-2 hidden md:block"></div>

             <div>
               <div className="text-xs text-game-muted">综合效率 (真元/小时)</div>
               <div className="text-2xl font-bold text-game-success font-mono">
                 {result ? Math.round(globalEfficiency).toLocaleString() : '---'}
               </div>
             </div>
          </div>

          {/* Text Summary */}
          {result && <ResultSummary result={result} userArts={arts} />}

          {/* Table Container */}
          <div className="flex-1 min-h-0 shadow-lg rounded-lg border border-game-border overflow-hidden">
            <ZhenyuanTable 
              speed={speed} 
              reduction={reduction} 
              optimizationResult={result}
              userArts={arts}
            />
          </div>
        </main>
      </div>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default App;
