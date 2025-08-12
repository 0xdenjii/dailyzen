import { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart3, PieChart, Calendar, 
  Trophy, Flame, Activity, Target, Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyticsApi } from '@/lib/mockApi';
import type { AnalyticsResponse } from '@/types';
import { cn } from '@/lib/utils';

const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  className 
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  className?: string;
}) => {
  return (
    <Card className={cn("card-hover", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <p className={cn(
                "text-xs mt-1",
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HeatmapDay = ({ 
  day, 
  isSelected 
}: { 
  day: { date: string; activity: number; points: number }; 
  isSelected: boolean;
}) => {
  const getIntensityColor = (activity: number) => {
    switch (activity) {
      case 0: return 'bg-muted/30';
      case 1: return 'bg-success/30';
      case 2: return 'bg-success/50';
      case 3: return 'bg-success/70';
      case 4: return 'bg-success';
      default: return 'bg-muted/30';
    }
  };

  return (
    <div
      className={cn(
        "w-3 h-3 rounded-sm cursor-pointer transition-all",
        getIntensityColor(day.activity),
        isSelected && "ring-2 ring-primary",
        "hover:ring-2 hover:ring-primary/50"
      )}
      title={`${day.date}: ${day.points} points`}
    />
  );
};

const ActivityHeatmap = ({ 
  data 
}: { 
  data: { date: string; activity: number; points: number }[] 
}) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Generate grid for the last 365 days
  const weeks: Array<Array<{ date: string; activity: number; points: number }>> = [];
  const today = new Date();
  
  for (let week = 0; week < 52; week++) {
    const weekDays = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (51 - week) * 7 - (6 - day));
      const dateString = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateString) || { date: dateString, activity: 0, points: 0 };
      weekDays.push(dayData);
    }
    weeks.push(weekDays);
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity Heatmap
        </CardTitle>
        <CardDescription>Your activity intensity over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Heatmap Grid */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <HeatmapDay
                    key={day.date}
                    day={day}
                    isSelected={selectedDay === day.date}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div 
                  key={level}
                  className={cn(
                    "w-3 h-3 rounded-sm",
                    level === 0 ? 'bg-muted/30' :
                    level === 1 ? 'bg-success/30' :
                    level === 2 ? 'bg-success/50' :
                    level === 3 ? 'bg-success/70' :
                    'bg-success'
                  )}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PointsChart = ({ 
  data 
}: { 
  data: { label: string; value: number; date?: string }[] 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Points Over Time
            </CardTitle>
            <CardDescription>Your daily point accumulation</CardDescription>
          </div>
          <Select defaultValue="30days">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Bars */}
          <div className="flex items-end gap-1 h-32">
            {data.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t-sm transition-all hover:bg-primary-glow cursor-pointer"
                  style={{ 
                    height: `${maxValue > 0 ? (point.value / maxValue) * 100 : 0}%`,
                    minHeight: point.value > 0 ? '4px' : '2px'
                  }}
                  title={`${point.label}: ${point.value} points`}
                />
              </div>
            ))}
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{data[0]?.label}</span>
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoryBreakdown = ({ 
  breakdown 
}: { 
  breakdown: { physical: number; mental: number } 
}) => {
  const total = breakdown.physical + breakdown.mental;
  const physicalPercentage = total > 0 ? (breakdown.physical / total) * 100 : 0;
  const mentalPercentage = total > 0 ? (breakdown.mental / total) * 100 : 0;

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Category Distribution
        </CardTitle>
        <CardDescription>Breakdown of your total points</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Donut Chart Placeholder */}
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-muted" />
            <div 
              className="absolute inset-0 rounded-full border-8 border-accent-teal border-r-transparent border-b-transparent transform -rotate-90"
              style={{ 
                '--angle': `${(physicalPercentage / 100) * 360}deg`,
                transform: `rotate(-90deg)` 
              } as React.CSSProperties}
            />
            <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-teal" />
                <span className="text-sm">Physical</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{breakdown.physical}</div>
                <div className="text-xs text-muted-foreground">{physicalPercentage.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-orange" />
                <span className="text-sm">Mental</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{breakdown.mental}</div>
                <div className="text-xs text-muted-foreground">{mentalPercentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const BadgeShowcase = ({ 
  badges 
}: { 
  badges: Array<{ id: string; name: string; description: string; icon: string; rarity: string; unlockedAt?: string }> 
}) => {
  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Badges
          </CardTitle>
          <Badge variant="secondary">
            {unlockedBadges.length}/{badges.length}
          </Badge>
        </div>
        <CardDescription>Your earned achievements and progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round((unlockedBadges.length / badges.length) * 100)}%</span>
            </div>
            <Progress value={(unlockedBadges.length / badges.length) * 100} className="h-2" />
          </div>
          
          {/* Badge Grid */}
          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "p-3 rounded-lg text-center transition-all cursor-pointer",
                  badge.unlockedAt 
                    ? "bg-muted/50 hover:bg-muted" 
                    : "bg-muted/20 opacity-50"
                )}
                title={badge.description}
              >
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium truncate">{badge.name}</div>
                <div className="text-xs text-muted-foreground">{badge.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await analyticsApi.get(timeRange);
      if (response.success && response.data) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics & Insights
          </h1>
          <p className="text-muted-foreground">
            Deep dive into your progress and patterns
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as 'weekly' | 'monthly' | 'yearly')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Points"
          value={analytics.totalPoints.toLocaleString()}
          change="+12% vs last month"
          changeType="positive"
          icon={Trophy}
        />
        <StatCard
          title="Current Streak"
          value={`${analytics.streaks.current} days`}
          change={`Best: ${analytics.streaks.longest} days`}
          changeType="neutral"
          icon={Flame}
        />
        <StatCard
          title="Weekly Average"
          value={Math.round(analytics.weeklyAverage)}
          change="+8% vs last week"
          changeType="positive"
          icon={Activity}
        />
        <StatCard
          title="Current Level"
          value={analytics.userLevel.level}
          change={`${analytics.userLevel.xpToNextLevel} XP to next`}
          changeType="positive"
          icon={Target}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PointsChart data={analytics.pointsChartData} />
        <CategoryBreakdown breakdown={analytics.categoryBreakdown} />
      </div>

      {/* Heatmap and Badges */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityHeatmap data={analytics.heatmapData} />
        </div>
        <BadgeShowcase badges={analytics.badges} />
      </div>

      {/* Additional Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Key patterns in your behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Most Active Day</p>
                <p className="text-sm text-muted-foreground">Monday</p>
              </div>
              <Badge variant="secondary">18% above average</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Best Time of Day</p>
                <p className="text-sm text-muted-foreground">6:00 AM - 8:00 AM</p>
              </div>
              <Badge variant="secondary">Morning person</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Consistency Score</p>
                <p className="text-sm text-muted-foreground">Based on daily activity</p>
              </div>
              <Badge variant="default">85%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Goals Progress</CardTitle>
            <CardDescription>How you're tracking toward your goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Read 24 books this year</span>
                <span>65%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Complete a marathon</span>
                <span>45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Learn Spanish</span>
                <span>80%</span>
              </div>
              <Progress value={80} className="h-2" />
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <Badge variant="secondary">63% Average</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}