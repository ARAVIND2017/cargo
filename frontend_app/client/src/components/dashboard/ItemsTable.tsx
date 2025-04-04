import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@/types';
import { apiRequest } from '@/lib/queryClient';

export default function ItemsTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ['/api/placements/items'],
  });
  
  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.containerId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Handle item viewing
  const handleViewItem = async (itemId: string) => {
    try {
      await apiRequest('GET', `/api/placements/items/${itemId}`);
      // Additional functionality can be added here
    } catch (error) {
      console.error('Error viewing item:', error);
    }
  };
  
  // Handle item movement
  const handleMoveItem = async (itemId: string) => {
    try {
      // This would be replaced with a modal for selecting destination
      await apiRequest('POST', `/api/retrieval/move`, { 
        itemId, 
        destinationContainerId: 'newContainer' 
      });
    } catch (error) {
      console.error('Error moving item:', error);
    }
  };
  
  // Get status badge class based on item expiry
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
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#1E3D59]">Item Inventory</h3>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search items..." 
            className="pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3D59] focus:border-[#1E3D59]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Container
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {isLoading ? (
              Array(itemsPerPage).fill(0).map((_, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  {searchQuery ? 'No items found matching your search' : 'No items available'}
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.itemId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-['Roboto_Mono']">{item.itemId}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 font-['Roboto_Mono']">{item.containerId}</td>
                  <td className={`px-4 py-3 font-['Roboto_Mono'] ${
                    new Date(item.expiryDate) < new Date() ? 'text-[#FF6B6B]' : 'text-[#4CAF50]'
                  }`}>
                    {item.expiryDate}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(item.expiryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button 
                        className="text-gray-500 hover:text-[#1E3D59]" 
                        onClick={() => handleViewItem(item.itemId)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        className="text-gray-500 hover:text-[#FFC107]"
                        onClick={() => handleMoveItem(item.itemId)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing <span className="font-medium">{Math.min(filteredItems.length, itemsPerPage)}</span> of <span className="font-medium">{filteredItems.length}</span> items
        </div>
        <div className="flex space-x-1">
          <button 
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={currentPage === 1 || isLoading}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            Previous
          </button>
          <button 
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={currentPage === totalPages || isLoading || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
