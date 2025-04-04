import { apiRequest } from './queryClient';
import { 
  Container, 
  Item, 
  RetrievalLog, 
  SimulationStatus, 
  WasteReturnSchedule,
  UploadResponse
} from '@/types';

// Container API
export const containersApi = {
  // Get all containers
  getAll: async (): Promise<Container[]> => {
    const response = await apiRequest('GET', '/api/placements/containers');
    return response.json();
  },
  
  // Get container by ID
  getById: async (containerId: string): Promise<Container> => {
    const response = await apiRequest('GET', `/api/placements/containers/${containerId}`);
    return response.json();
  },
  
  // Create container
  create: async (container: Omit<Container, 'id'>): Promise<Container> => {
    const response = await apiRequest('POST', '/api/placements/containers', container);
    return response.json();
  },
  
  // Update container
  update: async (containerId: string, container: Partial<Container>): Promise<Container> => {
    const response = await apiRequest('PUT', `/api/placements/containers/${containerId}`, container);
    return response.json();
  },
  
  // Delete container
  delete: async (containerId: string): Promise<void> => {
    await apiRequest('DELETE', `/api/placements/containers/${containerId}`);
  },
  
  // Get items in container
  getItems: async (containerId: string): Promise<Item[]> => {
    const response = await apiRequest('GET', `/api/placements/containers/${containerId}/items`);
    return response.json();
  },
  
  // Upload containers via CSV
  uploadCSV: async (formData: FormData): Promise<UploadResponse> => {
    const response = await fetch('/api/import/containers', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }
    
    return response.json();
  }
};

// Item API
export const itemsApi = {
  // Get all items
  getAll: async (): Promise<Item[]> => {
    const response = await apiRequest('GET', '/api/placements/items');
    return response.json();
  },
  
  // Get item by ID
  getById: async (itemId: string): Promise<Item> => {
    const response = await apiRequest('GET', `/api/placements/items/${itemId}`);
    return response.json();
  },
  
  // Create item
  create: async (item: Omit<Item, 'id'>): Promise<Item> => {
    const response = await apiRequest('POST', '/api/placements/items', item);
    return response.json();
  },
  
  // Update item
  update: async (itemId: string, item: Partial<Item>): Promise<Item> => {
    const response = await apiRequest('PUT', `/api/placements/items/${itemId}`, item);
    return response.json();
  },
  
  // Delete item
  delete: async (itemId: string): Promise<void> => {
    await apiRequest('DELETE', `/api/placements/items/${itemId}`);
  },
  
  // Upload items via CSV
  uploadCSV: async (formData: FormData): Promise<UploadResponse> => {
    const response = await fetch('/api/import/items', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }
    
    return response.json();
  }
};

// Retrieval API
export const retrievalApi = {
  // Get all retrieval logs
  getLogs: async (): Promise<RetrievalLog[]> => {
    const response = await apiRequest('GET', '/api/retrievals/logs');
    return response.json();
  },
  
  // Retrieve an item
  retrieveItem: async (itemId: string, retrievedBy: string): Promise<void> => {
    await apiRequest('POST', `/api/retrieval/items/${itemId}/retrieve`, { retrievedBy });
  },
  
  // Move an item to a new container
  moveItem: async (itemId: string, destinationContainerId: string): Promise<void> => {
    await apiRequest('POST', '/api/retrieval/move', { itemId, destinationContainerId });
  }
};

// Waste Management API
export const wasteApi = {
  // Check for expired items
  checkExpiry: async (): Promise<{ expiredItems: number }> => {
    const response = await apiRequest('GET', '/api/waste/check-expiry');
    return response.json();
  },
  
  // Schedule waste return
  scheduleReturn: async (data: WasteReturnSchedule): Promise<void> => {
    await apiRequest('POST', '/api/waste/schedule-return', data);
  },
  
  // Get scheduled returns
  getScheduledReturns: async (): Promise<WasteReturnSchedule[]> => {
    const response = await apiRequest('GET', '/api/waste/scheduled-returns');
    return response.json();
  }
};

// Simulation API
export const simulationApi = {
  // Get simulation status
  getStatus: async (): Promise<SimulationStatus> => {
    const response = await apiRequest('GET', '/api/simulation/status');
    return response.json();
  },
  
  // Start simulation
  start: async (speed: number, autoExpiry: boolean): Promise<void> => {
    await apiRequest('POST', '/api/simulation/start', { speed, autoExpiry });
  },
  
  // Pause simulation
  pause: async (): Promise<void> => {
    await apiRequest('POST', '/api/simulation/pause', {});
  },
  
  // Advance simulation time
  advanceTime: async (hours: number): Promise<void> => {
    await apiRequest('POST', '/api/simulation/advance-time', { hours });
  },
  
  // Reset simulation
  reset: async (): Promise<void> => {
    await apiRequest('POST', '/api/simulation/reset', {});
  },
  
  // Simulate days
  simulateDays: async (
    numOfDays?: number, 
    toTimestamp?: string, 
    itemsToBeUsedPerDay?: Array<{itemId?: string, name?: string}>
  ) => {
    const response = await apiRequest('POST', '/api/simulation/advance', {
      numOfDays,
      toTimestamp,
      itemsToBeUsedPerDay: itemsToBeUsedPerDay || []
    });
    return response.json();
  }
};
