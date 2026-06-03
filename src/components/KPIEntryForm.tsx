import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { KPIEntry } from "@/components/KPIDashboard";

interface KPIEntryFormProps {
  onSubmit: (entry: Omit<KPIEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

export const KPIEntryForm = ({ onSubmit }: KPIEntryFormProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [touchPoints, setTouchPoints] = useState<string>("");
  const [callsPitched, setCallsPitched] = useState<string>("");
  const [callsBooked, setCallsBooked] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!touchPoints || !callsPitched || !callsBooked) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        date: format(selectedDate, 'yyyy-MM-dd'),
        touch_points: parseInt(touchPoints),
        calls_pitched: parseInt(callsPitched),
        calls_booked: parseInt(callsBooked),
        notes: notes.trim() || null
      });

      // Reset form
      setTouchPoints("");
      setCallsPitched("");
      setCallsBooked("");
      setNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const touchPointToPitchRatio = touchPoints && callsPitched 
    ? ((parseInt(callsPitched) / parseInt(touchPoints)) * 100).toFixed(1)
    : "0";

  const pitchToBookRatio = callsPitched && callsBooked
    ? ((parseInt(callsBooked) / parseInt(callsPitched)) * 100).toFixed(1)
    : "0";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="touchPoints">Touch Points *</Label>
            <Input
              id="touchPoints"
              type="number"
              value={touchPoints}
              onChange={(e) => setTouchPoints(e.target.value)}
              placeholder="100"
              min="0"
              required
            />
            <p className="text-xs text-muted-foreground">
              New interactions initiated with unique people on Instagram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callsPitched">Calls Pitched *</Label>
            <Input
              id="callsPitched"
              type="number"
              value={callsPitched}
              onChange={(e) => setCallsPitched(e.target.value)}
              placeholder="20"
              min="0"
              required
            />
            <p className="text-xs text-muted-foreground">
              Number of people successfully pitched for a sales call
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callsBooked">Calls Booked *</Label>
            <Input
              id="callsBooked"
              type="number"
              value={callsBooked}
              onChange={(e) => setCallsBooked(e.target.value)}
              placeholder="10"
              min="0"
              required
            />
            <p className="text-xs text-muted-foreground">
              Actual sales calls successfully booked into calendar
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Live Ratios</CardTitle>
              <CardDescription>
                Calculated based on your current inputs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Touch Point to Pitch:</span>
                <span className="text-lg font-bold text-primary">{touchPointToPitchRatio}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pitch to Book:</span>
                <span className="text-lg font-bold text-secondary">{pitchToBookRatio}%</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">Lead Quality / Observations</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about lead quality, challenges, or ad performance observations..."
              rows={6}
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={isSubmitting || !touchPoints || !callsPitched || !callsBooked}
      >
        {isSubmitting ? "Saving..." : "Save KPI Entry"}
      </Button>
    </form>
  );
};