import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Calendar as CalendarIcon, Save } from 'lucide-react'; // FIX: Renamed icon import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Note } from '@/types';
import { useGetNoteForDate, useGetRecentNotes, useNotesCalendar, useUpsertNote } from '@/hooks/useNotes';
import { format, startOfMonth } from 'date-fns';
import { Calendar } from '@/components/ui/calendar'; // FIX: This is the main calendar component

const MOOD_EMOJIS = {
  1: { emoji: '😢', label: 'Very Sad', color: 'text-red-500' },
  2: { emoji: '😕', label: 'Sad', color: 'text-orange-500' },
  3: { emoji: '😐', label: 'Neutral', color: 'text-yellow-500' },
  4: { emoji: '😊', label: 'Happy', color: 'text-green-500' },
  5: { emoji: '😄', label: 'Very Happy', color: 'text-emerald-500' }
} as const;

type MoodValue = keyof typeof MOOD_EMOJIS;

const MoodSelector = ({ 
  mood, 
  onMoodChange 
}: { 
  mood?: MoodValue; 
  onMoodChange: (mood: MoodValue) => void;
}) => {
  return (
    <div className="space-y-2">
      <Label>How are you feeling today?</Label>
      <div className="flex gap-2">
        {Object.entries(MOOD_EMOJIS).map(([value, data]) => (
          <Button
            key={value}
            variant={mood === Number(value) as MoodValue ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-12 w-12 text-lg transition-all",
              mood === Number(value) as MoodValue && "shadow-glow"
            )}
            onClick={() => onMoodChange(Number(value) as MoodValue)}
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
  note: Note; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  // FIX: Safely access mood by casting the type
  const mood = note.mood ? MOOD_EMOJIS[note.mood as MoodValue] : null;
  
  return (
    <Card 
      className={cn("cursor-pointer transition-all card-hover", isSelected && "ring-2 ring-primary shadow-glow")}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {/* FIX: Add T00:00:00 to avoid timezone issues in format() */}
            {format(new Date(note.date + 'T00:00:00'), 'MMM dd, yyyy')}
          </CardTitle>
          {mood && <span className="text-lg">{mood.emoji}</span>}
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
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodValue | undefined>();

  const dateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const { data: currentNote, isLoading: isLoadingNote } = useGetNoteForDate(dateString);
  const { data: recentNotes = [] } = useGetRecentNotes();
  const { mutate: upsertNote, isPending: isSaving } = useUpsertNote();
  const { data: notedDates = [] } = useNotesCalendar(
    calendarMonth.getMonth() + 1,
    calendarMonth.getFullYear()
  );

  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content || '');
      setMood(currentNote.mood as MoodValue | undefined);
    } else {
      setContent('');
      setMood(undefined);
    }
  }, [currentNote]);

  const handleSave = () => {
    if (!content.trim()) {
      toast({ title: "Content is empty", description: "Please write something before saving.", variant: "destructive" });
      return;
    }
    upsertNote(
      { date: dateString, content, mood },
      {
        onSuccess: () => toast({ title: "Note Saved", description: "Your daily reflection is saved." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const hasChanges = useMemo(() => {
    if (isLoadingNote) return false;
    const originalContent = currentNote?.content || '';
    const originalMood = currentNote?.mood as MoodValue | undefined;
    return content !== originalContent || mood !== originalMood;
  }, [content, mood, currentNote, isLoadingNote]);

  const notedDaysModifier = { noted: notedDates.map(dateStr => new Date(dateStr + 'T00:00:00')) };
  const notedDaysModifierStyles = { noted: { fontWeight: 'bold', border: '2px solid hsl(var(--primary))' } };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Daily Notes
          </h1>
          <p className="text-muted-foreground">Reflect on your day and track your thoughts</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Journal Calendar
              </CardTitle>
              <CardDescription>Select a day to view or write a note. Bolded dates have an entry.</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(day) => day && setSelectedDate(day)}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={notedDaysModifier}
                  modifiersStyles={notedDaysModifierStyles}
                  disabled={(date) => date > new Date()}
                  className="p-0 rounded-md border"
              />
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentNote ? 'Edit Note' : 'Write Note'}</CardTitle>
                <Badge variant={currentNote ? 'secondary' : 'outline'}>{currentNote ? 'Saved' : 'New'}</Badge>
              </div>
              <CardDescription>{format(selectedDate, 'PPPP')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingNote ? <Skeleton className="h-64 w-full" /> : (
                <>
                  <MoodSelector mood={mood} onMoodChange={setMood} />
                  <div className="space-y-2">
                    <Label htmlFor="content">What's on your mind?</Label>
                    <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={12} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="btn-glow">
                      {isSaving && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Note
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="card-hover">
            <CardHeader><CardTitle className="text-lg">This Week</CardTitle></CardHeader>
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
                      <span className="text-lg">
                        {MOOD_EMOJIS[Math.round(recentNotes.filter(n => n.mood).reduce((sum, n) => sum + (n.mood || 0), 0) / recentNotes.filter(n => n.mood).length) as MoodValue]?.emoji || '😐'}
                      </span>
                    ) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                      onClick={() => setSelectedDate(new Date(note.date + 'T00:00:00'))} // FIX: Add time to avoid timezone issues
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No recent notes yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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