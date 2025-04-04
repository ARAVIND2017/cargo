import { useState, useEffect } from 'react';

export default function Header() {
  const [missionTime, setMissionTime] = useState('000:00:00');
  
  useEffect(() => {
    // Simulate mission time counter
    const startDate = new Date('2024-01-01');
    
    const updateMissionTime = () => {
      const now = new Date();
      const diff = now.getTime() - startDate.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setMissionTime(`${days.toString().padStart(3, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };
    
    updateMissionTime();
    const interval = setInterval(updateMissionTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <header className="bg-[#1E3D59] text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h1 className="text-xl font-bold font-['Space_Grotesk']">SPACE STATION STORAGE MANAGEMENT</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-[#1a3650] px-3 py-1 rounded-full text-sm">
            <div className="h-2 w-2 rounded-full bg-[#4CAF50] animate-pulse"></div>
            <span className="font-['Roboto_Mono']">SYSTEMS ONLINE</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-['Roboto_Mono'] text-sm">MISSION TIME:</span>
            <span className="font-['Roboto_Mono'] font-bold">{missionTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
