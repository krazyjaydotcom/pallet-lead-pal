
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Lead } from "@/types/Lead";

interface ChartsDashboardProps {
  leads: Lead[];
}

const ChartsDashboard: React.FC<ChartsDashboardProps> = ({ leads }) => {
  // Prepare data for charts
  const serviceTypeData = leads.reduce((acc, lead) => {
    const service = lead.palletNeeds.includes('Wood') ? 'Wood Pallets' :
                   lead.palletNeeds.includes('Plastic') ? 'Plastic Pallets' :
                   lead.palletNeeds.includes('Custom') ? 'Custom Pallets' : 'Other';
    
    acc[service] = (acc[service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const serviceChartData = Object.entries(serviceTypeData).map(([name, value]) => ({
    name,
    value,
    count: value
  }));

  const forklifitData = [
    { name: 'Has Forklift', value: leads.filter(l => l.forklifitAccess).length },
    { name: 'No Forklift', value: leads.filter(l => !l.forklifitAccess).length }
  ];

  const statusData = [
    { name: 'New', value: leads.filter(l => l.status === 'New').length, color: '#22c55e' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'Contacted').length, color: '#eab308' },
    { name: 'Client', value: leads.filter(l => l.status === 'Client').length, color: '#a855f7' }
  ];

  // Timeline data - group by month
  const timelineData = leads.reduce((acc, lead) => {
    const month = new Date(lead.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineChartData = Object.entries(timelineData)
    .map(([month, count]) => ({ month, leads: count }))
    .sort((a, b) => new Date(a.month + ' 1, 2024').getTime() - new Date(b.month + ' 1, 2024').getTime());

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Service Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Forklift Access Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Forklift Access Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={forklifitData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {forklifitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((leads.filter(l => l.forklifitAccess).length / leads.length) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600">Leads with Forklift Access</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((leads.filter(l => l.status === 'Client').length / leads.length) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {serviceChartData.find(s => s.name.includes('Wood'))?.value || 0}
              </div>
              <div className="text-sm text-gray-600">Wood Pallet Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsDashboard;
