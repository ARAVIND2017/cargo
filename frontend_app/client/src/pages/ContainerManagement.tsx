import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import UploadModal from '@/components/shared/UploadModal';
import { apiRequest } from '@/lib/queryClient';

export default function ContainerManagement() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddContainerOpen, setIsAddContainerOpen] = useState(false);
  const [newContainer, setNewContainer] = useState({
    containerId: '',
    zone: '',
    width: 0,
    depth: 0,
    height: 0
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch containers
  const { data: containers, isLoading } = useQuery<Container[]>({
    queryKey: ['/api/placements/containers'],
  });
  
  // Add container mutation
  const addContainerMutation = useMutation({
    mutationFn: async (container: Omit<Container, 'id'>) => {
      return await apiRequest('POST', '/api/placements/containers', container);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/placements/containers'] });
      toast({
        title: 'Container added',
        description: `Container ${newContainer.containerId} has been added successfully`,
      });
      setIsAddContainerOpen(false);
      resetNewContainer();
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding container',
        description: error.message || 'An error occurred while adding the container',
        variant: 'destructive',
      });
    }
  });
  
  // Delete container mutation
  const deleteContainerMutation = useMutation({
    mutationFn: async (containerId: string) => {
      return await apiRequest('DELETE', `/api/placements/containers/${containerId}`);
    },
    onSuccess: (_, containerId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/placements/containers'] });
      toast({
        title: 'Container deleted',
        description: `Container ${containerId} has been deleted successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting container',
        description: error.message || 'An error occurred while deleting the container',
        variant: 'destructive',
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewContainer(prev => ({
      ...prev,
      [name]: name === 'width' || name === 'depth' || name === 'height' 
        ? parseInt(value) || 0 
        : value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newContainer.containerId || !newContainer.zone || 
        !newContainer.width || !newContainer.depth || !newContainer.height) {
      toast({
        title: 'Form incomplete',
        description: 'Please fill in all the required fields',
        variant: 'destructive',
      });
      return;
    }
    
    addContainerMutation.mutate(newContainer);
  };
  
  const resetNewContainer = () => {
    setNewContainer({
      containerId: '',
      zone: '',
      width: 0,
      depth: 0,
      height: 0
    });
  };
  
  const handleDeleteContainer = (containerId: string) => {
    if (window.confirm(`Are you sure you want to delete container ${containerId}?`)) {
      deleteContainerMutation.mutate(containerId);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Container Management</h2>
        <div className="flex space-x-3">
          <button
            className="bg-[#1E3D59] hover:bg-[#17304a] text-white px-4 py-2 rounded-md flex items-center space-x-2 text-sm"
            onClick={() => setIsAddContainerOpen(true)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Container</span>
          </button>
          <button
            className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center space-x-2 text-sm"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload CSV</span>
          </button>
        </div>
      </div>
      
      {/* Containers List */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-[#1E3D59] mb-4">Available Containers</h3>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
          </div>
        ) : containers?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>No containers available. Add a container or upload a CSV file.</p>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {containers?.map((container) => (
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
                        0 items
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button className="text-gray-500 hover:text-[#1E3D59]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-gray-500 hover:text-[#FFC107]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          className="text-gray-500 hover:text-[#FF6B6B]"
                          onClick={() => handleDeleteContainer(container.containerId)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add Container Modal */}
      <Dialog open={isAddContainerOpen} onOpenChange={setIsAddContainerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1E3D59]">Add New Container</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="containerId">Container ID</Label>
                  <Input 
                    id="containerId"
                    name="containerId"
                    placeholder="e.g., CONT-A"
                    value={newContainer.containerId}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Input 
                    id="zone"
                    name="zone"
                    placeholder="e.g., Crew Quarters"
                    value={newContainer.zone}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (cm)</Label>
                  <Input 
                    id="width"
                    name="width"
                    type="number"
                    placeholder="Width"
                    value={newContainer.width || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="depth">Depth (cm)</Label>
                  <Input 
                    id="depth"
                    name="depth"
                    type="number"
                    placeholder="Depth"
                    value={newContainer.depth || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input 
                    id="height"
                    name="height"
                    type="number"
                    placeholder="Height"
                    value={newContainer.height || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddContainerOpen(false);
                  resetNewContainer();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#1E3D59] hover:bg-[#17304a]"
                disabled={addContainerMutation.isPending}
              >
                {addContainerMutation.isPending ? 'Adding...' : 'Add Container'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Upload CSV Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
