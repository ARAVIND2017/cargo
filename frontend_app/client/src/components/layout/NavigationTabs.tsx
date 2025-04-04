import { Link, useLocation } from 'wouter';

export default function NavigationTabs() {
  const [location] = useLocation();
  
  const tabs = [
    { path: '/', label: 'Dashboard' },
    { path: '/containers', label: 'Container Management' },
    { path: '/items', label: 'Item Tracking' },
    { path: '/waste', label: 'Waste Management' },
    { path: '/simulation', label: 'Simulation' },
    { path: '/reports', label: 'Reports' },
  ];
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const isActive = 
              (tab.path === '/' && location === '/') || 
              (tab.path !== '/' && location.startsWith(tab.path));
            
            return (
              <Link 
                key={tab.path} 
                href={tab.path} 
                className={`px-4 py-3 hover:text-[#1E3D59] ${isActive 
                  ? 'text-[#1E3D59] border-b-2 border-[#1E3D59] font-medium' 
                  : 'text-gray-500'}`}>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
