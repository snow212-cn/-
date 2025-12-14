export enum Difficulty {
  D1_1 = 1.1,
  D1_2 = 1.2,
  D1_3 = 1.3,
  D1_4 = 1.4,
  D1_5 = 1.5,
  D1_6 = 1.6,
  D1_7 = 1.7,
  D1_8 = 1.8,
  D1_9 = 1.9,
  D2_0 = 2.0,
}

export interface MartialArtConfig {
  id: string;
  difficulty: number;
  isMain: boolean;
  targetLevel: number; // The calculated optimal level
  count: number; // How many arts of this type
}

export interface OptimizationResult {
  totalZhenyuan: number;
  totalTimeHours: number;
  arts: Record<string, number>; // Maps ID to Optimal Level
  path: OptimizationStep[];
}

export interface OptimizationStep {
  artId: string;
  fromLevel: number;
  toLevel: number;
  costTime: number;
  gainZhenyuan: number;
  efficiency: number;
}

export interface TableCellData {
  efficiency: number; // Zhenyuan per Hour
  isOptimal: boolean; // Is this cell part of the optimal path?
  isMain: boolean;
}