import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import RecentActivityLog from '@/components/dashboard/RecentActivityLog';
import TimeSimulator from '@/components/simulation/TimeSimulator';

export default function Simulation() {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [automaticExpiry, setAutomaticExpiry] = useState(true);
  const [simulatedHours, setSimulatedHours] = useState(0);
  const [simulationTime, setSimulationTime] = useState('T+00:00:00');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current simulation status
  const { data: simulationStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/simulation/status'],
    refetchInterval: isSimulationRunning ? 5000 : false,
  });
  
  // Start simulation mutation
  const startSimulationMutation = useMutation({
    mutationFn: async (data: { speed: number, autoExpiry: boolean }) => {
      return await apiRequest('POST', '/api/simulation/start', data);
    },
    onSuccess: () => {
      setIsSimulationRunning(true);
      toast({
        title: 'Simulation started',
        description: `Running at ${simulationSpeed}x speed`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error starting simulation',
        description: error.message || 'Failed to start simulation',
        variant: 'destructive',
      });
    }
  });
  
  // Pause simulation mutation
  const pauseSimulationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/simulation/pause', {});
    },
    onSuccess: () => {
      setIsSimulationRunning(false);
      toast({
        title: 'Simulation paused',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error pausing simulation',
        description: error.message || 'Failed to pause simulation',
        variant: 'destructive',
      });
    }
  });
  
  // Advance time mutation
  const advanceTimeMutation = useMutation({
    mutationFn: async (hours: number) => {
      return await apiRequest('POST', '/api/simulation/advance-time', { hours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/retrievals/logs'] });
      
      toast({
        title: 'Time advanced',
        description: `Simulation time advanced by ${simulatedHours} hours`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error advancing time',
        description: error.message || 'Failed to advance simulation time',
        variant: 'destructive',
      });
    }
  });
  
  // Reset simulation mutation
  const resetSimulationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/simulation/reset', {});
    },
    onSuccess: () => {
      setIsSimulationRunning(false);
      queryClient.invalidateQueries();
      
      toast({
        title: 'Simulation reset',
        description: 'All simulation data has been reset to initial state',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error resetting simulation',
        description: error.message || 'Failed to reset simulation',
        variant: 'destructive',
      });
    }
  });
  
  // Update simulation time format
  useEffect(() => {
    if (simulationStatus?.elapsedHours !== undefined) {
      const hours = Math.floor(simulationStatus.elapsedHours);
      const minutes = Math.floor((simulationStatus.elapsedHours % 1) * 60);
      const seconds = Math.floor((((simulationStatus.elapsedHours % 1) * 60) % 1) * 60);
      
      setSimulationTime(`T+${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [simulationStatus]);
  
  // Handle simulation start
  const handleStartSimulation = () => {
    startSimulationMutation.mutate({ 
      speed: simulationSpeed, 
      autoExpiry: automaticExpiry 
    });
  };
  
  // Handle simulation pause
  const handlePauseSimulation = () => {
    pauseSimulationMutation.mutate();
  };
  
  // Handle time advancement
  const handleAdvanceTime = () => {
    if (simulatedHours <= 0) {
      toast({
        title: 'Invalid time value',
        description: 'Please enter a positive number of hours',
        variant: 'destructive',
      });
      return;
    }
    
    advanceTimeMutation.mutate(simulatedHours);
  };
  
  // Handle simulation reset
  const handleResetSimulation = () => {
    if (window.confirm('Are you sure you want to reset the simulation? This will reset all data to its initial state.')) {
      resetSimulationMutation.mutate();
    }
  };
  
  // Update simulation status from server
  useEffect(() => {
    if (simulationStatus?.isRunning !== undefined) {
      setIsSimulationRunning(simulationStatus.isRunning);
    }
  }, [simulationStatus]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Simulation Control</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-[#1a3650] px-3 py-1 rounded-full text-sm text-white">
            <div className={`h-2 w-2 rounded-full ${isSimulationRunning ? 'bg-[#4CAF50] animate-pulse' : 'bg-[#FF6B6B]'}`}></div>
            <span className="font-['Roboto_Mono']">
              {isSimulationRunning ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-['Roboto_Mono'] text-sm">SIM TIME:</span>
            <span className="font-['Roboto_Mono'] font-bold">{simulationTime}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="bg-[#1E3D59] text-white pb-3">
              <CardTitle className="text-lg">Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-medium text-[#1E3D59] mb-3">Time Control</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sim-speed" className="mb-2 block">Simulation Speed (x{simulationSpeed})</Label>
                      <div className="flex items-center space-x-2">
                        <span>1x</span>
                        <Slider
                          id="sim-speed"
                          defaultValue={[10]}
                          min={1}
                          max={100}
                          step={1}
                          value={[simulationSpeed]}
                          onValueChange={(value) => setSimulationSpeed(value[0])}
                          className="flex-grow"
                          disabled={isSimulationRunning}
                        />
                        <span>100x</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        className={`flex-1 ${isSimulationRunning ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#1E3D59] hover:bg-[#17304a] text-white'}`}
                        onClick={handleStartSimulation}
                        disabled={isSimulationRunning || startSimulationMutation.isPending}
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start
                      </Button>
                      <Button
                        className={`flex-1 ${!isSimulationRunning ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-white border border-gray-300 text-[#2C3E50] hover:bg-gray-50'}`}
                        onClick={handlePauseSimulation}
                        disabled={!isSimulationRunning || pauseSimulationMutation.isPending}
                        variant="outline"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pause
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-expiry"
                        checked={automaticExpiry}
                        onCheckedChange={setAutomaticExpiry}
                        disabled={isSimulationRunning}
                      />
                      <Label htmlFor="auto-expiry">Automatic Item Expiry</Label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-[#1E3D59] mb-3">Manual Controls</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="advance-time" className="mb-2 block">Advance Time (hours)</Label>
                      <div className="flex space-x-2">
                        <input
                          id="advance-time"
                          type="number"
                          min="0"
                          step="1"
                          value={simulatedHours}
                          onChange={(e) => setSimulatedHours(parseInt(e.target.value) || 0)}
                          className="flex-grow pl-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3D59] focus:border-[#1E3D59]"
                        />
                        <Button
                          onClick={handleAdvanceTime}
                          disabled={advanceTimeMutation.isPending || isSimulationRunning}
                        >
                          Advance
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Button
                        variant="destructive"
                        className="w-full bg-[#FF6B6B] hover:bg-[#ff5252]"
                        onClick={handleResetSimulation}
                        disabled={resetSimulationMutation.isPending}
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Simulation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <CardHeader className="bg-[#1E3D59] text-white pb-3">
              <CardTitle className="text-lg">Simulation Status</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {isLoadingStatus ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3D59]"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`font-['Roboto_Mono'] text-sm ${isSimulationRunning ? 'text-[#4CAF50]' : 'text-[#FF6B6B]'}`}>
                      {isSimulationRunning ? 'RUNNING' : 'PAUSED'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Simulation Time:</span>
                    <span className="font-['Roboto_Mono'] text-sm">{simulationTime}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Simulation Speed:</span>
                    <span className="font-['Roboto_Mono'] text-sm">{simulationSpeed}x</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Auto Expiry:</span>
                    <span className={`font-['Roboto_Mono'] text-sm ${automaticExpiry ? 'text-[#4CAF50]' : 'text-[#FF6B6B]'}`}>
                      {automaticExpiry ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Expired Items:</span>
                    <span className="font-['Roboto_Mono'] text-sm text-[#FF6B6B]">
                      {simulationStatus?.expiredItems || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Advanced Time Simulation */}
      <div className="mb-8">
        <TimeSimulator />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-[#1E3D59] text-white pb-3">
            <CardTitle className="text-lg">Simulation Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivityLog limit={8} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-[#1E3D59] text-white pb-3">
            <CardTitle className="text-lg">Simulation Documentation</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold mb-1">Time Controls</h4>
                <p className="text-gray-600">
                  Control the speed of the simulation from 1x (real-time) to 100x acceleration. Start and pause the simulation to observe changes over time.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-1">Automatic Item Expiry</h4>
                <p className="text-gray-600">
                  When enabled, items will automatically expire based on their expiry date as simulation time advances.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-1">Manual Time Advancement</h4>
                <p className="text-gray-600">
                  Jump forward in time by a specified number of hours to quickly test expiry scenarios and system behaviors.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-1">Simulation Reset</h4>
                <p className="text-gray-600">
                  Reset the simulation to its initial state. This will clear all simulation data and return to T+00:00:00.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
