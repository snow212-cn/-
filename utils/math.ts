// Difficulty modifier based on level
export const getDifficultyModifier = (level: number): number => {
  if (level < 309) return 1;
  if (level >= 309 && level < 400) {
    // Formula: (9 * L - 1811) / 890
    return (9 * level - 1811) / 890;
  }
  return 2; // 400 to 500
};

// Calculate cultivation cost to go from level to level + 1
// This is the "Cultivation Value" needed, not time. Time = Value / Speed.
export const getLevelUpCostValue = (level: number, difficulty: number): number => {
  const modifier = getDifficultyModifier(level);
  // Formula: (Difficulty * (Level^3 + 1000) / 100) * Modifier
  return (difficulty * (Math.pow(level, 3) + 1000) / 100) * modifier;
};

// Calculate Total Zhenyuan at a specific level
export const getZhenyuan = (level: number, difficulty: number, isMain: boolean): number => {
  // Formula: 3 * Level^3 * Difficulty / 10127
  const rawZhenyuan = (3 * Math.pow(level, 3) * difficulty) / 10127;
  const factor = isMain ? 1 : 0.5;
  return Math.floor(rawZhenyuan * factor);
};

// Calculate Breakthrough Time (Hours)
export const getBreakthroughTime = (targetLevelEndingIn9: number, reductionPercent: number): number => {
  // Breakthrough happens at 99, 109... to reach the next tier.
  // 99...289 -> 2 hours
  // 299...389 -> 4 hours
  // 399+ -> 8 hours
  
  let baseTime = 0;
  if (targetLevelEndingIn9 >= 99 && targetLevelEndingIn9 <= 289) {
    baseTime = 2;
  } else if (targetLevelEndingIn9 >= 299 && targetLevelEndingIn9 <= 389) {
    baseTime = 4;
  } else
    baseTime = 8;
  
  return baseTime * (1 - reductionPercent / 100);
};

// Calculate Cost (in Hours) to go from currentLevel (ending in 9) to currentLevel + 10
export const getStepCost = (
  startLevel: number, 
  difficulty: number,
  speed: number, 
  breakthroughReduction: number
): number => {
  // 1. Breakthrough time needed to unlock the path from startLevel -> startLevel+1
  const breakTime = getBreakthroughTime(startLevel, breakthroughReduction);

  // 2. Cultivation time for the 10 levels (startLevel -> startLevel+1 ... -> startLevel+10)
  let cultValue = 0;
  for (let l = startLevel; l < startLevel + 10; l++) {
    cultValue += getLevelUpCostValue(l, difficulty);
  }

  const cultTime = cultValue / speed;

  return breakTime + cultTime;
};

// Global Optimization using DP / Pareto Frontier or Reference Level
export const optimize = (
  arts: { id: string; difficulty: number; isMain: boolean; count: number }[],
  settings: {
    speed: number;
    reduction: number;
    targetType: 'zhenyuan' | 'time' | 'level';
    targetValue: number;
    referenceArtId?: string;
  }
) => {
  // 1. Flatten instances (handle 'count')
  const instances = [];
  arts.forEach((art, idx) => {
    for(let i=0; i<art.count; i++) {
      instances.push({ ...art, uniqueId: `${art.id}_${i}`, originalIndex: idx });
    }
  });

  if (instances.length === 0) {
    return { totalZhenyuan: 0, totalTimeHours: 0, arts: {}, path: [] };
  }

  // --- MODE: REFERENCE LEVEL ---
  if (settings.targetType === 'level' && settings.referenceArtId) {
     const refArt = arts.find(a => a.id === settings.referenceArtId);
     
     // Validations
     if (!refArt) return null;
     
     // Calculate Threshold Efficiency based on the Reference Art's last step to reach target
     // If Target is 99 (base), threshold is infinite (stop everything else at base)
     let thresholdEff = Infinity;
     
     if (settings.targetValue > 99) {
         // The step we just completed/committed to is (Target-10) -> Target
         const stepStart = settings.targetValue - 10;
         const cost = getStepCost(stepStart, refArt.difficulty, settings.speed, settings.reduction);
         const zStart = getZhenyuan(stepStart, refArt.difficulty, refArt.isMain);
         const zEnd = getZhenyuan(settings.targetValue, refArt.difficulty, refArt.isMain);
         if (cost > 0) {
            thresholdEff = (zEnd - zStart) / cost;
         }
     }

     const finalArts: Record<string, number> = {};
     let totalZ = 0;
     let totalT = 0;
     
     // Base totals (Level 99)
     instances.forEach(inst => {
         totalZ += getZhenyuan(99, inst.difficulty, inst.isMain);
     });

     instances.forEach(inst => {
         let currentLvl = 99;
         // Simulate leveling up step by step
         for (let l = 99; l < 599; l += 10) {
             const nextLvl = l + 10;
             const stepCost = getStepCost(l, inst.difficulty, settings.speed, settings.reduction);
             const zCurr = getZhenyuan(l, inst.difficulty, inst.isMain);
             const zNext = getZhenyuan(nextLvl, inst.difficulty, inst.isMain);
             const stepGain = zNext - zCurr;
             const stepEff = stepGain / stepCost;

             let shouldLevel = false;

             if (inst.id === settings.referenceArtId) {
                 // Reference Group: Must reach exactly targetValue
                 if (nextLvl <= settings.targetValue) {
                     shouldLevel = true;
                 }
             } else {
                 // Others: Level if efficiency is better than or equal to threshold
                 // Use a small epsilon for float comparison stability
                 if (stepEff >= thresholdEff - 0.00001) {
                     shouldLevel = true;
                 }
             }

             if (shouldLevel) {
                 totalT += stepCost;
                 totalZ += stepGain;
                 currentLvl = nextLvl;
             } else {
                 break;
             }
         }
         finalArts[inst.uniqueId] = currentLvl;
     });

     return {
        totalZhenyuan: totalZ,
        totalTimeHours: totalT,
        arts: finalArts,
        path: []
     };
  }

  // --- MODE: GLOBAL OPTIMIZATION (DP) ---

  // 2. Precompute Options Curves for each instance
  const instanceOptions = instances.map(inst => {
    const options = [];
    let cumTime = 0;
    
    options.push({
      level: 99,
      z: getZhenyuan(99, inst.difficulty, inst.isMain),
      t: 0
    });

    for (let l = 99; l < 499; l += 10) {
      const stepT = getStepCost(l, inst.difficulty, settings.speed, settings.reduction);
      cumTime += stepT;
      
      const nextLevel = l + 10;
      const nextZ = getZhenyuan(nextLevel, inst.difficulty, inst.isMain);
      
      options.push({
        level: nextLevel,
        z: nextZ,
        t: cumTime
      });
    }
    return options;
  });

  // 3. Dynamic Programming (Merge Pareto Frontiers)
  let baseTotalZ = 0;
  instances.forEach(inst => baseTotalZ += getZhenyuan(99, inst.difficulty, inst.isMain));
  
  let frontier = [{ z: 0, t: 0, choices: new Array(instances.length).fill(99) }];

  for (let i = 0; i < instances.length; i++) {
    const options = instanceOptions[i];
    const baseZ_i = options[0].z; 
    const nextFrontier = [];

    for (const state of frontier) {
      for (const opt of options) {
        const deltaZ = opt.z - baseZ_i;
        const newZ = state.z + deltaZ;
        const newT = state.t + opt.t;
        const newChoices = [...state.choices];
        newChoices[i] = opt.level;

        nextFrontier.push({ z: newZ, t: newT, choices: newChoices });
      }
    }

    nextFrontier.sort((a, b) => b.z - a.z);

    const pruned = [];
    let minTimeSeen = Infinity;
    
    // Slightly coarser bucket to handle larger combos if needed, or keep 100
    const BUCKET_SIZE = 100; 
    const seenBuckets = new Set<number>();

    for (const state of nextFrontier) {
      if (state.t < minTimeSeen) {
        const bucket = Math.floor(state.z / BUCKET_SIZE);
        if (!seenBuckets.has(bucket)) {
             pruned.push(state);
             minTimeSeen = state.t;
             seenBuckets.add(bucket);
        }
      }
    }
    
    frontier = pruned;
  }

  // 4. Find Best Result based on Target
  let bestState = null;

  if (settings.targetType === 'zhenyuan') {
    for (const state of frontier) {
        if (state.z + baseTotalZ >= settings.targetValue) {
            bestState = state; 
        } else {
            break; 
        }
    }
    if (!bestState && frontier.length > 0) bestState = frontier[0]; 

  } else {
    // Target Time
    for (const state of frontier) {
        if (state.t <= settings.targetValue) {
            bestState = state;
            break;
        }
    }
    if (!bestState && frontier.length > 0) bestState = frontier[frontier.length - 1];
  }

  if (!bestState) return null;

  const finalArts: Record<string, number> = {};
  instances.forEach((inst, idx) => {
      finalArts[inst.uniqueId] = bestState!.choices[idx];
  });

  return {
    totalZhenyuan: bestState.z + baseTotalZ,
    totalTimeHours: bestState.t,
    arts: finalArts, 
    path: []
  };
};