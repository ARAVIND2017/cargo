import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { RetrievalLog } from '@/types';

interface RecentActivityLogProps {
  limit?: number;
}

export default function RecentActivityLog({ limit = 4 }: RecentActivityLogProps) {
  const { data: activityLogs, isLoading } = useQuery<RetrievalLog[]>({
    queryKey: ['/api/retrievals/logs'],
  });
  
  // Icons for different activity types
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
      case 'inventory':
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-[#1E3D59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'expiry':
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-[#FFC107]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'waste':
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-[#FF6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };
  
  // Mock activity logs for initial render
  const mockLogs = [
    {
      id: '1',
      type: 'transfer',
      title: 'Item Transferred',
      description: 'Oxygen Cylinder moved from CONT-B to CONT-A',
      user: 'Astronaut Alice',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'inventory',
      title: 'Inventory Check',
      description: 'Weekly inventory check completed',
      user: 'System',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'expiry',
      title: 'Expiry Alert',
      description: 'Food Packet 001 expired',
      user: 'System',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'waste',
      title: 'Waste Scheduled',
      description: '3 items scheduled for waste return',
      user: 'Commander Bob',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  // Use fetched data or mock data
  const displayLogs = isLoading || !activityLogs ? mockLogs : activityLogs;
  const limitedLogs = displayLogs.slice(0, limit);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-bold text-[#1E3D59] mb-4">Recent Activity</h3>
      {isLoading ? (
        <div className="space-y-4">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="flex space-x-3 animate-pulse">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200"></div>
              <div className="flex-grow">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {limitedLogs.map((log) => (
              <div key={log.id} className="flex space-x-3 pb-3 border-b border-gray-100">
                {getActivityIcon(log.type)}
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">{log.title}</p>
                    <span className="text-xs text-gray-500 font-['Roboto_Mono']">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-1">By: {log.user}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-center text-[#1E3D59] text-sm hover:underline">
            View all activity →
          </button>
        </>
      )}
    </div>
  );
}
