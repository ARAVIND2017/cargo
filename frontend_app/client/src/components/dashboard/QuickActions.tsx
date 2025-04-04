import { useState } from 'react';
import UploadModal from '../shared/UploadModal';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';

export default function QuickActions() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleStartSimulation = async () => {
    try {
      await fetch('/api/simulation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ speed: simulationSpeed }),
      });
      setIsSimulationRunning(true);
      toast({
        title: 'Simulation started',
        description: `Running at ${simulationSpeed}x speed`,
      });
    } catch (error) {
      console.error('Failed to start simulation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start simulation',
        variant: 'destructive',
      });
    }
  };
  
  const handlePauseSimulation = async () => {
    try {
      await fetch('/api/simulation/pause', {
        method: 'POST',
      });
      setIsSimulationRunning(false);
      toast({
        title: 'Simulation paused',
      });
    } catch (error) {
      console.error('Failed to pause simulation:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause simulation',
        variant: 'destructive',
      });
    }
  };

  const handleCheckExpiry = async () => {
    try {
      const response = await fetch('/api/waste/check-expiry');
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      
      toast({
        title: 'Expiry Check Complete',
        description: `Found ${data.expiredItems} expired items`,
      });
    } catch (error) {
      console.error('Error checking expiry:', error);
      toast({
        title: 'Error checking expiry',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-[#1E3D59] mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button 
            className="w-full flex items-center justify-between p-3 bg-[#1E3D59] text-white rounded-md hover:bg-[#17304a] transition-colors"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Import Items
            </span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <Link href="/items">
            <a className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 text-[#2C3E50] rounded-md hover:bg-gray-50 transition-colors">
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Move Items
              </span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </Link>
          
          <button
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 text-[#2C3E50] rounded-md hover:bg-gray-50 transition-colors"
            onClick={handleCheckExpiry}
          >
            <span className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-[#FFC107]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Check Expiry
            </span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <Link href="/waste">
            <a className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 text-[#2C3E50] rounded-md hover:bg-gray-50 transition-colors">
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#FF6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Manage Waste
              </span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </Link>
        </div>
        
        <hr className="my-4 border-gray-200" />
        
        <h4 className="text-sm font-medium text-[#1E3D59] mb-3">Simulation Controls</h4>
        <div className="space-y-3">
          <div className="bg-gray-100 p-3 rounded-md">
            <label className="block text-sm text-gray-700 mb-2">Simulation Time Acceleration</label>
            <div className="flex items-center space-x-2">
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={simulationSpeed} 
                onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                className="flex-grow h-2 rounded-lg appearance-none bg-[#1E3D59]"
              />
              <span className="font-['Roboto_Mono'] text-sm">{simulationSpeed}x</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              className={`flex-1 flex items-center justify-center py-2 rounded transition-colors ${
                isSimulationRunning 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-[#1E3D59] text-white hover:bg-[#17304a]'
              }`}
              onClick={handleStartSimulation}
              disabled={isSimulationRunning}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start
            </button>
            <button 
              className={`flex-1 flex items-center justify-center py-2 rounded transition-colors ${
                !isSimulationRunning 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-[#2C3E50] hover:bg-gray-50'
              }`}
              onClick={handlePauseSimulation}
              disabled={!isSimulationRunning}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </button>
          </div>
        </div>
      </div>
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}
