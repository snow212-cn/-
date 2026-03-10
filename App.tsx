import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ConfigPanel from './components/ConfigPanel';
import CultivationCalculatorModal from './components/CultivationCalculatorModal';
import ZhenyuanTable from './components/ZhenyuanTable';
import ResultSummary from './components/ResultSummary';
import HelpModal from './components/HelpModal';
import { MartialArtConfig, OptimizationResult } from './types';
import { optimize } from './utils/math';

const STORAGE_KEY = 'zhenyuan_calc_state_v1';

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const t = saved ? JSON.parse(saved).theme : null;
      return t === 'light' || t === 'dark' ? t : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // App Data State (Initialized from LocalStorage)
  const [arts, setArts] = useState<MartialArtConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.arts) return parsed.arts;
      }
    } catch (e) {
      console.error('Failed to load arts', e);
    }
    return [
      { id: '1', difficulty: 1.5, isMain: true, targetLevel: 99, count: 1 },
      { id: '2', difficulty: 1.2, isMain: false, targetLevel: 99, count: 2 },
    ];
  });

  const [speed, setSpeed] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).speed || 350000 : 350000;
  });

  const [reduction, setReduction] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).reduction || 0 : 0;
  });

  const [targetType, setTargetType] = useState<'zhenyuan' | 'time' | 'level'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved ? JSON.parse(saved).targetType : null) || 'zhenyuan';
  });

  const [targetValue, setTargetValue] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved ? JSON.parse(saved).targetValue : null) || 50000;
  });

  const [referenceArtId, setReferenceArtId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).referenceArtId : undefined;
  });

  const [strategy, setStrategy] = useState<'dp' | 'greedy'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).strategy || 'greedy' : 'greedy';
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcDuration, setCalcDuration] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./utils/optimization.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { result, duration, error } = e.data;
      if (error) {
        console.error('Calculation error:', error);
      } else {
        setResult(result);
        setCalcDuration(duration);
      }
      setIsCalculating(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 用于触发热力图在“自动列模式”(used/all)下同步一次难度列（避免每次增删武学都抖动）
  const [heatmapSyncToken, setHeatmapSyncToken] = useState(0);

  // Auto-scroll helper: only scroll after a user-initiated calculation (mainly for mobile)
  const resultTopRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToResultRef = useRef(false);

  // Track if initial mount is done to avoid saving default state over potential existing state if we used useEffect for loading
  // (But since we use lazy initialization, we are safe)

  // Save to LocalStorage whenever critical state changes
  useEffect(() => {
    const stateToSave = {
      arts,
      speed,
      reduction,
      targetType,
      targetValue,
      referenceArtId,
      strategy,
      theme
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }, [arts, speed, reduction, targetType, targetValue, referenceArtId, strategy, theme]);

  // Apply Theme
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // Handle switching target types logic
  const prevTargetType = useRef(targetType);
  useEffect(() => {
     if (prevTargetType.current !== targetType) {
        if (targetType === 'level') {
            // Set default target value to a reasonable level if it was a huge zhenyuan number
            if (targetValue > 1000) setTargetValue(399);
            // Set default ref art
            if (!referenceArtId && arts.length > 0) setReferenceArtId(arts[0].id);
        } else if (targetType === 'zhenyuan') {
            if (targetValue < 1000) setTargetValue(50000);
        } else if (targetType === 'time') {
            if (targetValue > 20000) setTargetValue(500); // Reset from zhenyuan to reasonable hours
            if (targetValue < 10 && targetValue > 0) setTargetValue(500); // Reset from level? Level is usually > 99
        }
        prevTargetType.current = targetType;
     }
  }, [targetType, targetValue, referenceArtId, arts]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCalculate = useCallback(() => {
    if (!workerRef.current) return;
    
    shouldScrollToResultRef.current = true;
    setHeatmapSyncToken((t) => t + 1);
    setIsCalculating(true);
    setCalcDuration(null);
    
    workerRef.current.postMessage({
      arts,
      settings: {
        speed,
        reduction,
        targetType,
        targetValue,
        referenceArtId,
        strategy
      }
    });
  }, [arts, speed, reduction, targetType, targetValue, referenceArtId, strategy]);

  const handleCancelCalculate = useCallback(() => {
    workerRef.current?.terminate();
    // Re-initialize worker after termination
    workerRef.current = new Worker(new URL('./utils/optimization.worker.ts', import.meta.url), {
      type: 'module'
    });
    workerRef.current.onmessage = (e) => {
      const { result, duration, error } = e.data;
      if (error) {
        console.error('Calculation error:', error);
      } else {
        setResult(result);
        setCalcDuration(duration);
      }
      setIsCalculating(false);
    };
    setIsCalculating(false);
  }, []);
  // Mobile UX: after clicking "一键规划", automatically scroll to the top of the result area
  useEffect(() => {
    if (!result) return;
    if (!shouldScrollToResultRef.current) return;

    shouldScrollToResultRef.current = false;

    // Tailwind "md" breakpoint is 768px; only do this on small screens to avoid disturbing desktop layout.
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    const raf = requestAnimationFrame(() => {
      resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => cancelAnimationFrame(raf);
  }, [result]);

  // Derived Stats
  const globalEfficiency = useMemo(() => {
    if (!result || result.totalTimeHours <= 0) return 0;
    return result.totalZhenyuan / result.totalTimeHours;
  }, [result]);

  return (
    <div className="min-h-screen w-full flex flex-col md:h-screen md:overflow-hidden bg-game-dark text-game-text font-sans">
      {/* Header */}
      <header className="h-12 sm:h-14 bg-game-panel border-b border-game-border flex items-center px-3 sm:px-6 shadow-sm z-20 shrink-0 justify-between sticky top-0 md:relative">
        <h1 className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-game-accent to-game-highlight truncate">
          暴走英雄坛 · 真元方案优化器
        </h1>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-game-dark border border-game-border text-game-muted hover:text-game-highlight hover:border-game-highlight transition-all"
            title="使用帮助"
          >
            ?
          </button>
          <button
            onClick={toggleTheme}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-game-dark border border-game-border text-game-warning hover:bg-game-warning/10 transition-all"
            title="切换主题"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden relative">
        
        {/* Left: Configuration */}
        <aside className="w-full md:w-80 lg:w-96 p-3 sm:p-4 shrink-0 bg-game-dark z-10 border-b md:border-b-0 md:border-r border-game-border md:overflow-hidden flex flex-col">
          <ConfigPanel 
            arts={arts}
            setArts={setArts}
            speed={speed}
            setSpeed={setSpeed}
            reduction={reduction}
            setReduction={setReduction}
            onOpenCalculator={() => setIsCalculatorOpen(true)}
            targetType={targetType}
            setTargetType={setTargetType}
            targetValue={targetValue}
            setTargetValue={setTargetValue}
            referenceArtId={referenceArtId}
            setReferenceArtId={setReferenceArtId}
            strategy={strategy}
            setStrategy={setStrategy}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            onCancelCalculate={handleCancelCalculate}
          />
        </aside>

        {/* Right: Results & Visualization */}
        <main className="flex-1 p-3 sm:p-4 flex flex-col gap-4 md:overflow-auto relative bg-game-dark custom-scrollbar">
          
          {/* Stats Bar */}
          <div
            ref={resultTopRef}
            className="bg-game-panel rounded-lg p-3 sm:p-4 shadow-sm flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-8 sm:gap-y-4 items-center border border-game-border shrink-0 justify-between sm:justify-start scroll-mt-16 md:scroll-mt-0"
          >
             <div>
               <div className="text-[10px] sm:text-xs text-game-muted">预计总真元</div>
               <div className="text-lg sm:text-2xl font-bold text-game-highlight font-mono">
                 {result ? result.totalZhenyuan.toLocaleString() : '---'}
               </div>
             </div>
             <div>
               <div className="text-[10px] sm:text-xs text-game-muted">预计总时间</div>
               <div className="text-lg sm:text-2xl font-bold text-game-text font-mono">
                 {result ? `${result.totalTimeHours.toFixed(1)}h` : '---'}
               </div>
             </div>
             
             <div className="hidden sm:block w-px h-10 bg-game-border mx-2"></div>

             <div>
               <div className="text-[10px] sm:text-xs text-game-muted">综合效率</div>
               <div className="text-lg sm:text-2xl font-bold text-game-success font-mono">
                 {result ? Math.round(globalEfficiency).toLocaleString() : '---'}
               </div>
             </div>
          </div>

          {/* Text Summary */}
          {result && <ResultSummary result={result} userArts={arts} duration={calcDuration} />}

          {/* Table Container */}
          <div className="flex-1 min-h-[400px] md:min-h-0 shadow-lg rounded-lg border border-game-border overflow-hidden bg-game-panel">
            <ZhenyuanTable
              speed={speed}
              reduction={reduction}
              optimizationResult={result}
              userArts={arts}
              heatmapSyncToken={heatmapSyncToken}
            />
          </div>
        </main>
      </div>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Cultivation Calculator Modal */}
      <CultivationCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApply={(s, r) => {
          setSpeed(s);
          setReduction(r);
          setIsCalculatorOpen(false);
        }}
      />
    </div>
  );
};

export default App;