import { optimize, optimizeGreedy } from './math';

self.onmessage = (e: MessageEvent) => {
  const { arts, settings } = e.data;
  const startTime = performance.now();

  try {
    let result;
    if (settings.strategy === 'greedy' && settings.targetType !== 'level') {
      // Note: optimize internally handles the dispatch, but we can be explicit if needed.
      // However, optimize() handles locked arts and merging, so we use it.
      result = optimize(arts, settings);
    } else {
      result = optimize(arts, settings);
    }

    const endTime = performance.now();
    self.postMessage({ 
      result, 
      duration: endTime - startTime 
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
