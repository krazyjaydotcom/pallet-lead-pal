import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const sb: any = supabase;

export const ResetDataCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState({
    setterKpi: true,
    closerKpi: false,
    csmKpi: false,
  });

  const toggle = (key: keyof typeof selections) =>
    setSelections((s) => ({ ...s, [key]: !s[key] }));

  const handleReset = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const deletes: any[] = [];

      if (selections.setterKpi) {
        deletes.push(
          sb.from("setter_kpi_entries").delete().eq("user_id", user.id),
          sb.from("prospect_activity").delete()
            .eq("user_id", user.id)
            .in("event_type", ["touch_point", "follow_up_increment", "call_pitched", "call_booked"])
        );
      }
      if (selections.closerKpi) {
        deletes.push(
          sb.from("closer_kpi_entries").delete().eq("user_id", user.id)
        );
      }
      if (selections.csmKpi) {
        deletes.push(
          sb.from("csm_kpi_entries").delete().eq("user_id", user.id)
        );
      }

      // Run all deletes in parallel
      const results = await Promise.all(deletes);
      const firstError = results.find((r) => r && r.error);
      if (firstError?.error) throw firstError.error;

      toast.success("Selected data reset successfully");
    } catch (err: any) {
      console.error("Error resetting data:", err);
      const msg = err?.message || "Failed to reset data";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset my data</CardTitle>
        <CardDescription>
          Reset only your Pallet Pros Academy KPI entries. Business leads, prospects, and activity cannot be reset here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3">
            <Checkbox checked={selections.setterKpi} onCheckedChange={() => toggle("setterKpi")} />
            <span>Setter KPI entries</span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={selections.closerKpi} onCheckedChange={() => toggle("closerKpi")} />
            <span>Closer KPI entries</span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={selections.csmKpi} onCheckedChange={() => toggle("csmKpi")} />
            <span>CSM KPI entries</span>
          </label>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Business data (leads, prospects, activity) cannot be reset here.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading}>
              {loading ? "Resetting..." : "Reset Selected Data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. It will permanently delete the selected data for your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Confirm Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ResetDataCard;
