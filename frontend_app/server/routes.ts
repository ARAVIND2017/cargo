import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Mock data storage
let containers = [
  { containerId: "contA", zone: "Crew Quarters", width: 100, depth: 85, height: 200 },
  { containerId: "contB", zone: "Airlock", width: 50, depth: 85, height: 200 },
  { containerId: "contZ", zone: "Undocking Module", width: 100, depth: 100, height: 100 }
];

let items = [
  {
    itemId: "001",
    name: "Food Packet",
    containerId: "contA",
    expiryDate: "2024-03-01",
    usageLimit: 5,
    mass: 5,
    position: {
      startCoordinates: { width: 0, depth: 0, height: 0 },
      endCoordinates: { width: 10, depth: 10, height: 20 }
    }
  },
  {
    itemId: "002",
    name: "Oxygen Cylinder",
    containerId: "contB",
    expiryDate: "2025-06-01",
    usageLimit: 2,
    mass: 15,
    position: {
      startCoordinates: { width: 0, depth: 0, height: 0 },
      endCoordinates: { width: 15, depth: 15, height: 50 }
    }
  }
];

let retrievalLogs = [
  {
    id: "1",
    itemId: "002",
    retrievedBy: "Astronaut Alice",
    fromContainer: "contB",
    newContainer: "contA",
    timestamp: new Date().toISOString(),
    type: "transfer",
    title: "Item Transferred",
    description: "Oxygen Cylinder moved from CONT-B to CONT-A",
    user: "Astronaut Alice"
  }
];

let wasteReturns = [];

// Simulation state
let simulationState = {
  isRunning: false,
  speed: 10,
  elapsedHours: 0,
  autoExpiry: true,
  expiredItems: 0
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Placement routes (containers and items)
  app.get("/api/placements/containers", (req, res) => {
    res.json(containers);
  });

  app.get("/api/placements/containers/:containerId", (req, res) => {
    const { containerId } = req.params;
    const container = containers.find(c => c.containerId === containerId);
    
    if (!container) {
      return res.status(404).json({ message: "Container not found" });
    }
    
    res.json(container);
  });

  app.post("/api/placements/containers", (req, res) => {
    const newContainer = req.body;
    
    // Validate required fields
    if (!newContainer.containerId || !newContainer.zone || 
        !newContainer.width || !newContainer.depth || !newContainer.height) {
      return res.status(400).json({ message: "Missing required container fields" });
    }
    
    // Check for duplicate containerId
    if (containers.some(c => c.containerId === newContainer.containerId)) {
      return res.status(400).json({ message: "Container ID already exists" });
    }
    
    containers.push(newContainer);
    res.status(201).json(newContainer);
  });

  app.delete("/api/placements/containers/:containerId", (req, res) => {
    const { containerId } = req.params;
    const containerIndex = containers.findIndex(c => c.containerId === containerId);
    
    if (containerIndex === -1) {
      return res.status(404).json({ message: "Container not found" });
    }
    
    // Check if container has items
    if (items.some(item => item.containerId === containerId)) {
      return res.status(400).json({ message: "Cannot delete container with items" });
    }
    
    containers.splice(containerIndex, 1);
    res.status(200).json({ message: "Container deleted successfully" });
  });

  app.get("/api/placements/containers/:containerId/items", (req, res) => {
    const { containerId } = req.params;
    const containerItems = items.filter(item => item.containerId === containerId);
    res.json(containerItems);
  });

  app.get("/api/placements/items", (req, res) => {
    res.json(items);
  });

  app.get("/api/placements/items/:itemId", (req, res) => {
    const { itemId } = req.params;
    const item = items.find(i => i.itemId === itemId);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  });

  app.post("/api/placements/items", (req, res) => {
    const newItem = req.body;
    
    // Validate required fields
    if (!newItem.itemId || !newItem.name || !newItem.containerId || !newItem.expiryDate) {
      return res.status(400).json({ message: "Missing required item fields" });
    }
    
    // Check for duplicate itemId
    if (items.some(i => i.itemId === newItem.itemId)) {
      return res.status(400).json({ message: "Item ID already exists" });
    }
    
    // Check if container exists
    if (!containers.some(c => c.containerId === newItem.containerId)) {
      return res.status(400).json({ message: "Container does not exist" });
    }
    
    // Add default position if not provided
    if (!newItem.position) {
      newItem.position = {
        startCoordinates: { width: 0, depth: 0, height: 0 },
        endCoordinates: { 
          width: newItem.width || 10, 
          depth: newItem.depth || 10, 
          height: newItem.height || 10
        }
      };
    }
    
    items.push(newItem);
    res.status(201).json(newItem);
  });

  app.delete("/api/placements/items/:itemId", (req, res) => {
    const { itemId } = req.params;
    const itemIndex = items.findIndex(i => i.itemId === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    items.splice(itemIndex, 1);
    res.status(200).json({ message: "Item deleted successfully" });
  });

  // File upload routes
  app.post("/api/placements/upload-containers", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const results: any[] = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        // Process the CSV data
        const newContainers = results.map(row => ({
          containerId: row.containerId,
          zone: row.zone,
          width: parseInt(row.width),
          depth: parseInt(row.depth),
          height: parseInt(row.height)
        }));
        
        // Validate data
        const validContainers = newContainers.filter(container => 
          container.containerId && container.zone && 
          !isNaN(container.width) && !isNaN(container.depth) && !isNaN(container.height)
        );
        
        // Add to containers
        validContainers.forEach(container => {
          // Remove existing container with same ID if exists
          const existingIndex = containers.findIndex(c => c.containerId === container.containerId);
          if (existingIndex !== -1) {
            containers.splice(existingIndex, 1);
          }
          containers.push(container);
        });
        
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
          success: true, 
          count: validContainers.length, 
          message: `Imported ${validContainers.length} containers` 
        });
      });
  });

  app.post("/api/placements/upload-items", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const results: any[] = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        // Process the CSV data
        const newItems = results.map(row => ({
          itemId: row.itemId,
          name: row.name,
          containerId: row.containerId,
          expiryDate: row.expiryDate,
          usageLimit: parseInt(row.usageLimit),
          mass: parseFloat(row.mass),
          width: parseInt(row.width) || 10,
          depth: parseInt(row.depth) || 10,
          height: parseInt(row.height) || 10,
          position: {
            startCoordinates: { width: 0, depth: 0, height: 0 },
            endCoordinates: { 
              width: parseInt(row.width) || 10, 
              depth: parseInt(row.depth) || 10, 
              height: parseInt(row.height) || 10
            }
          }
        }));
        
        // Validate data
        const validItems = newItems.filter(item => 
          item.itemId && item.name && item.containerId && item.expiryDate && 
          !isNaN(item.usageLimit) && !isNaN(item.mass)
        );
        
        // Add to items
        validItems.forEach(item => {
          // Remove existing item with same ID if exists
          const existingIndex = items.findIndex(i => i.itemId === item.itemId);
          if (existingIndex !== -1) {
            items.splice(existingIndex, 1);
          }
          items.push(item);
        });
        
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
          success: true, 
          count: validItems.length, 
          message: `Imported ${validItems.length} items` 
        });
      });
  });

  // Retrieval routes
  app.get("/api/retrievals/logs", (req, res) => {
    res.json(retrievalLogs);
  });

  app.post("/api/retrieval/items/:itemId/retrieve", (req, res) => {
    const { itemId } = req.params;
    const { retrievedBy } = req.body;
    
    const item = items.find(i => i.itemId === itemId);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Create retrieval log
    const retrievalLog = {
      id: Date.now().toString(),
      itemId,
      retrievedBy,
      fromContainer: item.containerId,
      timestamp: new Date().toISOString(),
      type: "retrieval",
      title: "Item Retrieved",
      description: `${item.name} retrieved from ${item.containerId}`,
      user: retrievedBy
    };
    
    retrievalLogs.push(retrievalLog);
    
    // Decrement usage limit
    item.usageLimit--;
    
    res.json({ message: "Item retrieved successfully", log: retrievalLog });
  });

  app.post("/api/retrieval/move", (req, res) => {
    const { itemId, destinationContainerId } = req.body;
    
    const item = items.find(i => i.itemId === itemId);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Check if destination container exists
    if (!containers.some(c => c.containerId === destinationContainerId)) {
      return res.status(400).json({ message: "Destination container does not exist" });
    }
    
    const sourceContainerId = item.containerId;
    
    // Update item's container
    item.containerId = destinationContainerId;
    
    // Create movement log
    const movementLog = {
      id: Date.now().toString(),
      itemId,
      retrievedBy: "System User",
      fromContainer: sourceContainerId,
      newContainer: destinationContainerId,
      timestamp: new Date().toISOString(),
      type: "transfer",
      title: "Item Transferred",
      description: `${item.name} moved from ${sourceContainerId} to ${destinationContainerId}`,
      user: "System User"
    };
    
    retrievalLogs.push(movementLog);
    
    res.json({ message: "Item moved successfully", log: movementLog });
  });

  // Waste management routes
  app.get("/api/waste/check-expiry", (req, res) => {
    const now = new Date();
    const expiredItems = items.filter(item => new Date(item.expiryDate) < now).length;
    
    res.json({ expiredItems });
  });

  app.post("/api/waste/schedule-return", (req, res) => {
    const { itemIds, schedule } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0 || !schedule) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    
    // Validate itemIds
    const validItemIds = itemIds.filter(id => items.some(item => item.itemId === id));
    
    if (validItemIds.length === 0) {
      return res.status(400).json({ message: "No valid items selected" });
    }
    
    // Create waste return entry
    const wasteReturn = {
      id: Date.now().toString(),
      itemIds: validItemIds,
      schedule,
      createdAt: new Date().toISOString()
    };
    
    wasteReturns.push(wasteReturn);
    
    // Create log entry
    const wasteLog = {
      id: Date.now().toString(),
      itemId: validItemIds.join(','),
      retrievedBy: "Waste Management System",
      fromContainer: "Various",
      timestamp: new Date().toISOString(),
      type: "waste",
      title: "Waste Scheduled",
      description: `${validItemIds.length} items scheduled for waste return on ${schedule}`,
      user: "Waste Management System"
    };
    
    retrievalLogs.push(wasteLog);
    
    res.json({ message: "Waste return scheduled successfully", wasteReturn });
  });

  app.get("/api/waste/scheduled-returns", (req, res) => {
    res.json(wasteReturns);
  });

  // Simulation routes
  app.get("/api/simulation/status", (req, res) => {
    res.json(simulationState);
  });

  app.post("/api/simulation/start", (req, res) => {
    const { speed, autoExpiry } = req.body;
    
    simulationState.isRunning = true;
    simulationState.speed = speed || 10;
    simulationState.autoExpiry = autoExpiry !== undefined ? autoExpiry : true;
    
    res.json({ message: "Simulation started", simulationState });
  });

  app.post("/api/simulation/pause", (req, res) => {
    simulationState.isRunning = false;
    
    res.json({ message: "Simulation paused", simulationState });
  });

  app.post("/api/simulation/advance-time", (req, res) => {
    const { hours } = req.body;
    
    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ message: "Invalid hours value" });
    }
    
    // Advance simulation time
    simulationState.elapsedHours += hours;
    
    // Process expirations if auto-expiry is enabled
    if (simulationState.autoExpiry) {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setHours(futureDate.getHours() + hours);
      
      // Check for newly expired items
      let expiredCount = 0;
      items.forEach(item => {
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate > now && expiryDate <= futureDate) {
          expiredCount++;
          
          // Log expiry
          retrievalLogs.push({
            id: Date.now().toString() + expiredCount,
            itemId: item.itemId,
            retrievedBy: "System",
            fromContainer: item.containerId,
            timestamp: expiryDate.toISOString(),
            type: "expiry",
            title: "Expiry Alert",
            description: `${item.name} has expired`,
            user: "System"
          });
        }
      });
      
      simulationState.expiredItems += expiredCount;
    }
    
    res.json({ 
      message: "Simulation time advanced", 
      hours, 
      elapsedHours: simulationState.elapsedHours 
    });
  });

  app.post("/api/simulation/reset", (req, res) => {
    // Reset simulation state
    simulationState = {
      isRunning: false,
      speed: 10,
      elapsedHours: 0,
      autoExpiry: true,
      expiredItems: 0
    };
    
    res.json({ message: "Simulation reset", simulationState });
  });

  const httpServer = createServer(app);

  return httpServer;
}
