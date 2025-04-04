import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, PackageIcon, TruckIcon, ClipboardCheckIcon } from 'lucide-react';
import { format } from 'date-fns';
import { wasteApi } from '@/lib/api';
import { Item, Container } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ReturnPlanningTool() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [containerForUndocking, setContainerForUndocking] = useState<string>('');
  const [maxWeight, setMaxWeight] = useState<number>(100);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [returnPlan, setReturnPlan] = useState<{
    steps: Array<{ description: string }>;
    retrieval: Array<{ itemId: string; name: string; location: string; }>;
  } | null>(null);
  
  // Fetch containers for selection
  const { data: containers, isLoading: isLoadingContainers } = useQuery<Container[]>({ 
    queryKey: ['/api/placements/containers'],
  });
  
  // Fetch waste items
  const { data: wasteItems, isLoading: isLoadingWaste } = useQuery({ 
    queryKey: ['/api/waste/identify'],
  });
  
  // Create a return plan
  const createReturnPlan = async () => {
    if (!date || !containerForUndocking) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and container for undocking',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreatingPlan(true);
    try {
      const response = await wasteApi.scheduleReturn({
        itemIds: wasteItems?.map(item => item.itemId) || [],
        schedule: date.toISOString(),
        notes: `Max weight: ${maxWeight}kg, Container: ${containerForUndocking}`
      });
      
      // For demo purposes, create a simulated return plan result
      // In a real implementation, this would come from the API response
      const simulatedPlan = {
        steps: [
          { description: `Clear space in container ${containerForUndocking}` },
          { description: 'Move expired items to container' },
          { description: 'Schedule container for undocking on ' + format(date, 'PPP') }
        ],
        retrieval: wasteItems?.slice(0, 3).map(item => ({
          itemId: item.itemId,
          name: item.name,
          location: item.containerId
        })) || []
      };
      
      setReturnPlan(simulatedPlan);
      toast({
        title: 'Return Plan Created',
        description: `Plan created for ${format(date, 'PPP')}`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/waste/scheduled-returns'] });
    } catch (error: any) {
      toast({
        title: 'Error Creating Plan',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };
  
  // Complete the undocking process
  const completeUndocking = async () => {
    try {
      // Here we would call the API to complete the undocking
      // await wasteApi.completeUndocking(containerForUndocking);
      
      toast({
        title: 'Undocking Complete',
        description: `Container ${containerForUndocking} has been undocked successfully`,
      });
      
      // Reset the form
      setDate(undefined);
      setContainerForUndocking('');
      setReturnPlan(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/waste/identify'] });
      queryClient.invalidateQueries({ queryKey: ['/api/placements/containers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
    } catch (error: any) {
      toast({
        title: 'Error Completing Undocking',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  const isFormComplete = date !== undefined && containerForUndocking !== '';
  
  return (
    <Card className="w-full">
      <CardHeader className="bg-[#1E3D59] text-white">
        <CardTitle>Waste Return Planning</CardTitle>
        <CardDescription className="text-slate-200">Schedule waste items for return to Earth</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="plan">Create Plan</TabsTrigger>
            <TabsTrigger value="schedule">View Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plan">
            <div className="space-y-4">
              {/* Planning Form */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Container for Undocking</Label>
                  <Select 
                    value={containerForUndocking} 
                    onValueChange={setContainerForUndocking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingContainers ? (
                        <SelectItem value="loading" disabled>Loading containers...</SelectItem>
                      ) : !containers || containers.length === 0 ? (
                        <SelectItem value="none" disabled>No containers available</SelectItem>
                      ) : (
                        containers.map(container => (
                          <SelectItem key={container.containerId} value={container.containerId}>
                            {container.containerId} ({container.zone})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Maximum Weight (kg)</Label>
                  <Input
                    type="number"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
              
              {/* Waste Items Summary */}
              <div className="mt-6 border rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">Waste Items Summary</h3>
                {isLoadingWaste ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3D59] mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading waste items...</p>
                  </div>
                ) : !wasteItems || wasteItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No waste items identified</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Items</p>
                        <p className="text-2xl font-bold">{wasteItems.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Weight</p>
                        <p className="text-2xl font-bold">
                          {wasteItems.reduce((sum, item) => sum + (item.mass || 0), 0).toFixed(1)} kg
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Items by Type</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Expired Items</span>
                          <span className="text-sm font-medium">
                            {wasteItems.filter(item => new Date(item.expiryDate) < new Date()).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Depleted Items</span>
                          <span className="text-sm font-medium">
                            {wasteItems.filter(item => item.usageLimit <= 0).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Create Plan Button */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={createReturnPlan}
                  disabled={isCreatingPlan || !isFormComplete || isLoadingWaste || (wasteItems && wasteItems.length === 0)}
                  className="bg-[#1E3D59] text-white hover:bg-[#17304a]"
                >
                  {isCreatingPlan ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                      Creating Plan...
                    </>
                  ) : (
                    <>
                      <TruckIcon className="mr-2 h-4 w-4" />
                      Create Return Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="schedule">
            {returnPlan ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-[#1E3D59] mb-2">Return Plan Details</h3>
                  <p>
                    <span className="font-semibold">Date:</span> {date ? format(date, 'PPP') : 'Not set'}
                  </p>
                  <p>
                    <span className="font-semibold">Container:</span> {containerForUndocking}
                  </p>
                  <p>
                    <span className="font-semibold">Maximum Weight:</span> {maxWeight} kg
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-[#1E3D59] mb-3">Steps</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    {returnPlan.steps.map((step, index) => (
                      <li key={index} className="bg-white p-3 rounded-md border">
                        {step.description}
                      </li>
                    ))}
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-[#1E3D59] mb-3">Items to Retrieve</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Location</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {returnPlan.retrieval.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">{item.itemId}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{item.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">{item.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setReturnPlan(null)}
                  >
                    Cancel Plan
                  </Button>
                  <Button
                    onClick={completeUndocking}
                    className="bg-[#1E3D59] text-white hover:bg-[#17304a]"
                  >
                    <PackageIcon className="mr-2 h-4 w-4" />
                    Complete Undocking
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheckIcon className="inline-block h-12 w-12 mb-3 text-gray-400" />
                <p>No return plans created yet</p>
                <p className="text-sm mt-1">Create a plan to see details here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}