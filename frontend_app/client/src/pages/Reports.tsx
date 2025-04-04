import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Container, Item, RetrievalLog } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import LogsTable from '@/components/reports/LogsTable';

export default function Reports() {
  const [reportType, setReportType] = useState('usage');
  const [dateRange, setDateRange] = useState('7days');
  const [exportFormat, setExportFormat] = useState('csv');
  
  // Fetch containers, items, and retrieval logs
  const { data: containers, isLoading: isLoadingContainers } = useQuery<Container[]>({
    queryKey: ['/api/placements/containers'],
  });
  
  const { data: items, isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/placements/items'],
  });
  
  const { data: retrievalLogs, isLoading: isLoadingLogs } = useQuery<RetrievalLog[]>({
    queryKey: ['/api/retrievals/logs'],
  });
  
  // Helper function to get days ago date
  const getDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };
  
  // Filter logs by date range
  const getFilteredLogs = () => {
    if (!retrievalLogs) return [];
    
    let startDate: Date;
    
    switch (dateRange) {
      case '1day':
        startDate = getDaysAgo(1);
        break;
      case '7days':
        startDate = getDaysAgo(7);
        break;
      case '30days':
        startDate = getDaysAgo(30);
        break;
      case '90days':
        startDate = getDaysAgo(90);
        break;
      default:
        startDate = getDaysAgo(7);
    }
    
    return retrievalLogs.filter(log => new Date(log.timestamp) >= startDate);
  };
  
  // Prepare data for usage chart
  const getUsageData = () => {
    const filteredLogs = getFilteredLogs();
    
    // Group logs by day
    const groupedByDay = filteredLogs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to array for chart
    return Object.entries(groupedByDay).map(([date, count]) => ({
      date,
      retrievals: count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  // Prepare data for container utilization
  const getContainerUtilizationData = () => {
    if (!containers || !items) return [];
    
    // Count items per container
    const itemsByContainer = items.reduce((acc, item) => {
      if (!acc[item.containerId]) {
        acc[item.containerId] = 0;
      }
      acc[item.containerId]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Build container data
    return containers.map(container => ({
      containerId: container.containerId,
      zone: container.zone,
      capacity: container.width * container.depth * container.height,
      itemCount: itemsByContainer[container.containerId] || 0,
      utilizationPercentage: calculateContainerUtilization(container, items.filter(item => item.containerId === container.containerId))
    }));
  };
  
  // Calculate container utilization percentage
  const calculateContainerUtilization = (container: Container, containerItems: Item[]) => {
    const containerVolume = container.width * container.depth * container.height;
    
    const usedVolume = containerItems.reduce((sum, item) => {
      if (!item.position) return sum;
      
      const { startCoordinates, endCoordinates } = item.position;
      const itemVolume = 
        (endCoordinates.width - startCoordinates.width) *
        (endCoordinates.depth - startCoordinates.depth) *
        (endCoordinates.height - startCoordinates.height);
      
      return sum + itemVolume;
    }, 0);
    
    return Math.round((usedVolume / containerVolume) * 100);
  };
  
  // Prepare expiry data
  const getExpiryData = () => {
    if (!items) return [];
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const ninetyDaysFromNow = new Date(now);
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    const expired = items.filter(item => new Date(item.expiryDate) < now).length;
    const expiringSoon = items.filter(item => {
      const expiry = new Date(item.expiryDate);
      return expiry >= now && expiry <= thirtyDaysFromNow;
    }).length;
    const expiringLater = items.filter(item => {
      const expiry = new Date(item.expiryDate);
      return expiry > thirtyDaysFromNow && expiry <= ninetyDaysFromNow;
    }).length;
    const valid = items.filter(item => new Date(item.expiryDate) > ninetyDaysFromNow).length;
    
    return [
      { name: 'Expired', value: expired, color: '#FF6B6B' },
      { name: 'Expiring (<30 days)', value: expiringSoon, color: '#FFC107' },
      { name: 'Expiring (30-90 days)', value: expiringLater, color: '#4CAF50' },
      { name: 'Valid (>90 days)', value: valid, color: '#1E3D59' }
    ];
  };
  
  // Export report data
  const handleExportReport = () => {
    let data;
    let filename;
    
    // Get appropriate data based on report type
    switch (reportType) {
      case 'usage':
        data = getUsageData();
        filename = `usage_report_${dateRange}`;
        break;
      case 'container':
        data = getContainerUtilizationData();
        filename = 'container_utilization_report';
        break;
      case 'expiry':
        data = getExpiryData();
        filename = 'expiry_status_report';
        break;
      default:
        data = [];
        filename = 'report';
    }
    
    // Convert to selected format
    let content: string;
    let mimeType: string;
    
    if (exportFormat === 'csv') {
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(item => Object.values(item).join(',')).join('\n');
      content = `${headers}\n${rows}`;
      mimeType = 'text/csv';
      filename += '.csv';
    } else {
      // JSON format
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    }
    
    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Loading state
  const isLoading = isLoadingContainers || isLoadingItems || isLoadingLogs;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Reports & Analytics</h2>
        <div className="flex space-x-3">
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="bg-[#1E3D59] hover:bg-[#17304a] text-white"
            onClick={handleExportReport}
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="bg-[#1E3D59] text-white pb-3 flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Report Controls</CardTitle>
            <div className="flex space-x-2">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="bg-white text-[#1E3D59] border-none w-40 h-8">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usage">Usage Activity</SelectItem>
                  <SelectItem value="container">Container Utilization</SelectItem>
                  <SelectItem value="expiry">Expiry Status</SelectItem>
                </SelectContent>
              </Select>
              
              {reportType === 'usage' && (
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-white text-[#1E3D59] border-none w-32 h-8">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1day">1 Day</SelectItem>
                    <SelectItem value="7days">7 Days</SelectItem>
                    <SelectItem value="30days">30 Days</SelectItem>
                    <SelectItem value="90days">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
              </div>
            ) : (
              <>
                {reportType === 'usage' && (
                  <div className="h-[350px]">
                    <h3 className="text-lg font-medium text-[#1E3D59] mb-4">Item Retrieval Activity</h3>
                    {getUsageData().length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No retrieval activity data available for the selected period.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getUsageData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="retrievals" name="Item Retrievals" fill="#1E3D59" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
                
                {reportType === 'container' && (
                  <div className="h-[350px]">
                    <h3 className="text-lg font-medium text-[#1E3D59] mb-4">Container Utilization</h3>
                    {getContainerUtilizationData().length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p>No container data available.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getContainerUtilizationData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="containerId" />
                          <YAxis yAxisId="left" orientation="left" stroke="#1E3D59" />
                          <YAxis yAxisId="right" orientation="right" stroke="#FF6B6B" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="itemCount" name="Item Count" fill="#1E3D59" />
                          <Bar yAxisId="right" dataKey="utilizationPercentage" name="Utilization %" fill="#FF6B6B" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
                
                {reportType === 'expiry' && (
                  <div className="h-[350px]">
                    <h3 className="text-lg font-medium text-[#1E3D59] mb-4">Item Expiry Status</h3>
                    {getExpiryData().every(item => item.value === 0) ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No item expiry data available.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getExpiryData()}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getExpiryData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-[#1E3D59] text-white pb-3">
            <CardTitle className="text-lg">Report Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-medium mb-2">Current Report</h3>
              <div className="text-sm p-3 bg-gray-50 rounded-md">
                <p className="font-bold mb-1">Type: {reportType === 'usage' ? 'Usage Activity' : reportType === 'container' ? 'Container Utilization' : 'Expiry Status'}</p>
                {reportType === 'usage' && (
                  <p>Period: {dateRange === '1day' ? 'Last 24 Hours' : dateRange === '7days' ? 'Last 7 Days' : dateRange === '30days' ? 'Last 30 Days' : 'Last 90 Days'}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Statistics</h3>
              <div className="space-y-2">
                <div className="text-sm p-3 bg-gray-50 rounded-md flex justify-between">
                  <span>Total Containers:</span>
                  <span className="font-['Roboto_Mono'] font-bold">{containers?.length || 0}</span>
                </div>
                <div className="text-sm p-3 bg-gray-50 rounded-md flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-['Roboto_Mono'] font-bold">{items?.length || 0}</span>
                </div>
                <div className="text-sm p-3 bg-gray-50 rounded-md flex justify-between">
                  <span>Expired Items:</span>
                  <span className="font-['Roboto_Mono'] font-bold text-[#FF6B6B]">
                    {items?.filter(item => new Date(item.expiryDate) < new Date()).length || 0}
                  </span>
                </div>
                <div className="text-sm p-3 bg-gray-50 rounded-md flex justify-between">
                  <span>Recent Activities:</span>
                  <span className="font-['Roboto_Mono'] font-bold">
                    {retrievalLogs?.filter(log => new Date(log.timestamp) >= getDaysAgo(7)).length || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="bg-[#1E3D59] text-white pb-3">
          <CardTitle className="text-lg">Detailed Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="items">
            <TabsList className="w-full bg-gray-100 rounded-none">
              <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
              <TabsTrigger value="containers" className="flex-1">Containers</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">Activity Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="items" className="p-4">
              {isLoadingItems ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
                </div>
              ) : !items || items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No items available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {items.map((item) => {
                        const isExpired = new Date(item.expiryDate) < new Date();
                        
                        return (
                          <tr key={item.itemId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-['Roboto_Mono']">{item.itemId}</td>
                            <td className="px-4 py-3">{item.name}</td>
                            <td className="px-4 py-3 font-['Roboto_Mono']">{item.containerId}</td>
                            <td className={`px-4 py-3 font-['Roboto_Mono'] ${
                              isExpired ? 'text-[#FF6B6B]' : 'text-[#4CAF50]'
                            }`}>
                              {item.expiryDate}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                isExpired 
                                  ? 'bg-[#FF6B6B] bg-opacity-10 text-[#FF6B6B]' 
                                  : 'bg-[#4CAF50] bg-opacity-10 text-[#4CAF50]'
                              }`}>
                                {isExpired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="containers" className="p-4">
              {isLoadingContainers ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
                </div>
              ) : !containers || containers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No containers available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (W×D×H)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {containers.map((container) => {
                        const itemCount = items?.filter(item => item.containerId === container.containerId).length || 0;
                        
                        return (
                          <tr key={container.containerId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-['Roboto_Mono']">{container.containerId}</td>
                            <td className="px-4 py-3">{container.zone}</td>
                            <td className="px-4 py-3 font-['Roboto_Mono']">
                              {container.width} × {container.depth} × {container.height}
                            </td>
                            <td className="px-4 py-3 font-['Roboto_Mono']">
                              {(container.width * container.depth * container.height).toLocaleString()} cm³
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-[#1E3D59] bg-opacity-10 text-[#1E3D59]">
                                {itemCount} items
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activity" className="p-4">
              <LogsTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
