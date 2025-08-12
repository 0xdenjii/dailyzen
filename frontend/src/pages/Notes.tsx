import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Save, Edit3, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { notesApi } from '@/lib/mockApi';
import type { DailyNote, NoteFormData } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const MOOD_EMOJIS = {
  1: { emoji: '😢', label: 'Very Sad', color: 'text-red-500' },
  2: { emoji: '😕', label: 'Sad', color: 'text-orange-500' },
  3: { emoji: '😐', label: 'Neutral', color: 'text-yellow-500' },
  4: { emoji: '😊', label: 'Happy', color: 'text-green-500' },
  5: { emoji: '😄', label: 'Very Happy', color: 'text-emerald-500' }
} as const;

const MoodSelector = ({ 
  mood, 
  onMoodChange 
}: { 
  mood?: 1 | 2 | 3 | 4 | 5; 
  onMoodChange: (mood: 1 | 2 | 3 | 4 | 5) => void;
}) => {
  return (
    <div className="space-y-2">
      <Label>How are you feeling today?</Label>
      <div className="flex gap-2">
        {Object.entries(MOOD_EMOJIS).map(([value, data]) => (
          <Button
            key={value}
            variant={mood === Number(value) ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-12 w-12 text-lg transition-all",
              mood === Number(value) && "shadow-glow"
            )}
            onClick={() => onMoodChange(Number(value) as 1 | 2 | 3 | 4 | 5)}
          >
            {data.emoji}
          </Button>
        ))}
      </div>
      {mood && (
        <p className="text-sm text-muted-foreground">
          {MOOD_EMOJIS[mood].label}
        </p>
      )}
    </div>
  );
};

const NoteCard = ({ 
  note, 
  isSelected, 
  onClick 
}: { 
  note: DailyNote; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const mood = note.mood ? MOOD_EMOJIS[note.mood] : null;
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all card-hover",
        isSelected && "ring-2 ring-primary shadow-glow"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {format(new Date(note.date), 'MMM dd, yyyy')}
          </CardTitle>
          {mood && (
            <div className="flex items-center gap-1">
              <span className="text-lg">{mood.emoji}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {note.content}
        </p>
      </CardContent>
    </Card>
  );
};

export default function Notes() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentNote, setCurrentNote] = useState<DailyNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentNotes, setRecentNotes] = useState<DailyNote[]>([]);
  const [formData, setFormData] = useState<NoteFormData>({
    content: '',
    mood: undefined,
    date: new Date().toISOString().split('T')[0]
  });

  const dateString = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    loadNoteForDate(dateString);
    setFormData(prev => ({ ...prev, date: dateString }));
  }, [dateString]);

  useEffect(() => {
    loadRecentNotes();
  }, []);

  const loadNoteForDate = async (date: string) => {
    setIsLoading(true);
    try {
      const response = await notesApi.getByDate(date);
      if (response.success) {
        const note = response.data;
        setCurrentNote(note);
        setFormData({
          content: note?.content || '',
          mood: note?.mood,
          date
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load note for selected date.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentNotes = async () => {
    // For demo, generate some recent notes
    const notes: DailyNote[] = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      if (Math.random() > 0.3) { // 70% chance of having a note
        notes.push({
          id: `note-${dateString}`,
          date: dateString,
          content: `This is a sample note for ${format(date, 'MMM dd')}. Today was a productive day with lots of learning and growth.`,
          mood: Math.floor(Math.random() * 5) + 1 as 1 | 2 | 3 | 4 | 5,
          createdAt: `${dateString}T20:00:00Z`,
          updatedAt: `${dateString}T20:00:00Z`
        });
      }
    }
    setRecentNotes(notes);
  };

  const handleSave = async () => {
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await notesApi.createOrUpdate(formData);
      if (response.success && response.data) {
        setCurrentNote(response.data);
        
        // Update recent notes if this is a new note
        if (!currentNote) {
          setRecentNotes(prev => [response.data!, ...prev].slice(0, 7));
        }
        
        toast({
          title: "Note Saved",
          description: "Your daily note has been saved successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = currentNote ? (
    currentNote.content !== formData.content || 
    currentNote.mood !== formData.mood
  ) : formData.content.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Daily Notes
          </h1>
          <p className="text-muted-foreground">
            Reflect on your day and track your thoughts
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Selector */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Note Editor */}
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {currentNote ? 'Edit Note' : 'Write Note'}
                </CardTitle>
                <Badge variant={currentNote ? 'secondary' : 'outline'}>
                  {currentNote ? 'Saved' : 'New'}
                </Badge>
              </div>
              <CardDescription>
                {format(selectedDate, 'PPPP')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  {/* Mood Selector */}
                  <MoodSelector
                    mood={formData.mood}
                    onMoodChange={(mood) => setFormData({ ...formData, mood })}
                  />

                  {/* Note Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">What's on your mind?</Label>
                    <Textarea
                      id="content"
                      placeholder="Write about your day, thoughts, achievements, challenges, or anything else you'd like to remember..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={12}
                      className="resize-none"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="btn-glow"
                    >
                      {isSaving ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Note
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Notes */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notes Written</span>
                  <Badge variant="secondary">{recentNotes.length}/7</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Mood</span>
                  <div className="flex items-center gap-1">
                    {recentNotes.length > 0 ? (
                      <>
                        <span className="text-lg">
                          {MOOD_EMOJIS[Math.round(
                            recentNotes
                              .filter(n => n.mood)
                              .reduce((sum, n) => sum + (n.mood || 0), 0) / 
                            recentNotes.filter(n => n.mood).length
                          ) as 1 | 2 | 3 | 4 | 5]?.emoji || '😐'}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Recent Notes</CardTitle>
              <CardDescription>Your latest reflections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isSelected={note.date === dateString}
                      onClick={() => {
                        setSelectedDate(new Date(note.date));
                      }}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No recent notes yet. Start writing to see them here!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mood Tracker */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Mood Tracker</CardTitle>
              <CardDescription>This week's emotions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(MOOD_EMOJIS).reverse().map(([value, data]) => {
                  const count = recentNotes.filter(n => n.mood === Number(value)).length;
                  const percentage = recentNotes.length > 0 ? (count / recentNotes.length) * 100 : 0;
                  
                  return (
                    <div key={value} className="flex items-center gap-3">
                      <span className="text-lg">{data.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{data.label}</span>
                          <span>{count} days</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}