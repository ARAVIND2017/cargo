import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, SearchIcon, FilterIcon, ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { format } from 'date-fns';
import { retrievalApi } from '@/lib/api';
import { RetrievalLog } from '@/types';

interface Log {
  id: string;
  timestamp: string;
  userId: string;
  actionType: string;
  itemId: string;
  details: {
    fromContainer: string;
    toContainer?: string;
    reason?: string;
  };
}

type FilterParams = {
  startDate?: Date;
  endDate?: Date;
  itemId?: string;
  userId?: string;
  actionType?: string;
};

type SortField = 'timestamp' | 'userId' | 'actionType' | 'itemId';
type SortOrder = 'asc' | 'desc';

export default function LogsTable() {
  // State for filters
  const [filters, setFilters] = useState<FilterParams>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch logs data
  const { data: retrievalLogs, isLoading: isLoadingLogs } = useQuery<RetrievalLog[]>({ 
    queryKey: ['/api/retrievals/logs'],
  });
  
  // Apply filters to logs
  const filteredLogs = retrievalLogs?.filter(log => {
    // Apply date range filter
    if (filters.startDate && new Date(log.timestamp) < filters.startDate) return false;
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(log.timestamp) > endOfDay) return false;
    }
    
    // Apply item ID filter
    if (filters.itemId && log.itemId !== filters.itemId) return false;
    
    // Apply user ID filter
    if (filters.userId && log.retrievedBy !== filters.userId) return false;
    
    // Apply action type filter
    if (filters.actionType && !log.type?.includes(filters.actionType)) return false;
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.itemId?.toLowerCase().includes(term) ||
        log.retrievedBy?.toLowerCase().includes(term) ||
        log.fromContainer?.toLowerCase().includes(term) ||
        log.newContainer?.toLowerCase().includes(term) ||
        log.type?.toLowerCase().includes(term)
      );
    }
    
    return true;
  }) || [];
  
  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'userId':
        comparison = (a.retrievedBy || '').localeCompare(b.retrievedBy || '');
        break;
      case 'actionType':
        comparison = (a.type || '').localeCompare(b.type || '');
        break;
      case 'itemId':
        comparison = a.itemId.localeCompare(b.itemId);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };
  
  // Get unique values for filter dropdowns
  const uniqueItemIds = [...new Set(retrievalLogs?.map(log => log.itemId) || [])];
  const uniqueUsers = [...new Set(retrievalLogs?.map(log => log.retrievedBy) || [])];
  const uniqueActionTypes = [...new Set(retrievalLogs?.map(log => log.type).filter(Boolean) || [])];
  
  // Define action type colors
  const getActionBadgeColor = (type?: string) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    
    switch (type.toLowerCase()) {
      case 'retrieval':
        return 'bg-[#4CAF50] bg-opacity-10 text-[#4CAF50]';
      case 'placement':
        return 'bg-[#2196F3] bg-opacity-10 text-[#2196F3]';
      case 'waste':
        return 'bg-[#FF6B6B] bg-opacity-10 text-[#FF6B6B]';
      case 'move':
        return 'bg-[#FF9800] bg-opacity-10 text-[#FF9800]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-64">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
          {Object.keys(filters).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      
      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => setFilters({ ...filters, startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => setFilters({ ...filters, endDate: date })}
                      initialFocus
                      disabled={(date) => filters.startDate ? date < filters.startDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Item ID */}
              <div className="space-y-2">
                <Label>Item ID</Label>
                <Select
                  value={filters.itemId || ''}
                  onValueChange={(value) => setFilters({ ...filters, itemId: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any item</SelectItem>
                    {uniqueItemIds.map((itemId) => (
                      <SelectItem key={itemId} value={itemId}>{itemId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* User */}
              <div className="space-y-2">
                <Label>User</Label>
                <Select
                  value={filters.userId || ''}
                  onValueChange={(value) => setFilters({ ...filters, userId: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any user</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Action Type */}
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={filters.actionType || ''}
                  onValueChange={(value) => setFilters({ ...filters, actionType: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any action</SelectItem>
                    {uniqueActionTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Logs Table */}
      {isLoadingLogs ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
        </div>
      ) : !sortedLogs || sortedLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No activity logs available matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('timestamp')}
                >
                  <div className="flex items-center">
                    Date/Time
                    {sortField === 'timestamp' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="ml-1 h-4 w-4" /> : <ArrowDownIcon className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('itemId')}
                >
                  <div className="flex items-center">
                    Item ID
                    {sortField === 'itemId' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="ml-1 h-4 w-4" /> : <ArrowDownIcon className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('actionType')}
                >
                  <div className="flex items-center">
                    Action
                    {sortField === 'actionType' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="ml-1 h-4 w-4" /> : <ArrowDownIcon className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Container</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Container</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('userId')}
                >
                  <div className="flex items-center">
                    By
                    {sortField === 'userId' && (
                      sortOrder === 'asc' ? <ArrowUpIcon className="ml-1 h-4 w-4" /> : <ArrowDownIcon className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {sortedLogs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-['Roboto_Mono']">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-['Roboto_Mono']">{log.itemId}</td>
                  <td className="px-4 py-3">
                    <Badge className={`px-2 py-1 text-xs rounded-full ${getActionBadgeColor(log.type)}`}>
                      {log.type || 'Retrieval'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-['Roboto_Mono']">{log.fromContainer}</td>
                  <td className="px-4 py-3 font-['Roboto_Mono']">{log.newContainer || '-'}</td>
                  <td className="px-4 py-3">{log.retrievedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Logs Count */}
      <div className="text-sm text-gray-500">
        {sortedLogs.length > 0 && (
          <p>
            Showing {sortedLogs.length} of {retrievalLogs?.length || 0} logs
            {Object.keys(filters).length > 0 && ' (filtered)'}
          </p>
        )}
      </div>
    </div>
  );
}