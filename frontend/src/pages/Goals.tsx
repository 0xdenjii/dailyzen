import { useState, useEffect } from 'react';
import { 
  Target, Plus, Calendar, Trophy, AlertCircle, 
  Edit3, Trash2, CheckCircle2, Clock, Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { goalsApi } from '@/lib/mockApi';
import type { Goal, GoalFormData } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const CATEGORY_COLORS = {
  Physical: 'bg-accent-teal',
  Mental: 'bg-accent-orange',
  Career: 'bg-primary',
  Personal: 'bg-success',
  Financial: 'bg-level-gold'
};

const CATEGORY_ICONS = {
  Physical: '💪',
  Mental: '🧠',
  Career: '💼',
  Personal: '🌱',
  Financial: '💰'
};

const getUrgencyStatus = (deadline: string) => {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return { status: 'overdue', color: 'destructive', label: 'Overdue' };
  if (daysUntil <= 7) return { status: 'urgent', color: 'warning', label: 'Due Soon' };
  if (daysUntil <= 30) return { status: 'approaching', color: 'secondary', label: 'Approaching' };
  return { status: 'normal', color: 'outline', label: 'On Track' };
};

const GoalCard = ({ 
  goal, 
  onEdit, 
  onDelete, 
  onUpdateProgress 
}: { 
  goal: Goal; 
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onUpdateProgress: (goalId: string, progress: number) => void;
}) => {
  const urgency = getUrgencyStatus(goal.deadline);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [newProgress, setNewProgress] = useState(goal.progress);

  const handleProgressUpdate = async () => {
    setIsUpdatingProgress(true);
    try {
      await onUpdateProgress(goal.id, newProgress);
      toast({
        title: "Progress Updated",
        description: "Goal progress has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  return (
    <Card className="card-hover group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl">{CATEGORY_ICONS[goal.category]}</div>
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight">{goal.description}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {goal.category}
                </Badge>
                <Badge variant={urgency.color as any} className="text-xs">
                  {urgency.label}
                </Badge>
                {goal.isCompleted && (
                  <Badge variant="default" className="text-xs bg-success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(goal.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>

        {/* Deadline Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Due: {format(new Date(goal.deadline), 'MMM dd, yyyy')}</span>
          {goal.penalty > 0 && (
            <>
              <span>•</span>
              <span className="text-warning">Penalty: {goal.penalty} pts</span>
            </>
          )}
        </div>

        {/* Quick Progress Update */}
        {!goal.isCompleted && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              type="number"
              min="0"
              max="100"
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              className="w-20 h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleProgressUpdate}
              disabled={isUpdatingProgress || newProgress === goal.progress}
              className="ml-auto"
            >
              {isUpdatingProgress ? 'Updating...' : 'Update'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GoalForm = ({ 
  goal, 
  onSubmit, 
  onCancel,
  isLoading 
}: { 
  goal?: Goal; 
  onSubmit: (data: GoalFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    description: goal?.description || '',
    deadline: goal?.deadline || '',
    penalty: goal?.penalty || 0,
    category: goal?.category || 'Personal'
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    goal?.deadline ? new Date(goal.deadline) : undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    onSubmit({
      ...formData,
      deadline: selectedDate.toISOString().split('T')[0]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">Goal Description</Label>
        <Textarea
          id="description"
          placeholder="e.g., Read 30 books this year, Complete a marathon..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Physical">💪 Physical</SelectItem>
              <SelectItem value="Mental">🧠 Mental</SelectItem>
              <SelectItem value="Career">💼 Career</SelectItem>
              <SelectItem value="Personal">🌱 Personal</SelectItem>
              <SelectItem value="Financial">💰 Financial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="penalty">Penalty Points</Label>
          <Input
            id="penalty"
            type="number"
            min="0"
            placeholder="0"
            value={formData.penalty}
            onChange={(e) => setFormData({ ...formData, penalty: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deadline</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading || !selectedDate} className="flex-1">
          {isLoading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await goalsApi.getAll();
      if (response.success && response.data) {
        setGoals(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async (goalData: GoalFormData) => {
    setIsCreating(true);
    try {
      const response = await goalsApi.create(goalData);
      if (response.success && response.data) {
        setGoals(prev => [...prev, response.data!]);
        setIsFormOpen(false);
        toast({
          title: "Goal Created",
          description: "Your new goal has been created successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateGoal = async (goalData: GoalFormData) => {
    if (!editingGoal) return;
    
    setIsCreating(true);
    try {
      const response = await goalsApi.update(editingGoal.id, goalData);
      if (response.success && response.data) {
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? response.data! : g));
        setEditingGoal(null);
        setIsFormOpen(false);
        toast({
          title: "Goal Updated",
          description: "Your goal has been updated successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await goalsApi.delete(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast({
        title: "Goal Deleted",
        description: "Goal has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    try {
      const response = await goalsApi.update(goalId, { progress });
      if (response.success && response.data) {
        setGoals(prev => prev.map(g => g.id === goalId ? response.data! : g));
      }
    } catch (error) {
      throw error;
    }
  };

  const filteredGoals = goals.filter(goal => {
    switch (filter) {
      case 'active':
        return !goal.isCompleted && new Date(goal.deadline) >= new Date();
      case 'completed':
        return goal.isCompleted;
      case 'overdue':
        return !goal.isCompleted && new Date(goal.deadline) < new Date();
      default:
        return true;
    }
  });

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.isCompleted).length,
    active: goals.filter(g => !g.isCompleted && new Date(g.deadline) >= new Date()).length,
    overdue: goals.filter(g => !g.isCompleted && new Date(g.deadline) < new Date()).length
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary flex items-center gap-2">
            <Target className="h-8 w-8" />
            Long-term Goals
          </h1>
          <p className="text-muted-foreground">
            Track your major life objectives and milestones
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow gradient-primary" onClick={() => setEditingGoal(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </DialogTitle>
              <DialogDescription>
                {editingGoal 
                  ? 'Update your goal details and track your progress.' 
                  : 'Set a new long-term goal to work towards.'
                }
              </DialogDescription>
            </DialogHeader>
            <GoalForm
              goal={editingGoal || undefined}
              onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGoal(null);
              }}
              isLoading={isCreating}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-teal/10">
                <Clock className="h-5 w-5 text-accent-teal" />
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-teal">{stats.active}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active ({stats.active})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed ({stats.completed})
        </Button>
        <Button
          variant={filter === 'overdue' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('overdue')}
        >
          Overdue ({stats.overdue})
        </Button>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(goal) => {
                setEditingGoal(goal);
                setIsFormOpen(true);
              }}
              onDelete={handleDeleteGoal}
              onUpdateProgress={handleUpdateProgress}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === 'all' ? 'No goals yet' : `No ${filter} goals`}
            </h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'all' 
                ? 'Create your first goal to start tracking your long-term progress.'
                : `You don't have any ${filter} goals at the moment.`
              }
            </p>
            {filter === 'all' && (
              <Button 
                className="btn-glow"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}