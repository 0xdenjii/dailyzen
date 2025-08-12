import { useState, useEffect } from 'react';
import { 
  Trophy, Flame, TrendingUp, Calendar, Star, 
  Award, Plus, ArrowUp, ArrowDown, Activity,
  BarChart3, PieChart, Target, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsApi } from '@/lib/mockApi';
import type { AnalyticsResponse } from '@/types';
import { cn } from '@/lib/utils';

const LEVEL_COLORS = {
  1: 'text-badge-bronze',
  2: 'text-badge-silver', 
  3: 'text-level-gold'
} as const;

const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  className,
  gradient 
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  className?: string;
  gradient?: string;
}) => {
  return (
    <Card className={cn("card-hover transition-smooth", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", gradient || "bg-muted/50")}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {changeType === 'positive' && <ArrowUp className="h-3 w-3 text-success" />}
            {changeType === 'negative' && <ArrowDown className="h-3 w-3 text-destructive" />}
            <span className={cn(
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive'
            )}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const XPBar = ({ userLevel }: { userLevel: { level: number; currentXP: number; xpToNextLevel: number; totalXP: number } }) => {
  const progressPercentage = (userLevel.currentXP / (userLevel.currentXP + userLevel.xpToNextLevel)) * 100;
  
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className={cn("h-6 w-6", LEVEL_COLORS[Math.min(userLevel.level, 3) as keyof typeof LEVEL_COLORS] || "text-level-gold")} />
              <div>
                <CardTitle className="text-lg">Level {userLevel.level}</CardTitle>
                <CardDescription>
                  {userLevel.currentXP} / {userLevel.currentXP + userLevel.xpToNextLevel} XP
                </CardDescription>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="gradient-accent text-white">
            {userLevel.xpToNextLevel} XP to next level
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Current Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StreakDisplay = ({ streaks }: { streaks: { current: number; longest: number } }) => {
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-streak-fire streak-flame" />
          Activity Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-streak-fire">{streaks.current}</div>
            <div className="text-sm text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-level-gold">{streaks.longest}</div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoryBreakdown = ({ breakdown }: { breakdown: { physical: number; mental: number } }) => {
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-teal"></div>
                Physical
              </span>
              <span className="font-medium">{breakdown.physical} pts</span>
            </div>
            <Progress value={physicalPercentage} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-orange"></div>
                Mental
              </span>
              <span className="font-medium">{breakdown.mental} pts</span>
            </div>
            <Progress value={mentalPercentage} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RecentBadges = ({ badges }: { badges: any[] }) => {
  const unlockedBadges = badges.filter(badge => badge.unlockedAt);
  const recentBadges = unlockedBadges.slice(0, 3);

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentBadges.map((badge) => (
            <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="text-2xl">{badge.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{badge.name}</span>
                  <Badge variant={
                    badge.rarity === 'Legendary' ? 'default' :
                    badge.rarity === 'Gold' ? 'secondary' : 
                    'outline'
                  }>
                    {badge.rarity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ))}
          
          {recentBadges.length === 0 && (
            <div className="text-center py-4">
              <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Complete tasks to earn your first badge!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActions = () => {
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Jump into your daily routine</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-auto p-4 flex flex-col gap-2 btn-glow">
            <Plus className="h-5 w-5" />
            <span className="text-sm">Add Entry</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <Target className="h-5 w-5" />
            <span className="text-sm">New Goal</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm">Add Note</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Analytics</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await analyticsApi.get();
        if (response.success && response.data) {
          setAnalytics(response.data);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">
            Welcome back, John!
          </h1>
          <p className="text-muted-foreground">
            Here's your progress overview for today
          </p>
        </div>
        <Button className="btn-glow gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Quick Entry
        </Button>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Points"
          value={analytics.totalPoints.toLocaleString()}
          change="+12% this week"
          changeType="positive"
          icon={Trophy}
          gradient="gradient-primary"
        />
        <StatCard
          title="Today's Points"
          value={analytics.todayPoints}
          change={analytics.todayPoints > analytics.weeklyAverage / 7 ? "+5% vs avg" : "-8% vs avg"}
          changeType={analytics.todayPoints > analytics.weeklyAverage / 7 ? "positive" : "negative"}
          icon={Activity}
          gradient="gradient-success"
        />
        <StatCard
          title="Current Streak"
          value={`${analytics.streaks.current} days`}
          change="Personal best: 28 days"
          changeType="neutral"
          icon={Flame}
          gradient="gradient-accent"
        />
        <StatCard
          title="Current Level"
          value={analytics.userLevel.level}
          change={`${analytics.userLevel.xpToNextLevel} XP to next`}
          changeType="positive"
          icon={Star}
          className="relative overflow-hidden"
          gradient="bg-level-gold"
        />
      </div>

      {/* XP Progress */}
      <XPBar userLevel={analytics.userLevel} />

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Points Chart Placeholder */}
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Points Over Time
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Daily</Button>
                  <Button variant="default" size="sm">Weekly</Button>
                  <Button variant="outline" size="sm">Monthly</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">Interactive chart will be rendered here</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Heatmap Placeholder */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Activity Heatmap
              </CardTitle>
              <CardDescription>
                Your activity over the past year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">Activity heatmap will be rendered here</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          <StreakDisplay streaks={analytics.streaks} />
          <CategoryBreakdown breakdown={analytics.categoryBreakdown} />
          <RecentBadges badges={analytics.badges} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}