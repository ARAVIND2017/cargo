import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Item, Container } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import UploadModal from '@/components/shared/UploadModal';

export default function ItemTracking() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItem, setNewItem] = useState({
    itemId: '',
    name: '',
    containerId: '',
    expiryDate: '',
    usageLimit: 1,
    mass: 0,
    width: 0,
    depth: 0,
    height: 0
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch items
  const { data: items, isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/placements/items'],
  });
  
  // Fetch containers for dropdown
  const { data: containers } = useQuery<Container[]>({
    queryKey: ['/api/placements/containers'],
  });
  
  // Filter items based on search query
  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.containerId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<Item, 'id'>) => {
      return await apiRequest('POST', '/api/placements/items', item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      toast({
        title: 'Item added',
        description: `Item ${newItem.name} has been added successfully`,
      });
      setIsAddItemOpen(false);
      resetNewItem();
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding item',
        description: error.message || 'An error occurred while adding the item',
        variant: 'destructive',
      });
    }
  });
  
  // Retrieve item mutation
  const retrieveItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('POST', `/api/retrieval/items/${itemId}/retrieve`, {
        retrievedBy: 'Current User',
      });
    },
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      toast({
        title: 'Item retrieved',
        description: `Item ${itemId} has been retrieved successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error retrieving item',
        description: error.message || 'An error occurred while retrieving the item',
        variant: 'destructive',
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: ['usageLimit', 'mass', 'width', 'depth', 'height'].includes(name)
        ? parseInt(value) || 0 
        : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newItem.itemId || !newItem.name || !newItem.containerId || !newItem.expiryDate) {
      toast({
        title: 'Form incomplete',
        description: 'Please fill in all the required fields',
        variant: 'destructive',
      });
      return;
    }
    
    addItemMutation.mutate(newItem);
  };
  
  const resetNewItem = () => {
    setNewItem({
      itemId: '',
      name: '',
      containerId: '',
      expiryDate: '',
      usageLimit: 1,
      mass: 0,
      width: 0,
      depth: 0,
      height: 0
    });
  };
  
  const handleRetrieveItem = (itemId: string) => {
    if (window.confirm(`Are you sure you want to retrieve item ${itemId}?`)) {
      retrieveItemMutation.mutate(itemId);
    }
  };
  
  // Get status badge based on expiry date
  const getStatusBadge = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    
    if (expiry < now) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-[#FF6B6B] bg-opacity-10 text-[#FF6B6B]">
          Expired
        </span>
      );
    }
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    if (expiry < thirtyDaysFromNow) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-[#FFC107] bg-opacity-10 text-[#FFC107]">
          Expiring Soon
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-[#4CAF50] bg-opacity-10 text-[#4CAF50]">
        Active
      </span>
    );
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Item Tracking</h2>
        <div className="flex space-x-3">
          <button
            className="bg-[#1E3D59] hover:bg-[#17304a] text-white px-4 py-2 rounded-md flex items-center space-x-2 text-sm"
            onClick={() => setIsAddItemOpen(true)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Item</span>
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
      
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-[#1E3D59]">Search Items</h3>
          <div className="relative w-64">
            <input 
              type="text" 
              placeholder="Search by name, ID, or container..." 
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3D59] focus:border-[#1E3D59]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-[#1E3D59] mb-4">Tracked Items</h3>
        
        {isLoadingItems ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3D59]"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? (
              <p>No items found matching your search criteria.</p>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <p>No items available. Add an item or upload a CSV file.</p>
              </>
            )}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Limit</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.itemId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-['Roboto_Mono']">{item.itemId}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 font-['Roboto_Mono']">{item.containerId}</td>
                    <td className={`px-4 py-3 font-['Roboto_Mono'] ${
                      new Date(item.expiryDate) < new Date() ? 'text-[#FF6B6B]' : 'text-[#4CAF50]'
                    }`}>
                      {item.expiryDate}
                    </td>
                    <td className="px-4 py-3 font-['Roboto_Mono']">{item.usageLimit}</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.expiryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          className="text-gray-500 hover:text-[#4CAF50]"
                          onClick={() => handleRetrieveItem(item.itemId)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </button>
                        <button className="text-gray-500 hover:text-[#1E3D59]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-gray-500 hover:text-[#FFC107]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
      
      {/* Add Item Modal */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1E3D59]">Add New Item</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="itemId">Item ID</Label>
                  <Input 
                    id="itemId"
                    name="itemId"
                    placeholder="e.g., 001"
                    value={newItem.itemId}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="e.g., Food Packet"
                    value={newItem.name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="containerId">Container</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('containerId', value)}
                    value={newItem.containerId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      {containers?.map((container) => (
                        <SelectItem key={container.containerId} value={container.containerId}>
                          {container.containerId} ({container.zone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input 
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={newItem.expiryDate}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input 
                    id="usageLimit"
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={newItem.usageLimit || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mass">Mass (kg)</Label>
                  <Input 
                    id="mass"
                    name="mass"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItem.mass || ''}
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
                    min="0"
                    value={newItem.width || ''}
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
                    min="0"
                    value={newItem.depth || ''}
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
                    min="0"
                    value={newItem.height || ''}
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
                  setIsAddItemOpen(false);
                  resetNewItem();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#1E3D59] hover:bg-[#17304a]"
                disabled={addItemMutation.isPending}
              >
                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
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
