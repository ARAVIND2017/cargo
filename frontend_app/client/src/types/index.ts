// Type definitions for Space Station Storage Management System

// Container type
export interface Container {
  containerId: string;
  zone: string;
  width: number;
  depth: number;
  height: number;
}

// Coordinates type for item positioning
export interface Coordinates {
  width: number;
  depth: number;
  height: number;
}

// Item position within a container
export interface ItemPosition {
  startCoordinates: Coordinates;
  endCoordinates: Coordinates;
}

// Item type
export interface Item {
  itemId: string;
  name: string;
  containerId: string;
  expiryDate: string;
  usageLimit: number;
  mass: number;
  position?: ItemPosition;
  width?: number;
  depth?: number;
  height?: number;
}

// Retrieval log entry type
export interface RetrievalLog {
  id: string;
  itemId: string;
  retrievedBy: string;
  fromContainer: string;
  newContainer?: string;
  timestamp: string;
  type?: string;
  title?: string;
  description?: string;
  user?: string;
}

// Simulation status type
export interface SimulationStatus {
  isRunning: boolean;
  speed: number;
  elapsedHours: number;
  autoExpiry: boolean;
  expiredItems: number;
}

// Container CSV upload format
export interface ContainerCSV {
  containerId: string;
  zone: string;
  width: number;
  depth: number;
  height: number;
}

// Item CSV upload format
export interface ItemCSV {
  itemId: string;
  name: string;
  containerId: string;
  expiryDate: string;
  usageLimit: number;
  mass: number;
  width: number;
  depth: number;
  height: number;
}

// Waste return schedule type
export interface WasteReturnSchedule {
  itemIds: string[];
  schedule: string;
  notes?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  count: number;
  message: string;
}
