import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, BarChart3,  Calendar,
  Trophy, Flame, Activity, Target, Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyticsApi } from '@/lib/mockApi';
import type { AnalyticsResponse, Goal, HeatmapDay, UIBadge } from '@/types';
import { cn } from '@/lib/utils';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useGetAnalytics } from '@/hooks/useAnalytics';
import { useGetGoals } from '@/hooks/useGoals';
import { mapBackendBadgeToUIBadge } from '@/lib/mappers';
import { toast } from '@/hooks/use-toast';

type TimeRange = 'weekly' | 'monthly' | 'yearly';
const calculatePercentageChange = (current: number, previous: number): string => {
  if (previous === 0) {
    return current > 0 ? "+100%" : "+0%";
  }
  const change = ((current - previous) / previous) * 100;
  if (change > 0) return `+${change.toFixed(0)}%`;
  return `${change.toFixed(0)}%`;
};

const handleExportData = async () => {
  try {
    const response = await fetch('/api/export', { // Use fetch directly to handle blob
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'dailyzen_export.json';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1];
      }
    }
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export data:", error);
    // You can add a toast notification here
    toast({
      title: 'Export Failed',
      description: 'There was an error exporting your data. Please try again later.',
      variant: 'destructive',
    });
  }
};


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



const PointsChart = ({ data, timeRange }) => (
  <Card className="card-hover">
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Points Over Time</CardTitle>
      <CardDescription>Daily point accumulation for the selected period.</CardDescription>
    </CardHeader>
    <CardContent className="pl-2">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={timeRange === 'weekly' ? 0 : 'preserveStartEnd'} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);


const CategoryBreakdown = ({ breakdown }) => {
  const data = [
    { name: 'Physical', value: breakdown.physical, color: 'hsl(173 80% 40%)' }, // teal
    { name: 'Mental', value: breakdown.mental, color: 'hsl(25 95% 53%)' },   // orange
  ];
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Category Distribution</CardTitle>
        <CardDescription>Breakdown of all-time points.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>);
              }}>
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};


const BadgeShowcase = ({ badges }: { badges: UIBadge[] }) => {
  const totalPossible = 6; // Consistency, Volume, Mental, Physical, Dedication, Ambition
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Achievements</CardTitle>
          <Badge variant="secondary">{badges.length} / {totalPossible}</Badge>
        </div>
        <CardDescription>Your earned badges and progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={(badges.length / totalPossible) * 100} className="mb-4 h-2" />
        {badges.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div key={badge.id} className="p-3 rounded-lg text-center bg-muted/50" title={badge.description}>
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium truncate">{badge.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">No badges earned yet. Keep up the great work!</div>
        )}
      </CardContent>
    </Card>
  );
};


const ActivityHeatmap = ({ data }: { data: HeatmapDay[] }) => {
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

const GoalsProgress = ({ goals }: { goals: Goal[] }) => {
  const activeGoals = goals.filter(g => !g.isCompleted).slice(0, 4); // Show up to 4 active goals
  const overallProgress = activeGoals.length > 0 ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length : 0;
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Goals Progress</CardTitle>
        <CardDescription>How you're tracking toward your active goals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeGoals.map(goal => (
          <div key={goal.id} className="space-y-2">
            <div className="flex justify-between text-sm"><span className='truncate pr-2'>{goal.description}</span><span>{goal.progress}%</span></div>
            <Progress value={goal.progress} className="h-2" />
          </div>
        ))}
        {activeGoals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active goals to display.</p>}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant="secondary">{Math.round(overallProgress)}% Average</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  const { data: analytics, isLoading: isLoadingAnalytics } = useGetAnalytics(timeRange);
  const { data: goals = [], isLoading: isLoadingGoals } = useGetGoals(); // Fetch goals for the progress card

  const uiBadges = useMemo(() => analytics?.badges.map(mapBackendBadgeToUIBadge) || [], [analytics]);

  const isLoading = isLoadingAnalytics || isLoadingGoals;


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
  const totalPointsChange = calculatePercentageChange(analytics.pointsChartData.reduce((sum, item) => sum + item.value, 0), analytics.previousPeriodPoints);
  const weeklyAvgChange = calculatePercentageChange(analytics.weeklyAverage, analytics.prevWeeklyAverage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />Analytics & Insights
          </h1>
          <p className="text-muted-foreground">Deep dive into your progress and patterns</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExportData}><Download className="h-4 w-4" />Export Data</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Points this period" value={analytics.pointsChartData.reduce((sum, i) => sum + i.value, 0).toLocaleString()} change={`${totalPointsChange} vs last ${timeRange.replace('ly', '')}`} changeType={totalPointsChange.startsWith('+') ? 'positive' : 'negative'} icon={Trophy} />
        <StatCard title="Current Streak" value={`${analytics.streaks.current} days`} change={`Best: ${analytics.streaks.longest} days`} changeType="neutral" icon={Flame} />
        <StatCard title="Weekly Average" value={Math.round(analytics.weeklyAverage)} change={`${weeklyAvgChange} vs last week`} changeType={weeklyAvgChange.startsWith('+') ? 'positive' : 'negative'} icon={Activity} />
        <StatCard title="Current Level" value={analytics.userLevel.level} change={`${analytics.userLevel.xpToNextLevel} XP to next`} changeType="positive" icon={Target} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PointsChart data={analytics.pointsChartData} timeRange={timeRange} />
        <CategoryBreakdown breakdown={analytics.categoryBreakdown} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ActivityHeatmap data={analytics.heatmapData} /></div>
        <BadgeShowcase badges={uiBadges} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GoalsProgress goals={goals} />
        <Card className="card-hover"><CardHeader><CardTitle>Performance Insights</CardTitle><CardDescription>Coming Soon</CardDescription></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    </div>
  );

}