// Mock API service for the Self-Development App
import type { 
  Task, Entry, Goal, AnalyticsResponse, DailyNote, Badge, 
  ApiResponse, TaskFormData, GoalFormData, EntryFormData, NoteFormData 
} from '@/types';

// Simulate network delay
const delay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data
const mockTasks: Task[] = [
  {
    id: '1',
    name: 'Morning Workout',
    points: 20,
    isMandatory: true,
    category: 'Physical',
    description: '30 minutes of exercise to start the day',
    createdAt: '2024-01-01T08:00:00Z'
  },
  {
    id: '2',
    name: 'Meditation',
    points: 15,
    isMandatory: true,
    category: 'Mental',
    description: '10 minutes of mindfulness meditation',
    createdAt: '2024-01-01T08:15:00Z'
  },
  {
    id: '3',
    name: 'Read for 30 minutes',
    points: 10,
    isMandatory: false,
    category: 'Mental',
    description: 'Read personal development or fiction',
    createdAt: '2024-01-01T08:30:00Z'
  },
  {
    id: '4',
    name: 'Drink 8 glasses of water',
    points: 8,
    isMandatory: true,
    category: 'Physical',
    description: 'Stay hydrated throughout the day',
    createdAt: '2024-01-01T09:00:00Z'
  },
  {
    id: '5',
    name: 'Write in journal',
    points: 12,
    isMandatory: false,
    category: 'Mental',
    description: 'Reflect on the day and thoughts',
    createdAt: '2024-01-01T09:15:00Z'
  },
  {
    id: '6',
    name: 'Skip workout',
    points: -25,
    isMandatory: false,
    category: 'Physical',
    description: 'Penalty for missing planned workout',
    createdAt: '2024-01-01T09:30:00Z'
  }
];

const mockGoals: Goal[] = [
  {
    id: '1',
    description: 'Read 24 books this year',
    deadline: '2024-12-31',
    penalty: 50,
    progress: 65,
    category: 'Mental',
    createdAt: '2024-01-01T00:00:00Z',
    isCompleted: false
  },
  {
    id: '2',
    description: 'Complete a marathon',
    deadline: '2024-10-15',
    penalty: 100,
    progress: 45,
    category: 'Physical',
    createdAt: '2024-01-15T00:00:00Z',
    isCompleted: false
  },
  {
    id: '3',
    description: 'Learn Spanish conversational level',
    deadline: '2024-08-30',
    penalty: 75,
    progress: 80,
    category: 'Personal',
    createdAt: '2024-02-01T00:00:00Z',
    isCompleted: false
  },
  {
    id: '4',
    description: 'Build emergency fund ($10k)',
    deadline: '2024-12-31',
    penalty: 200,
    progress: 30,
    category: 'Financial',
    createdAt: '2024-01-01T00:00:00Z',
    isCompleted: false
  }
];

const mockBadges: Badge[] = [
  {
    id: '1',
    name: 'Early Bird',
    description: 'Complete morning routine 7 days straight',
    icon: '🌅',
    rarity: 'Bronze',
    requirement: '7 consecutive morning routines',
    unlockedAt: '2024-01-08T06:00:00Z'
  },
  {
    id: '2',
    name: 'Meditation Master',
    description: 'Meditate for 30 days straight',
    icon: '🧘‍♂️',
    rarity: 'Silver',
    requirement: '30 consecutive meditation sessions',
    unlockedAt: '2024-01-31T07:00:00Z'
  },
  {
    id: '3',
    name: 'Fitness Enthusiast',
    description: 'Work out 100 times',
    icon: '💪',
    rarity: 'Gold',
    requirement: '100 workout sessions',
    unlockedAt: '2024-04-15T18:00:00Z'
  },
  {
    id: '4',
    name: 'Mindful Reader',
    description: 'Read for 365 hours total',
    icon: '📚',
    rarity: 'Legendary',
    requirement: '365 hours of reading'
  }
];

const generateMockEntries = (): Entry[] => {
  const entries: Entry[] = [];
  const today = new Date();
  
  // Generate entries for the last 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // Simulate some completed tasks each day (not all days, not all tasks)
    const dailyTasks = mockTasks.filter(() => Math.random() > 0.3);
    
    dailyTasks.forEach((task, index) => {
      if (Math.random() > 0.2) { // 80% chance of completion
        entries.push({
          id: `entry-${dateString}-${task.id}-${index}`,
          taskId: task.id,
          date: dateString,
          completedAt: `${dateString}T${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00Z`,
          points: task.points,
          notes: Math.random() > 0.7 ? 'Felt great today!' : undefined
        });
      }
    });
  }
  
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockEntries = generateMockEntries();

const generateAnalytics = (): AnalyticsResponse => {
  const last30Days = mockEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return entryDate >= thirtyDaysAgo;
  });

  const pointsChartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateString = date.toISOString().split('T')[0];
    const dayEntries = mockEntries.filter(entry => entry.date === dateString);
    const points = dayEntries.reduce((sum, entry) => sum + entry.points, 0);
    
    return {
      label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      value: points,
      date: dateString
    };
  });

  const heatmapData = Array.from({ length: 365 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (364 - i));
    const dateString = date.toISOString().split('T')[0];
    const dayEntries = mockEntries.filter(entry => entry.date === dateString);
    const points = dayEntries.reduce((sum, entry) => sum + entry.points, 0);
    
    return {
      date: dateString,
      activity: Math.min(4, Math.floor(points / 20)), // 0-4 scale
      points
    };
  });

  const physicalPoints = mockEntries
    .filter(entry => mockTasks.find(task => task.id === entry.taskId)?.category === 'Physical')
    .reduce((sum, entry) => sum + entry.points, 0);
  
  const mentalPoints = mockEntries
    .filter(entry => mockTasks.find(task => task.id === entry.taskId)?.category === 'Mental')
    .reduce((sum, entry) => sum + entry.points, 0);

  const totalPoints = mockEntries.reduce((sum, entry) => sum + entry.points, 0);
  const todayEntries = mockEntries.filter(entry => entry.date === new Date().toISOString().split('T')[0]);
  const todayPoints = todayEntries.reduce((sum, entry) => sum + entry.points, 0);

  return {
    streaks: {
      current: 12,
      longest: 28,
      lastActivity: new Date().toISOString().split('T')[0]
    },
    pointsChartData,
    heatmapData,
    categoryBreakdown: {
      physical: physicalPoints,
      mental: mentalPoints
    },
    userLevel: {
      level: Math.floor(totalPoints / 500) + 1,
      currentXP: totalPoints % 500,
      xpToNextLevel: 500 - (totalPoints % 500),
      totalXP: totalPoints
    },
    badges: mockBadges,
    weeklyAverage: last30Days.reduce((sum, entry) => sum + entry.points, 0) / 4,
    monthlyAverage: last30Days.reduce((sum, entry) => sum + entry.points, 0),
    totalPoints,
    todayPoints
  };
};

// API functions
export const tasksApi = {
  async getAll(): Promise<ApiResponse<Task[]>> {
    await delay();
    return { success: true, data: mockTasks };
  },

  async create(taskData: TaskFormData): Promise<ApiResponse<Task>> {
    await delay();
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      ...taskData,
      createdAt: new Date().toISOString()
    };
    mockTasks.push(newTask);
    return { success: true, data: newTask };
  },

  async update(id: string, taskData: Partial<TaskFormData>): Promise<ApiResponse<Task>> {
    await delay();
    const taskIndex = mockTasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return { success: false, error: 'Task not found' };
    }
    
    mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...taskData };
    return { success: true, data: mockTasks[taskIndex] };
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    await delay();
    const taskIndex = mockTasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return { success: false, error: 'Task not found' };
    }
    
    mockTasks.splice(taskIndex, 1);
    return { success: true };
  }
};

export const entriesApi = {
  async getByDate(date: string): Promise<ApiResponse<{ entries: Entry[], totalPoints: number }>> {
    await delay();
    const dayEntries = mockEntries.filter(entry => entry.date === date);
    const totalPoints = dayEntries.reduce((sum, entry) => sum + entry.points, 0);
    
    return { 
      success: true, 
      data: { entries: dayEntries, totalPoints } 
    };
  },

  async create(entryData: EntryFormData): Promise<ApiResponse<Entry>> {
    await delay();
    const task = mockTasks.find(t => t.id === entryData.taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    const newEntry: Entry = {
      id: Math.random().toString(36).substr(2, 9),
      ...entryData,
      completedAt: new Date().toISOString(),
      points: task.points
    };
    
    mockEntries.unshift(newEntry);
    return { success: true, data: newEntry };
  }
};

export const goalsApi = {
  async getAll(): Promise<ApiResponse<Goal[]>> {
    await delay();
    return { success: true, data: mockGoals };
  },

  async create(goalData: GoalFormData): Promise<ApiResponse<Goal>> {
    await delay();
    const newGoal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      ...goalData,
      progress: 0,
      createdAt: new Date().toISOString(),
      isCompleted: false
    };
    mockGoals.push(newGoal);
    return { success: true, data: newGoal };
  },

  async update(id: string, goalData: Partial<GoalFormData & { progress: number }>): Promise<ApiResponse<Goal>> {
    await delay();
    const goalIndex = mockGoals.findIndex(goal => goal.id === id);
    if (goalIndex === -1) {
      return { success: false, error: 'Goal not found' };
    }
    
    mockGoals[goalIndex] = { 
      ...mockGoals[goalIndex], 
      ...goalData,
      isCompleted: goalData.progress === 100
    };
    return { success: true, data: mockGoals[goalIndex] };
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    await delay();
    const goalIndex = mockGoals.findIndex(goal => goal.id === id);
    if (goalIndex === -1) {
      return { success: false, error: 'Goal not found' };
    }
    
    mockGoals.splice(goalIndex, 1);
    return { success: true };
  }
};

export const analyticsApi = {
  async get(range: 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<ApiResponse<AnalyticsResponse>> {
    await delay();
    return { success: true, data: generateAnalytics() };
  }
};

export const notesApi = {
  async getByDate(date: string): Promise<ApiResponse<DailyNote | null>> {
    await delay();
    // For demo, return a note if it's within the last week
    const noteDate = new Date(date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    if (noteDate >= weekAgo && Math.random() > 0.5) {
      return {
        success: true,
        data: {
          id: `note-${date}`,
          date,
          content: 'Today was a productive day! I managed to complete my morning routine and felt energized throughout the day.',
          mood: Math.floor(Math.random() * 5) + 1 as 1 | 2 | 3 | 4 | 5,
          createdAt: `${date}T20:00:00Z`,
          updatedAt: `${date}T20:00:00Z`
        }
      };
    }
    
    return { success: true, data: null };
  },

  async createOrUpdate(noteData: NoteFormData): Promise<ApiResponse<DailyNote>> {
    await delay();
    const note: DailyNote = {
      id: `note-${noteData.date}`,
      ...noteData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return { success: true, data: note };
  }
};