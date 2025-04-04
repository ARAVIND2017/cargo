import { useState, useEffect, useRef } from 'react';
import { Container, Item } from '@/types';
import { useQuery } from '@tanstack/react-query';

interface Container3DProps {
  container: Container;
  viewType: '2D' | '3D';
}

export default function Container3D({ container, viewType }: Container3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch items for this container
  const { data: items } = useQuery<Item[]>({
    queryKey: [`/api/placements/containers/${container.containerId}/items`],
  });
  
  // Helper function to determine item style based on expiry
  const getItemStyle = (item: Item) => {
    const now = new Date();
    const expiry = new Date(item.expiryDate);
    
    if (expiry < now) {
      return 'bg-[#FF6B6B] bg-opacity-30 border border-[#FF6B6B]'; // Expired
    }
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    if (expiry < thirtyDaysFromNow) {
      return 'bg-[#FFC107] bg-opacity-30 border border-[#FFC107]'; // Expiring soon
    }
    
    return 'bg-[#4CAF50] bg-opacity-30 border border-[#4CAF50]'; // Active
  };
  
  // Calculate relative position within container based on item position
  const calculateItemPosition = (item: Item) => {
    if (!item.position) return { top: 0, left: 0, width: 0, height: 0 };
    
    const { startCoordinates, endCoordinates } = item.position;
    
    // Calculate position as percentage of container dimensions
    const top = (startCoordinates.height / container.height) * 100;
    const left = (startCoordinates.width / container.width) * 100;
    
    // Calculate dimensions as percentage of container dimensions
    const width = ((endCoordinates.width - startCoordinates.width) / container.width) * 100;
    const height = ((endCoordinates.height - startCoordinates.height) / container.height) * 100;
    
    return { top, left, width, height };
  };
  
  // Apply 3D rotation on hover
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (viewType === '3D') {
      if (isHovered) {
        containerRef.current.style.transform = 'scale(1.05)';
      } else {
        containerRef.current.style.transform = 'scale(1)';
      }
    } else {
      containerRef.current.style.transform = 'none';
    }
  }, [isHovered, viewType]);
  
  // Calculate random positioning for demo when real data isn't available
  const getRandomPosition = (index: number) => {
    // Create a deterministic but distributed pattern
    const rowCount = Math.ceil(Math.sqrt(10)); // Assume max 10 items
    const row = Math.floor(index / rowCount);
    const col = index % rowCount;
    
    const top = 10 + row * 25; // 25% spacing between rows
    const left = 10 + col * 25; // 25% spacing between columns
    
    return { top, left, width: 20, height: 15 };
  };
  
  return (
    <div
      ref={containerRef}
      className="container-face absolute cursor-pointer"
      style={{
        top: `${10 + (parseInt(container.containerId.slice(-1), 36) * 30) % 60}%`,
        left: `${10 + (parseInt(container.containerId.slice(-1), 36) * 40) % 70}%`,
        width: `${container.width / 3}px`,
        height: `${container.height / 3}px`,
        transition: 'transform 0.3s ease'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="absolute inset-0 bg-[#1E3D59] bg-opacity-10 border-2 border-[#1E3D59] rounded-md"
        style={viewType === '3D' ? { transform: 'rotate3d(1, 1, 0, 10deg)' } : {}}
      >
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <span className="text-xs font-['Roboto_Mono'] text-[#1E3D59] font-bold">{container.containerId}</span>
          <span className="bg-[#1E3D59] text-white text-xs px-1 rounded">{container.zone}</span>
        </div>
        
        {/* Items within container */}
        {items?.map((item, index) => {
          const position = item.position 
            ? calculateItemPosition(item) 
            : getRandomPosition(index);
          
          return (
            <div 
              key={item.itemId}
              className={`item-box absolute ${getItemStyle(item)}`}
              style={{
                top: `${position.top}%`,
                left: `${position.left}%`,
                width: `${position.width}%`,
                height: `${position.height}%`,
                minWidth: '20px',
                minHeight: '15px',
                transition: 'all 0.3s ease'
              }}
            >
              <div className="absolute -top-4 text-xs font-['Roboto_Mono']">{item.name}</div>
            </div>
          );
        })}
        
        {/* Show empty indicator if no items */}
        {(!items || items.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}
