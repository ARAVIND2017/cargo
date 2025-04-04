import { useState } from 'react';
import Container3D from '../shared/Container3D';
import { Container } from '@/types';

interface ContainerVisualizationProps {
  containers: Container[];
  isLoading: boolean;
}

export default function ContainerVisualization({ containers, isLoading }: ContainerVisualizationProps) {
  const [viewType, setViewType] = useState<'3D' | '2D'>('3D');
  
  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#1E3D59]">Container Visualization</h3>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded text-sm ${viewType === '2D' ? 'bg-[#1E3D59] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setViewType('2D')}
          >
            2D View
          </button>
          <button 
            className={`px-3 py-1 rounded text-sm ${viewType === '3D' ? 'bg-[#1E3D59] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setViewType('3D')}
          >
            3D View
          </button>
        </div>
      </div>
      
      <div className="container-3d h-96 bg-gray-50 rounded-md border border-gray-200 p-4 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
          </div>
        ) : containers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>No containers available</p>
          </div>
        ) : (
          <>
            {containers.map((container) => (
              <Container3D 
                key={container.containerId}
                container={container}
                viewType={viewType}
              />
            ))}
            
            {/* Legend */}
            <div className="absolute bottom-2 right-2 bg-white bg-opacity-80 p-2 rounded text-xs">
              <div className="flex items-center mb-1">
                <div className="w-3 h-3 bg-[#4CAF50] mr-1"></div>
                <span>Active items</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#FFC107] mr-1"></div>
                <span>Expiring items</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
