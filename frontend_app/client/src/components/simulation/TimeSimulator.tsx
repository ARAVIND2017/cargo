import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FastForwardIcon, PlayIcon, PauseIcon, Clock3Icon, RotateCcwIcon } from 'lucide-react';
import { format } from 'date-fns';
import { simulationApi } from '@/lib/api';
import { Item } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function TimeSimulator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for simulation controls
  const [simMode, setSimMode] = useState<'days' | 'date'>('days');
  const [numDays, setNumDays] = useState(1);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [simResults, setSimResults] = useState<{
    newDate: string;
    changes: {
      itemsUsed: any[];
      itemsExpired: any[];
      itemsDepletedToday: any[];
    }
  } | null>(null);
  
  // Fetch all items for selection
  const { data: items } = useQuery<Item[]>({ 
    queryKey: ['/api/placements/items'],
  });
  
  // Fetch current simulation status
  const { data: simulationStatus, refetch: refetchStatus } = useQuery({ 
    queryKey: ['/api/simulation/status'],
  });
  
  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };
  
  // Run the simulation
  const runSimulation = async () => {
    setIsLoading(true);
    setSimResults(null);
    
    try {
      // Prepare selected items data
      const itemsToBeUsedPerDay = selectedItems.map(itemId => {
        const item = items?.find(i => i.itemId === itemId);
        return {
          itemId,
          name: item?.name
        };
      });
      
      // Execute simulation based on mode
      const result = await simulationApi.simulateDays(
        simMode === 'days' ? numDays : undefined,
        simMode === 'date' && targetDate ? targetDate.toISOString() : undefined,
        itemsToBeUsedPerDay
      );
      
      if (result.success) {
        setSimResults(result);
        
        // Show success message
        toast({
          title: 'Simulation Complete',
          description: `Simulated to ${new Date(result.newDate).toLocaleDateString()}`,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/placements/containers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/waste/identify'] });
        queryClient.invalidateQueries({ queryKey: ['/api/simulation/status'] });
        await refetchStatus();
      } else {
        toast({
          title: 'Simulation Failed',
          description: result.message || 'An error occurred during simulation',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Simulation Error',
        description: error.message || 'An error occurred during simulation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset simulation
  const resetSimulation = async () => {
    try {
      await simulationApi.reset();
      setSimResults(null);
      toast({
        title: 'Simulation Reset',
        description: 'Simulation has been reset to the current date',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/status'] });
      await refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Reset Error',
        description: error.message || 'An error occurred while resetting',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-[#1E3D59] text-white">
          <CardTitle className="flex justify-between items-center">
            <span>Time Simulation</span>
            <div className="text-sm font-normal">
              Current Date: {simulationStatus?.currentDate 
                ? new Date(simulationStatus.currentDate).toLocaleDateString() 
                : new Date().toLocaleDateString()}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="config">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Simulation Mode Selection */}
                  <div className="space-y-2">
                    <Label>Simulation Mode</Label>
                    <Select value={simMode} onValueChange={(value: 'days' | 'date') => setSimMode(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Advance by Days</SelectItem>
                        <SelectItem value="date">Advance to Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Days Input or Date Picker based on mode */}
                  {simMode === 'days' ? (
                    <div className="space-y-2">
                      <Label>Number of Days</Label>
                      <Input
                        type="number"
                        min="1"
                        value={numDays}
                        onChange={(e) => setNumDays(parseInt(e.target.value))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {targetDate ? format(targetDate, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={targetDate}
                            onSelect={setTargetDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                
                {/* Item Selection */}
                <div className="space-y-2">
                  <Label>Items to Be Used (per day)</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3">
                    {!items || items.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No items available</div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.itemId} className="flex items-center space-x-2">
                            <Checkbox
                              id={`item-${item.itemId}`}
                              checked={selectedItems.includes(item.itemId)}
                              onCheckedChange={() => toggleItemSelection(item.itemId)}
                            />
                            <Label htmlFor={`item-${item.itemId}`} className="flex-1 cursor-pointer">
                              {item.name} <span className="text-xs text-gray-500">({item.itemId})</span>
                            </Label>
                            <Badge variant="outline">Uses: {item.usageLimit}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Simulation Controls */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={resetSimulation}
                    disabled={isLoading}
                  >
                    <RotateCcwIcon className="mr-2 h-4 w-4" />
                    Reset Simulation
                  </Button>
                  <Button
                    onClick={runSimulation}
                    disabled={isLoading || (simMode === 'date' && !targetDate)}
                    className="bg-[#1E3D59] text-white hover:bg-[#17304a]"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                        Simulating...
                      </>
                    ) : (
                      <>
                        <FastForwardIcon className="mr-2 h-4 w-4" />
                        Run Simulation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="results">
              {simResults ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="text-lg font-medium text-[#1E3D59] mb-2">Simulation Summary</h3>
                    <p>
                      <span className="font-semibold">New Date:</span> {new Date(simResults.newDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Used Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {simResults.changes.itemsUsed.length === 0 ? (
                          <p className="text-sm text-gray-500">No items were used</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {simResults.changes.itemsUsed.map((item, index) => (
                              <li key={index} className="flex justify-between">
                                <span>{item.name}</span>
                                <Badge variant="outline">{item.remainingUses} uses left</Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-amber-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Expired Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {simResults.changes.itemsExpired.length === 0 ? (
                          <p className="text-sm text-gray-500">No items expired</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {simResults.changes.itemsExpired.map((item, index) => (
                              <li key={index}>{item.name} ({item.itemId})</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-red-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Depleted Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {simResults.changes.itemsDepletedToday.length === 0 ? (
                          <p className="text-sm text-gray-500">No items depleted</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {simResults.changes.itemsDepletedToday.map((item, index) => (
                              <li key={index}>{item.name} ({item.itemId})</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock3Icon className="inline-block h-12 w-12 mb-3 text-gray-400" />
                  <p>Run a simulation to see results</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}