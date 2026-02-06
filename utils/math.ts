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
            // But we only execute ONE STEP (10 levels) to maintain granular control,
            // unless we are in a "catch up" phase? 
            // Actually, if we use potential efficiency to decide, we should probably stick to small steps
            // because once we take a step, the potential efficiency of this art might change (usually increase then decrease).
            // However, to be "fair", we should compare the "potential" of A vs "potential" of B.
            
            // To properly execute the "Next Step", we need the data for just the next 10 levels
            // even if we chose based on potential.
            // ...Wait, if we choose based on potential 99->299, but only execute 99->109,
            // the efficiency of 99->109 might be terrible.
            // But that's okay! We are investing.
            
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
                    // Store the potential efficiency for display/debug if needed, 
                    // though UI expects immediate efficiency. 
                    // Let's store immediate efficiency in the path for correctness of history,
                    // or maybe the decision efficiency? Users might be confused if they see low efficiency chosen.
                    // Let's store immediate.
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
  arts: { id: string; difficulty: number; isMain: boolean; count: number }[],
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
  arts.forEach((art, idx) => {
    for(let i=0; i<art.count; i++) {
      instances.push({ ...art, uniqueId: `${art.id}_${i}`, originalIndex: idx });
    }
  });

  if (instances.length === 0) {
    return { totalZhenyuan: 0, totalTimeHours: 0, arts: {}, path: [] };
  }

  // Use Greedy if requested or for certain conditions
  if (settings.strategy === 'greedy' && settings.targetType !== 'level') {
      return optimizeGreedy(instances, settings);
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