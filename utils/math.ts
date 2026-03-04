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

/**
 * 计算修炼速度
 * 公式: (36000 + 720 * 有效根骨) * (1 + 加成总和)
 */
export const calculateCultivationSpeed = (
  gengu: number,
  options: {
    hasHanyusui: boolean;
    xiantiangongLevel: number;
    daimaiLevel: number;
    bedBonus: number;
    hasMonthCard: boolean;
    sectTitleBonus: number;
  }
): number => {
  let bonusSum = 0;

  // 寒玉髓 (+100%)
  if (options.hasHanyusui) bonusSum += 1.0;

  // 先天功等级
  // 100以下: 1级是10%，每升10级+1%，100级是20%
  // 100以上: 每升10级+0.5%
  if (options.xiantiangongLevel > 0) {
    if (options.xiantiangongLevel <= 100) {
      // 1级是10%，每升10级+1%
      // 1-9级: 10%
      // 10-19级: 11%
      // ...
      // 100级: 10% + 10% = 20%
      bonusSum += 0.1 + Math.floor(options.xiantiangongLevel / 10) * 0.01;
    } else {
      // 100级是20%，100以上每升10级+0.5%
      bonusSum += 0.2 + Math.floor((options.xiantiangongLevel - 100) / 10) * 0.005;
    }
  }

  // 带脉 (0到9级分别加0%,20%,25%,...,60%)
  const daimaiBonuses = [0, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6];
  bonusSum += daimaiBonuses[Math.min(options.daimaiLevel, 9)] || 0;

  // 床 (+0, 10, 15, 20, 25, 30, 50%)
  bonusSum += options.bedBonus;

  // 有无月卡 (+20%)
  if (options.hasMonthCard) bonusSum += 0.2;

  // 门派称号 (+20%/25%/30%)
  bonusSum += options.sectTitleBonus;

  return (36000 + 720 * gengu) * (1 + bonusSum);
};

/**
 * 计算突破减免
 * 突破减免由带脉决定 (0-9级分别减免0,20,25,...,60%)
 */
export const calculateBreakthroughReduction = (
  daimaiLevel: number
): number => {
  const daimaiReductions = [0, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  return daimaiReductions[Math.min(daimaiLevel, 9)] || 0;
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

// --- GREEDY OPTIMIZATION (Stepping by marginal gain with lookahead) ---
export const optimizeGreedy = (
    instances: { id: string; difficulty: number; isMain: boolean; uniqueId: string; originalIndex: number }[],
    settings: {
        speed: number;
        reduction: number;
        targetType: 'zhenyuan' | 'time' | 'level';
        targetValue: number;
    }
) => {
    let currentTotalZ = 0;
    let currentTotalT = 0;
    const finalArts: Record<string, number> = {};
    const path: any[] = [];

    // Initialize
    instances.forEach(inst => {
        const startZ = getZhenyuan(99, inst.difficulty, inst.isMain);
        currentTotalZ += startZ;
        finalArts[inst.uniqueId] = 99;
    });

    const maxLevelLimit = 499;

    while (true) {
        let bestInstIdx = -1;
        let bestEff = -1;
        let bestStepInfo = null;

        for (let i = 0; i < instances.length; i++) {
            const inst = instances[i];
            const curLvl = finalArts[inst.uniqueId];
            
            if (curLvl >= maxLevelLimit) continue;

            // Lookahead Strategy:
            // Calculate max potential efficiency up to level 399 (or max limit)
            // This prevents getting stuck in local optima due to high initial breakthrough costs (low levels)
            // or step-based fluctuations.
            
            let maxPotentialEff = -1;
            let targetForMaxEff = -1;
            let deltaZForMaxEff = 0;
            let stepTForMaxEff = 0;

            // We simulate going from curLvl -> targetL
            let tempAccumZ = 0; // Cumulative Gain
            let tempAccumT = 0; // Cumulative Cost
            let currentSimLvl = curLvl;

            // Scan range: Look ahead up to 20 steps (200 levels) or until limit
            // We cap at 399 because that's where mechanics often shift, but scanning to 499 is also fine.
            const scanLimit = Math.min(maxLevelLimit, curLvl + 200); 

            for (let l = curLvl; l < scanLimit; l += 10) {
                 const stepCost = getStepCost(l, inst.difficulty, settings.speed, settings.reduction);
                 const zCurrent = getZhenyuan(l, inst.difficulty, inst.isMain);
                 const zNext = getZhenyuan(l + 10, inst.difficulty, inst.isMain);
                 const gain = zNext - zCurrent;

                 tempAccumZ += gain;
                 tempAccumT += stepCost;
                 currentSimLvl = l + 10;

                 const potentialEff = tempAccumZ / tempAccumT;
                 
                 if (potentialEff > maxPotentialEff) {
                     maxPotentialEff = potentialEff;
                     targetForMaxEff = currentSimLvl;
                     deltaZForMaxEff = tempAccumZ;
                     stepTForMaxEff = tempAccumT;
                 }
            }

            // Decision Metric: Use maxPotentialEff to decide WHICH art to upgrade
            // But we only execute ONE STEP (10 levels) to maintain granular control.
            
            // Recalculate immediate step data for the actual execution
            const immediateStepT = getStepCost(curLvl, inst.difficulty, settings.speed, settings.reduction);
            const immediateZCurr = getZhenyuan(curLvl, inst.difficulty, inst.isMain);
            const immediateZNext = getZhenyuan(curLvl + 10, inst.difficulty, inst.isMain);
            const immediateDeltaZ = immediateZNext - immediateZCurr;
            
            // The comparison key is maxPotentialEff
            if (maxPotentialEff > bestEff) {
                bestEff = maxPotentialEff;
                bestInstIdx = i;
                // We execute the immediate step, but we made the decision based on potential
                bestStepInfo = { 
                    deltaZ: immediateDeltaZ, 
                    stepT: immediateStepT, 
                    nextLvl: curLvl + 10,
                    eff: immediateDeltaZ / immediateStepT 
                };
            }
        }

        if (bestInstIdx === -1) break; // No more upgrades possible

        const inst = instances[bestInstIdx];
        
        // Stop condition
        if (settings.targetType === 'zhenyuan' && currentTotalZ >= settings.targetValue) break;
        if (settings.targetType === 'time' && currentTotalT + bestStepInfo!.stepT > settings.targetValue) break;

        // Apply upgrade
        currentTotalZ += bestStepInfo!.deltaZ;
        currentTotalT += bestStepInfo!.stepT;
        finalArts[inst.uniqueId] = bestStepInfo!.nextLvl;
        
        path.push({
            artId: inst.uniqueId,
            fromLevel: bestStepInfo!.nextLvl - 10,
            toLevel: bestStepInfo!.nextLvl,
            costTime: bestStepInfo!.stepT,
            gainZhenyuan: bestStepInfo!.deltaZ,
            efficiency: bestStepInfo!.eff // Recorded efficiency is the immediate one
        });
    }

    return {
        totalZhenyuan: currentTotalZ,
        totalTimeHours: currentTotalT,
        arts: finalArts,
        path: path,
        strategy: 'greedy' as const
    };
};

// Global Optimization using DP / Pareto Frontier or Reference Level
export const optimize = (
  arts: { id: string; difficulty: number; isMain: boolean; count: number; isLocked?: boolean; lockedLevel?: number }[],
  settings: {
    speed: number;
    reduction: number;
    targetType: 'zhenyuan' | 'time' | 'level';
    targetValue: number;
    referenceArtId?: string;
    strategy?: 'dp' | 'greedy';
  }
) => {
  // 1. Flatten instances (handle 'count')
  const instances: { id: string; difficulty: number; isMain: boolean; uniqueId: string; originalIndex: number }[] = [];
  const lockedInstances: { id: string; difficulty: number; isMain: boolean; uniqueId: string; originalIndex: number; lockedLevel: number }[] = [];

  arts.forEach((art, idx) => {
    for(let i=0; i<art.count; i++) {
        const uniqueId = `${art.id}_${i}`;
        if (art.isLocked && art.lockedLevel) {
            lockedInstances.push({ ...art, uniqueId, originalIndex: idx, lockedLevel: art.lockedLevel });
        } else {
            instances.push({ ...art, uniqueId, originalIndex: idx });
        }
    }
  });

  // Calculate Fixed Costs/Gains from Locked Arts
  let lockedZ = 0;
  let lockedT = 0;
  const finalArts: Record<string, number> = {};

  lockedInstances.forEach(inst => {
      // Calculate Time to reach lockedLevel from 99
      for (let l = 99; l < inst.lockedLevel; l += 10) {
           lockedT += getStepCost(l, inst.difficulty, settings.speed, settings.reduction);
      }
      
      // Calculate Total Z at lockedLevel
      lockedZ += getZhenyuan(inst.lockedLevel, inst.difficulty, inst.isMain);
      
      finalArts[inst.uniqueId] = inst.lockedLevel;
  });

  // If no unlocked instances, just return locked results
  if (instances.length === 0) {
      return { totalZhenyuan: lockedZ, totalTimeHours: lockedT, arts: finalArts, path: [] };
  }
  
  // Adjust Settings for Optimization
  let adjustedTargetValue = settings.targetValue;
  
  if (settings.targetType === 'zhenyuan') {
      adjustedTargetValue = Math.max(0, settings.targetValue - lockedZ); 
  } else if (settings.targetType === 'time') {
      adjustedTargetValue = Math.max(0, settings.targetValue - lockedT);
  }
  
  const adjustedSettings = { ...settings, targetValue: adjustedTargetValue };

  // Helper to merge results
  const mergeResult = (res: any) => {
      if (!res) return null;
      return {
          totalZhenyuan: res.totalZhenyuan + lockedZ, // Note: res.totalZhenyuan includes base Z of unlocked arts
          totalTimeHours: res.totalTimeHours + lockedT,
          arts: { ...finalArts, ...res.arts },
          path: res.path,
          strategy: res.strategy
      };
  };

  // --- STRATEGY DISPATCH ---

  // Use Greedy if requested or for certain conditions
  if (settings.strategy === 'greedy' && settings.targetType !== 'level') {
      return mergeResult(optimizeGreedy(instances, adjustedSettings));
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

     const levelFinalArts: Record<string, number> = {};
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
         levelFinalArts[inst.uniqueId] = currentLvl;
     });

     return {
        totalZhenyuan: totalZ + lockedZ,
        totalTimeHours: totalT + lockedT,
        arts: { ...finalArts, ...levelFinalArts },
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
        if (state.z + baseTotalZ >= adjustedTargetValue) {
            bestState = state; 
        } else {
            break; 
        }
    }
    if (!bestState && frontier.length > 0) bestState = frontier[0]; 

  } else {
    // Target Time
    for (const state of frontier) {
        if (state.t <= adjustedTargetValue) {
            bestState = state;
            break;
        }
    }
    if (!bestState && frontier.length > 0) bestState = frontier[frontier.length - 1];
  }

  if (!bestState) return null;

  const dpFinalArts: Record<string, number> = {};
  instances.forEach((inst, idx) => {
      dpFinalArts[inst.uniqueId] = bestState!.choices[idx];
  });

  return {
    totalZhenyuan: bestState.z + baseTotalZ + lockedZ,
    totalTimeHours: bestState.t + lockedT,
    arts: { ...finalArts, ...dpFinalArts }, 
    path: []
  };
};