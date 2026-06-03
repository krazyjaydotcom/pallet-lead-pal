import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState, useMemo } from "react";
import { format, subDays, isAfter, isBefore } from "date-fns";
import { KPIEntry } from "@/components/KPIDashboard";

interface KPIChartsProps {
  kpiEntries: KPIEntry[];
}

export const KPICharts = ({ kpiEntries }: KPIChartsProps) => {
  const [timeRange, setTimeRange] = useState<string>("30");

  const filteredData = useMemo(() => {
    const days = parseInt(timeRange);
    const cutoffDate = subDays(new Date(), days);
    
    return kpiEntries
      .filter(entry => isAfter(new Date(entry.date), cutoffDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: format(new Date(entry.date), 'MMM dd'),
        fullDate: entry.date,
        touchPoints: entry.touch_points,
        callsPitched: entry.calls_pitched,
        callsBooked: entry.calls_booked,
        touchToPitchRatio: entry.touch_points > 0 ? (entry.calls_pitched / entry.touch_points) * 100 : 0,
        pitchToBookRatio: entry.calls_pitched > 0 ? (entry.calls_booked / entry.calls_pitched) * 100 : 0
      }));
  }, [kpiEntries, timeRange]);

  const averages = useMemo(() => {
    if (filteredData.length === 0) return {
      avgTouchPoints: 0,
      avgCallsPitched: 0,
      avgCallsBooked: 0,
      avgTouchToPitchRatio: 0,
      avgPitchToBookRatio: 0
    };

    const totals = filteredData.reduce((acc, entry) => ({
      touchPoints: acc.touchPoints + entry.touchPoints,
      callsPitched: acc.callsPitched + entry.callsPitched,
      callsBooked: acc.callsBooked + entry.callsBooked,
      touchToPitchRatio: acc.touchToPitchRatio + entry.touchToPitchRatio,
      pitchToBookRatio: acc.pitchToBookRatio + entry.pitchToBookRatio
    }), { touchPoints: 0, callsPitched: 0, callsBooked: 0, touchToPitchRatio: 0, pitchToBookRatio: 0 });

    return {
      avgTouchPoints: Math.round(totals.touchPoints / filteredData.length),
      avgCallsPitched: Math.round(totals.callsPitched / filteredData.length),
      avgCallsBooked: Math.round(totals.callsBooked / filteredData.length),
      avgTouchToPitchRatio: totals.touchToPitchRatio / filteredData.length,
      avgPitchToBookRatio: totals.pitchToBookRatio / filteredData.length
    };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Analytics & Trends</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No data available for the selected time range. Add some KPI entries to see analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Touch Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.avgTouchPoints}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Calls Pitched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.avgCallsPitched}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Calls Booked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.avgCallsBooked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Touch→Pitch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.avgTouchToPitchRatio.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Pitch→Book</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.avgPitchToBookRatio.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Volume Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Volume Trends</CardTitle>
              <CardDescription>Daily touch points, calls pitched, and calls booked</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="touchPoints" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Touch Points"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="callsPitched" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Calls Pitched"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="callsBooked" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="Calls Booked"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Conversion Ratios */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Ratios</CardTitle>
              <CardDescription>Touch point to pitch and pitch to book conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} />
                  <Line 
                    type="monotone" 
                    dataKey="touchToPitchRatio" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Touch to Pitch Ratio"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pitchToBookRatio" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Pitch to Book Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Performance Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance Overview</CardTitle>
              <CardDescription>Combined view of daily activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="touchPoints" 
                    fill="hsl(var(--primary))" 
                    name="Touch Points"
                    opacity={0.8}
                  />
                  <Bar 
                    dataKey="callsPitched" 
                    fill="hsl(var(--secondary))" 
                    name="Calls Pitched"
                    opacity={0.8}
                  />
                  <Bar 
                    dataKey="callsBooked" 
                    fill="hsl(var(--accent))" 
                    name="Calls Booked"
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};