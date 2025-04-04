import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Item } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ReturnPlanningTool from '@/components/waste/ReturnPlanningTool';

export default function WasteManagement() {
  const [selectedExpiredItems, setSelectedExpiredItems] = useState<string[]>([]);
  const [selectedDepleted, setSelectedDepleted] = useState<string[]>([]);
  const [returnSchedule, setReturnSchedule] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all items
  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ['/api/placements/items'],
  });
  
  // Separate expired and depleted items
  const now = new Date();
  const expiredItems = items?.filter(item => new Date(item.expiryDate) < now) || [];
  const depletedItems = items?.filter(item => item.usageLimit <= 0) || [];
  
  // Schedule waste return mutation
  const scheduleWasteReturnMutation = useMutation({
    mutationFn: async (data: {itemIds: string[], schedule: string}) => {
      return await apiRequest('POST', '/api/waste/schedule-return', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      
      toast({
        title: 'Waste return scheduled',
        description: `${selectedExpiredItems.length + selectedDepleted.length} items scheduled for return`,
      });
      
      // Reset selections
      setSelectedExpiredItems([]);
      setSelectedDepleted([]);
      setReturnSchedule('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error scheduling waste return',
        description: error.message || 'Failed to schedule waste return',
        variant: 'destructive',
      });
    }
  });
  
  // Handle checkbox selection for expired items
  const handleExpiredCheckChange = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedExpiredItems(prev => [...prev, itemId]);
    } else {
      setSelectedExpiredItems(prev => prev.filter(id => id !== itemId));
    }
  };
  
  // Handle checkbox selection for depleted items
  const handleDepletedCheckChange = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedDepleted(prev => [...prev, itemId]);
    } else {
      setSelectedDepleted(prev => prev.filter(id => id !== itemId));
    }
  };
  
  // Schedule waste return
  const handleScheduleReturn = () => {
    const allSelected = [...selectedExpiredItems, ...selectedDepleted];
    
    if (allSelected.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to schedule for return',
        variant: 'destructive',
      });
      return;
    }
    
    if (!returnSchedule) {
      toast({
        title: 'No return date selected',
        description: 'Please select a return date',
        variant: 'destructive',
      });
      return;
    }
    
    scheduleWasteReturnMutation.mutate({
      itemIds: allSelected,
      schedule: returnSchedule,
    });
  };
  
  // Handle "Select All" for expired items
  const handleSelectAllExpired = () => {
    if (selectedExpiredItems.length === expiredItems.length) {
      setSelectedExpiredItems([]);
    } else {
      setSelectedExpiredItems(expiredItems.map(item => item.itemId));
    }
  };
  
  // Handle "Select All" for depleted items
  const handleSelectAllDepleted = () => {
    if (selectedDepleted.length === depletedItems.length) {
      setSelectedDepleted([]);
    } else {
      setSelectedDepleted(depletedItems.map(item => item.itemId));
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Waste Management</h2>
        <div className="flex space-x-3">
          <Button 
            className="bg-[#1E3D59] hover:bg-[#17304a] text-white"
            onClick={handleScheduleReturn}
            disabled={scheduleWasteReturnMutation.isPending}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {scheduleWasteReturnMutation.isPending ? 'Scheduling...' : 'Schedule Return'}
          </Button>
          <div className="relative">
            <input 
              type="date" 
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3D59] focus:border-[#1E3D59]"
              value={returnSchedule}
              onChange={(e) => setReturnSchedule(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="bg-[#1E3D59] text-white pb-3">
            <CardTitle className="text-lg">Waste Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-md flex flex-col items-center">
                <div className="text-4xl font-bold text-[#FF6B6B] mb-2">{expiredItems.length}</div>
                <div className="text-sm text-gray-600">Expired Items</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md flex flex-col items-center">
                <div className="text-4xl font-bold text-[#FFC107] mb-2">{depletedItems.length}</div>
                <div className="text-sm text-gray-600">Depleted Items</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md flex flex-col items-center">
                <div className="text-4xl font-bold text-[#4CAF50] mb-2">
                  {selectedExpiredItems.length + selectedDepleted.length}
                </div>
                <div className="text-sm text-gray-600">Selected for Return</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-[#FF6B6B] text-white pb-3">
            <CardTitle className="text-lg">Waste Return Procedure</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            <ol className="list-decimal ml-5 space-y-2">
              <li>Identify expired and depleted items</li>
              <li>Mark items for waste return</li>
              <li>Schedule a return date</li>
              <li>Gather items in waste return container</li>
              <li>Document in the waste log system</li>
              <li>Prepare for next resupply mission</li>
            </ol>
          </CardContent>
        </Card>
      </div>
      
      {/* Advanced Return Planning Tool */}
      <div className="mb-8">
        <ReturnPlanningTool />
      </div>
        
      <Tabs defaultValue="expired">
        <TabsList className="w-full bg-white border-b border-gray-200">
          <TabsTrigger value="expired" className="flex-1">
            Expired Items ({expiredItems.length})
          </TabsTrigger>
          <TabsTrigger value="depleted" className="flex-1">
            Depleted Items ({depletedItems.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="expired" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row justify-between items-center">
              <CardTitle className="text-lg text-[#1E3D59]">Expired Items</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAllExpired}
                disabled={expiredItems.length === 0}
              >
                {selectedExpiredItems.length === expiredItems.length && expiredItems.length > 0 
                  ? 'Deselect All' 
                  : 'Select All'}
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
                </div>
              ) : expiredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-3 text-[#FF6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No expired items found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 w-12"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Expired</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {expiredItems.map((item) => {
                        const daysExpired = Math.floor((now.getTime() - new Date(item.expiryDate).getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <tr key={item.itemId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Checkbox 
                                checked={selectedExpiredItems.includes(item.itemId)}
                                onCheckedChange={(checked) => handleExpiredCheckChange(item.itemId, checked === true)}
                              />
                            </td>
                            <td className="px-4 py-3 font-['Roboto_Mono']">{item.itemId}</td>
                            <td className="px-4 py-3">{item.name}</td>
                            <td className="px-4 py-3 font-['Roboto_Mono']">{item.containerId}</td>
                            <td className="px-4 py-3 font-['Roboto_Mono'] text-[#FF6B6B]">{item.expiryDate}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-[#FF6B6B] bg-opacity-10 text-[#FF6B6B]">
                                {daysExpired} {daysExpired === 1 ? 'day' : 'days'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="depleted" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row justify-between items-center">
              <CardTitle className="text-lg text-[#1E3D59]">Depleted Items</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAllDepleted}
                disabled={depletedItems.length === 0}
              >
                {selectedDepleted.length === depletedItems.length && depletedItems.length > 0 
                  ? 'Deselect All' 
                  : 'Select All'}
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
                </div>
              ) : depletedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-3 text-[#FFC107]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No depleted items found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 w-12"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Limit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {depletedItems.map((item) => (
                        <tr key={item.itemId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedDepleted.includes(item.itemId)}
                              onCheckedChange={(checked) => handleDepletedCheckChange(item.itemId, checked === true)}
                            />
                          </td>
                          <td className="px-4 py-3 font-['Roboto_Mono']">{item.itemId}</td>
                          <td className="px-4 py-3">{item.name}</td>
                          <td className="px-4 py-3 font-['Roboto_Mono']">{item.containerId}</td>
                          <td className="px-4 py-3 font-['Roboto_Mono']">{item.usageLimit}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs rounded-full bg-[#FFC107] bg-opacity-10 text-[#FFC107]">
                              Depleted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
