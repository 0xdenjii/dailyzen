import { useState, useEffect, useMemo } from 'react';
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
import type { AnalyticsResponse, UIBadge, HeatmapDay as HeatmapDayType } from '@/types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGetAnalytics } from '@/hooks/useAnalytics';
import { mapBackendBadgeToUIBadge } from '@/lib/mappers';
import { addDays, format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const LEVEL_COLORS = {
  1: 'text-badge-bronze',
  2: 'text-badge-silver',
  3: 'text-level-gold'
} as const;

const calculatePercentageChange = (current: number, previous: number): string => {
  if (previous === 0) {
    return current > 0 ? "+100%" : "+0%";
  }
  const change = ((current - previous) / previous) * 100;
  if (change > 0) return `+${change.toFixed(0)}%`;
  return `${change.toFixed(0)}%`;
};

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

const RecentBadges = ({ badges }: { badges: UIBadge[] }) => {
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

const ActivityHeatmap = ({ data }: { data: HeatmapDayType[] }) => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 365);
  const dateData = new Map(data.map(d => [d.date, d.activity]));
  const allDays = Array.from({ length: 366 }).map((_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    return { date: dateString, activity: dateData.get(dateString) || 0 };
  });
  const getColor = (activity) => {
    if (activity <= 0) return 'bg-muted/30';
    if (activity === 1) return 'bg-success/30';
    if (activity === 2) return 'bg-success/50';
    if (activity === 3) return 'bg-success/70';
    return 'bg-success';
  };
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Activity Heatmap</CardTitle>
        <CardDescription>Your activity intensity over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 justify-center">
          {allDays.map(day => (
            <div key={day.date} className={cn("w-3 h-3 rounded-sm", getColor(day.activity))} title={day.date} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


const QuickActions = () => {
  return (
    <Card className="card-hover">
      <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button asChild className="h-auto p-4 flex flex-col gap-2 btn-glow"><Link to="/tasks"><Plus className="h-5 w-5" /><span>Add Entry</span></Link></Button>
        <Button asChild variant="outline" className="h-auto p-4 flex flex-col gap-2"><Link to="/goals"><Target className="h-5 w-5" /><span>New Goal</span></Link></Button>
        <Button asChild variant="outline" className="h-auto p-4 flex flex-col gap-2"><Link to="/notes"><BookOpen className="h-5 w-5" /><span>Add Note</span></Link></Button>
        <Button asChild variant="outline" className="h-auto p-4 flex flex-col gap-2"><Link to="/analytics"><BarChart3 className="h-5 w-5" /><span>Analytics</span></Link></Button>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');

  const { data: analytics, isLoading } = useGetAnalytics(timeRange);

  // Use the mapper to transform badges for the UI
  const uiBadges = useMemo(() => {
    return analytics?.badges.map(mapBackendBadgeToUIBadge) || [];
  }, [analytics?.badges]);

  const weeklyPointsData = useMemo(() => {
    if (!analytics) return [];

    const dateMap = new Map(analytics.pointsChartData.map(p => [p.label, p.value]));
    const data = Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(new Date(), -6 + i);
      const label = format(date, 'MMM dd');
      return { label, value: dateMap.get(label) || 0 };
    });
    return data;
  }, [analytics]);

  const totalPointsChange = useMemo(() => {
    if (!analytics) return "";
    const currentPeriodPoints = analytics.pointsChartData.reduce((sum, item) => sum + item.value, 0);
    return calculatePercentageChange(currentPeriodPoints, analytics.previousPeriodPoints);
  }, [analytics]);


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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">
            Welcome back, {user.username}!
          </h1>
          <p className="text-muted-foreground">Here's your progress overview.</p>
        </div>
        <Button asChild className="btn-glow gradient-primary"><Link to="/tasks"><Plus className="mr-2 h-4 w-4" />Quick Entry</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Points" value={analytics.totalPoints.toLocaleString()} change={`${totalPointsChange} this ${timeRange.replace('ly', '')}`} changeType={totalPointsChange.startsWith('+') ? 'positive' : 'negative'} icon={Trophy} gradient="gradient-primary" />
        <StatCard title="Today's Points" value={analytics.todayPoints} change={`${(analytics.todayPoints > analytics.weeklyAverage / 7) ? '+' : ''}${Math.round(((analytics.todayPoints - (analytics.weeklyAverage / 7)) / (analytics.weeklyAverage / 7 || 1)) * 100)}% vs avg`} changeType={analytics.todayPoints > analytics.weeklyAverage / 7 ? 'positive' : 'negative'} icon={Activity} gradient="gradient-success" />
        <StatCard title="Current Streak" value={`${analytics.streaks.current} days`} change={`Personal best: ${analytics.streaks.longest} days`} changeType="neutral" icon={Flame} gradient="gradient-accent" />
        <StatCard title="Current Level" value={analytics.userLevel.level} change={`${analytics.userLevel.xpToNextLevel} XP to next`} changeType="positive" icon={Star} gradient="bg-level-gold" />
      </div>


      {/* XP Progress */}
      <XPBar userLevel={{
        level: analytics.userLevel.level,
        currentXP: analytics.userLevel.currentXp,
        xpToNextLevel: analytics.userLevel.xpToNextLevel,
        totalXP: analytics.userLevel.totalXp
      }} />

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Points Over Time</CardTitle>
                <div className="flex gap-2">
                  <Button variant={timeRange === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('weekly')}>Weekly</Button>
                  <Button variant={timeRange === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('monthly')}>Monthly</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.pointsChartData}>
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <ActivityHeatmap data={analytics.heatmapData} />
        </div>

        <div className="space-y-6">
          <StreakDisplay streaks={analytics.streaks} />
          <CategoryBreakdown breakdown={analytics.categoryBreakdown} />
          <RecentBadges badges={uiBadges} />
          <QuickActions />
        </div>
      </div>

    </div>
  );
}