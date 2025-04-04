import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/dashboard/StatusCard';
import ContainerVisualization from '@/components/dashboard/ContainerVisualization';
import RecentActivityLog from '@/components/dashboard/RecentActivityLog';
import ItemsTable from '@/components/dashboard/ItemsTable';
import QuickActions from '@/components/dashboard/QuickActions';
import { Container, Item } from '@/types';

export default function Dashboard() {
  // Fetch containers data
  const { data: containers, isLoading: isLoadingContainers } = useQuery<Container[]>({
    queryKey: ['/api/placements/containers'],
  });
  
  // Fetch items data
  const { data: items, isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/placements/items'],
  });
  
  // Calculate statistics for dashboard
  const totalContainers = containers?.length || 0;
  const totalItems = items?.length || 0;
  
  // Calculate expired items
  const now = new Date();
  const expiredItems = items?.filter(item => new Date(item.expiryDate) < now).length || 0;
  
  // Calculate space utilization
  const calculateSpaceUtilization = () => {
    if (!containers || !items) return { percentage: 0, current: 0, total: 0 };
    
    // Calculate total container volume
    const totalVolume = containers.reduce((sum, container) => {
      return sum + (container.width * container.depth * container.height);
    }, 0);
    
    // Calculate used volume based on items
    const usedVolume = items.reduce((sum, item) => {
      if (!item.position) return sum;
      
      const { startCoordinates, endCoordinates } = item.position;
      const itemVolume = 
        (endCoordinates.width - startCoordinates.width) *
        (endCoordinates.depth - startCoordinates.depth) *
        (endCoordinates.height - startCoordinates.height);
      
      return sum + itemVolume;
    }, 0);
    
    const percentage = totalVolume > 0 ? Math.round((usedVolume / totalVolume) * 100) : 0;
    
    return {
      percentage,
      current: Math.round(usedVolume / 1000), // Convert to cubic units
      total: Math.round(totalVolume / 1000),  // Convert to cubic units
    };
  };
  
  const spaceUtilization = calculateSpaceUtilization();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E3D59]">Mission Dashboard</h2>
        <div className="flex space-x-3">
          <button className="bg-[#1E3D59] hover:bg-[#17304a] text-white px-4 py-2 rounded-md flex items-center space-x-2 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Item</span>
          </button>
          <button className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center space-x-2 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload CSV</span>
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatusCard
          title="Total Containers"
          value={isLoadingContainers ? '...' : totalContainers}
          icon={
            <svg className="h-6 w-6 text-[#1E3D59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          status="All containers operational"
          statusColor="bg-[#4CAF50]"
          borderColor="border-[#1E3D59]"
          iconBgColor="bg-[#1E3D59]/10"
          statusIndicator={true}
        />
        
        <StatusCard
          title="Total Items"
          value={isLoadingItems ? '...' : totalItems}
          icon={
            <svg className="h-6 w-6 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
          status="All items accounted for"
          statusColor="bg-[#4CAF50]"
          borderColor="border-[#4CAF50]"
          iconBgColor="bg-green-100"
          statusIndicator={true}
        />
        
        <StatusCard
          title="Expiring Items"
          value={isLoadingItems ? '...' : expiredItems}
          icon={
            <svg className="h-6 w-6 text-[#FFC107]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          status={`${expiredItems} item${expiredItems === 1 ? '' : 's'} expired`}
          statusColor="bg-[#FFC107]"
          borderColor="border-[#FFC107]"
          iconBgColor="bg-yellow-100"
          statusIndicator={true}
        />
        
        <StatusCard
          title="Space Utilization"
          value={`${spaceUtilization.percentage}%`}
          icon={
            <svg className="h-6 w-6 text-[#FF6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          statusColor="bg-[#FF6B6B]"
          borderColor="border-[#FF6B6B]"
          iconBgColor="bg-red-100"
          progressBar={true}
          progressValue={spaceUtilization.percentage}
          progressText={`Current: ${spaceUtilization.current}/${spaceUtilization.total} cubic units`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ContainerVisualization 
          containers={containers || []} 
          isLoading={isLoadingContainers}
        />
        <RecentActivityLog />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ItemsTable />
        <QuickActions />
      </div>
    </div>
  );
}
