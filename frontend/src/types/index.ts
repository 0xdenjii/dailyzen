// TypeScript interfaces for the Self-Development App



export interface Task {
  id: string;
  name: string;
  points: number;
  isMandatory: boolean;
  category: 'Physical' | 'Mental';
  description?: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  taskId: string;
  notes?: string;
  date: string; // Format: YYYY-MM-DD
  completedAt: string;
  points: number;
}

export interface Goal {
  id: string;
  description: string;
  deadline: string; // Format: YYYY-MM-DD
  penalty: number;
  progress: number; // Percentage from 0 to 100
  category: 'Physical' | 'Mental' | 'Career' | 'Personal' | 'Financial';
  createdAt: string;
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'Bronze' | 'Silver' | 'Gold' | 'Legendary';
  unlockedAt?: string;
  requirement: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastActivity: string;
}

export interface UserLevel {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface HeatmapDay {
  date: string;
  activity: number; // 0-4 scale for intensity
  points: number;
}

export interface AnalyticsResponse {
  streaks: Streak;
  pointsChartData: ChartDataPoint[];
  heatmapData: HeatmapDay[];
  categoryBreakdown: {
    physical: number;
    mental: number;
  };
  userLevel: UserLevel;
  badges: Badge[];
  weeklyAverage: number;
  monthlyAverage: number;
  totalPoints: number;
  todayPoints: number;
}

export interface DailyNote {
  id: string;
  date: string; // Format: YYYY-MM-DD
  content: string;
  mood?: 1 | 2 | 3 | 4 | 5; // 1 = very sad, 5 = very happy
  createdAt: string;
  updatedAt: string;
}

export interface ExportData {
  tasks: Task[];
  entries: Entry[];
  goals: Goal[];
  notes: DailyNote[];
  analytics: AnalyticsResponse;
  exportDate: string;
}

export interface ExportOptions {
  startDate: string;
  endDate: string;
  format: 'CSV' | 'JSON';
  includeNotes: boolean;
  includeTasks: boolean;
  includeGoals: boolean;
  includeAnalytics: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  joinedAt: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    weekStartsOnMonday: boolean;
    timeFormat: '12h' | '24h';
  };
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // ms
  action?: {
    label: string;
    callback: () => void;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface TaskFormData {
  name: string;
  points: number;
  isMandatory: boolean;
  category: 'Physical' | 'Mental';
  description?: string;
}

export interface GoalFormData {
  description: string;
  deadline: string;
  penalty: number;
  category: 'Physical' | 'Mental' | 'Career' | 'Personal' | 'Financial';
}

export interface EntryFormData {
  taskId: string;
  notes?: string;
  date: string;
}

export interface NoteFormData {
  content: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  date: string;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface ModalState {
  isOpen: boolean;
  type?: 'task' | 'goal' | 'entry' | 'note' | 'export' | 'badge' | 'levelUp';
  data?: any;
}

export interface ToastState {
  messages: NotificationMessage[];
}

// Filter and sort options
export interface TaskFilters {
  category?: 'Physical' | 'Mental' | 'All';
  mandatory?: boolean;
  sortBy: 'name' | 'points' | 'category' | 'created';
  sortOrder: 'asc' | 'desc';
}

export interface EntryFilters {
  dateRange: {
    start: string;
    end: string;
  };
  category?: 'Physical' | 'Mental' | 'All';
  sortBy: 'date' | 'points' | 'task';
  sortOrder: 'asc' | 'desc';
}

export interface GoalFilters {
  status: 'all' | 'active' | 'completed' | 'overdue';
  category?: 'Physical' | 'Mental' | 'Career' | 'Personal' | 'Financial' | 'All';
  sortBy: 'deadline' | 'progress' | 'created' | 'category';
  sortOrder: 'asc' | 'desc';
}