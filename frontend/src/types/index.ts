// =================================================================
//                 TYPE DEFINITIONS FOR DAILYZEN API
//   These types are the "source of truth" and directly map to the
//   Rust backend's data structures. We will adapt the UI to these.
// =================================================================

// --- Core Data Models ---

export type TaskCategory = "Physical" | "Mental";

export interface Task {
  id: string;
  userId: string;
  name: string;
  description?: string;
  points: number;
  category: TaskCategory;
  isMandatory: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

export interface Entry {
  id: string;
  userId: string;
  taskId: string;
  date: string; // "YYYY-MM-DD"
  pointsAwarded: number;
  notes?: string;
  completedAt: string; // ISO 8601 format
}

export type GoalCategory = "Physical" | "Mental" | "Career" | "Personal" | "Financial";

export interface Goal {
  id: string;
  userId: string;
  description: string;
  category: GoalCategory;
  deadline: string; // "YYYY-MM-DD"
  penalty: number;
  progress: number; // 0-100
  isCompleted: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

export interface Note {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  content?: string;
  mood?: number; // 1-5
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

// --- User & Authentication ---

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string; // ISO 8601 format
}

// --- Analytics & Badges ---

// The raw data for a badge as it comes from the backend
export type BadgeMaterialTier = "Coal" | "Iron" | "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export type BadgeRankTier = "Mortal" | "Aspirant" | "Demigod" | "God" | "Titan";
export type BadgeFocusFactor = "Consistency" | "Volume" | "Mental" | "Physical" | "Dedication" | "Ambition";

export interface EarnedBadge {
  id: string;
  userId: string;
  materialTier: BadgeMaterialTier;
  rankTier: BadgeRankTier;
  focusFactor: BadgeFocusFactor;
  threshold: number;
  unlockedAt: string; // ISO 8601 format
}

// This is a UI-specific type. We will map EarnedBadge to this for display.
export interface UIBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "Bronze" | "Silver" | "Gold" | "Legendary";
  unlockedAt?: string;
}


export interface Streaks {
  current: number;
  longest: number;
}

export interface UserLevel {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD"
  activity: number; // 0-4
}

export interface CategoryBreakdown {
  physical: number;
  mental: number;
}

export interface AnalyticsResponse {
  streaks: Streaks;
  pointsChartData: ChartDataPoint[];
  heatmapData: HeatmapDay[];
  categoryBreakdown: CategoryBreakdown;
  userLevel: UserLevel;
  badges: EarnedBadge[]; 
  weeklyAverage: number;
  totalPoints: number;
  todayPoints: number;

  previousPeriodPoints: number;
  prevWeeklyAverage: number;
}

// --- API Payloads (Form Data) ---

export interface TaskFormData {
  name: string;
  description?: string;
  points: number;
  category: TaskCategory;
  isMandatory: boolean;
}

export interface GoalFormData {
    description: string;
    category: GoalCategory;
    deadline: string; // "YYYY-MM-DD"
    penalty: number;
}

export interface UpdateGoalFormData extends Partial<GoalFormData> {
  progress?: number;
}

export interface EntryFormData {
  taskId: string;
  notes?: string;
  date: string; // "YYYY-MM-DD"
}

export interface NoteFormData {
  content: string;
  mood?: number;
  date: string; // "YYYY-MM-DD"
}