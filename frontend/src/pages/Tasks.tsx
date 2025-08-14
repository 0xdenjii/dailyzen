import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit3, Trash2, CheckCircle2, Circle,
  Star, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { tasksApi, entriesApi } from '@/lib/mockApi';
import type { Task, TaskFormData, Entry } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useGetEntriesForDate, useCreateEntry, useDeleteEntry } from '@/hooks/useEntries';
import { Progress } from '@/components/ui/progress';



const TaskCard = ({
  task,
  isCompleted,
  onEdit,
  onDelete,
  onToggleComplete,
  isToggling,
  completedEntry
}: {
  task: Task;
  isCompleted: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
  isToggling?: boolean;
  completedEntry?: Entry;
}) => {
  return (
    <Card className={cn(
      "card-hover group transition-all duration-300",
      isCompleted && "bg-success/5 border-success/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "p-0 h-6 w-6 rounded-full transition-all",
              isCompleted ? "text-success hover:text-success/80" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onToggleComplete(task)}
            disabled={isToggling}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 success-pulse" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className={cn(
                  "text-lg leading-tight",
                  isCompleted && "line-through text-muted-foreground"
                )}>
                  {task.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={task.category === 'Physical' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {task.category === 'Physical' ? '💪' : '🧠'} {task.category}
                  </Badge>
                  <Badge
                    variant={task.points > 0 ? 'outline' : 'destructive'}
                    className="text-xs"
                  >
                    {task.points > 0 ? '+' : ''}{task.points} pts
                  </Badge>
                  {task.isMandatory && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Daily
                    </Badge>
                  )}
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
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {task.description}
              </p>
            )}

            {isCompleted && completedEntry?.notes && (
              <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> {completedEntry.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const TaskForm = ({
  task,
  onSubmit,
  onCancel,
  isLoading
}: {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    name: task?.name || '',
    points: task?.points || 10,
    isMandatory: task?.isMandatory || false,
    category: task?.category || 'Physical',
    description: task?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Task Name</Label>
        <Input
          id="name"
          placeholder="e.g., 30-minute workout, Read for 20 minutes..."
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add any additional details or instructions..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            placeholder="10"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="mandatory"
          checked={formData.isMandatory}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, isMandatory: checked as boolean })
          }
        />
        <Label htmlFor="mandatory" className="text-sm cursor-pointer">
          Make this a daily mandatory task
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function Tasks() {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'physical' | 'mental'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'category'>('name');

  const today = new Date().toISOString().split('T')[0];

  const { data: tasks = [], isLoading: isLoadingTasks } = useGetTasks();
  const { data: entriesData, isLoading: isLoadingEntries } = useGetEntriesForDate(today);
  const todayEntries = entriesData?.entries || [];

  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: createEntry, isPending: isCreatingEntry } = useCreateEntry();
  const { mutate: deleteEntry, isPending: isDeletingEntry } = useDeleteEntry();

  const isLoading = isLoadingTasks || isLoadingEntries;

  const handleFormSubmit = (formData) => {
    if (editingTask) {
      updateTask({ taskId: editingTask.id, data: formData }, {
        onSuccess: () => {
          toast({ title: "Task Updated", description: "Your task has been updated successfully!" });
          setIsFormOpen(false);
          setEditingTask(null);
        },
        onError: () => toast({ title: "Error", description: "Failed to update task.", variant: "destructive" })
      });
    } else {
      createTask(formData, {
        onSuccess: () => {
          toast({ title: "Task Created", description: "Your new task has been created successfully!" });
          setIsFormOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to create task.", variant: "destructive" })
      });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId, {
      onSuccess: () => toast({ title: "Task Deleted", description: "Task has been removed successfully." }),
      onError: () => toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" })
    });
  };

  const handleToggleComplete = (task: Task) => {
    const existingEntry = todayEntries.find(entry => entry.taskId === task.id);
    if (existingEntry) {
      deleteEntry({ entryId: existingEntry.id, date: today }, {
        onSuccess: () => toast({ title: "Task Uncompleted", description: `Removed ${task.name} from today's completed tasks.` }),
        onError: () => toast({ title: "Error", description: "Failed to un-complete task.", variant: "destructive" })
      });
    } else {
      createEntry({ taskId: task.id, date: today }, {
        onSuccess: () => toast({ title: "Task Completed! 🎉", description: `You earned ${task.points} points for completing ${task.name}!` }),
        onError: () => toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" })
      });
    }
  };


  // const filteredTasks = tasks.filter(task => {
  //   if (filter === 'physical') return task.category === 'Physical';
  //   if (filter === 'mental') return task.category === 'Mental';
  //   return true;
  // }).sort((a, b) => {
  //   switch (sortBy) {
  //     case 'points':
  //       return b.points - a.points;
  //     case 'category':
  //       return a.category.localeCompare(b.category);
  //     default:
  //       return a.name.localeCompare(b.name);
  //   }
  // });

  const { pendingTasks, completedTasks, todayPoints, totalPossiblePoints } = useMemo(() => {
    const filtered = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.category.toLowerCase() === filter;
    }).sort((a,b) => {
        switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return a.name.localeCompare(b.name);
    }
    });

    const completed = filtered.filter(task => todayEntries.some(entry => entry.taskId === task.id));
    const pending = filtered.filter(task => !todayEntries.some(entry => entry.taskId === task.id));
    
    const points = todayEntries.reduce((sum, entry) => sum + entry.pointsAwarded, 0);
    
    const possiblePoints = tasks.reduce((sum, task) => sum + Math.max(0, task.points), 0);

    return {
      pendingTasks: pending,
      completedTasks: completed,
      todayPoints: points,
      totalPossiblePoints: possiblePoints
    };
  }, [tasks, todayEntries, filter, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
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
            <Activity className="h-8 w-8" />
            Daily Tasks
          </h1>
          <p className="text-muted-foreground">
            Complete tasks to earn points and build healthy habits
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow gradient-primary" onClick={() => setEditingTask(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask
                  ? 'Update your task details and point values.'
                  : 'Create a new task to track your daily activities.'
                }
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              task={editingTask || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isLoading={isCreating || isUpdating}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
            <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Completed Today</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-success">{completedTasks.length} / {tasks.length}</div></CardContent>
        </Card>
        <Card className="card-hover">
            <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Points Earned</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-accent-teal">{todayPoints}</div></CardContent>
        </Card>
        <Card className="card-hover lg:col-span-2">
            <CardHeader className='pb-2'>
                <div className='flex justify-between items-center'>
                    <CardTitle className='text-sm font-medium'>Daily Progress</CardTitle>
                    <span className='text-sm font-bold text-muted-foreground'>{`${todayPoints} / ${totalPossiblePoints} pts`}</span>
                </div>
            </CardHeader>
            <CardContent>
                <Progress value={totalPossiblePoints > 0 ? (todayPoints / totalPossiblePoints) * 100 : 0} className="h-3" />
            </CardContent>
        </Card>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Tasks
          </Button>
          <Button
            variant={filter === 'physical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('physical')}
          >
            💪 Physical
          </Button>
          <Button
            variant={filter === 'mental' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('mental')}
          >
            🧠 Mental
          </Button>
        </div>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'points' | 'category')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="points">Sort by Points</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Pending Tasks ({pendingTasks.length})
            </h2>
            <div className="grid gap-4">
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCompleted={false}
                  onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  isToggling={isCreatingEntry || isDeletingEntry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-success">
              Completed Tasks ({completedTasks.length})
            </h2>
            <div className="grid gap-4">
              {completedTasks.map((task) => {
                const entry = todayEntries.find(e => e.taskId === task.id);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCompleted={true}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsFormOpen(true);
                    }}
                    onDelete={handleDelete}
                    onToggleComplete={handleToggleComplete}
                    completedEntry={entry}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {/* {filteredTasks.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Activity className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first task to start tracking your daily activities.
              </p>
              <Button
                className="btn-glow"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
}