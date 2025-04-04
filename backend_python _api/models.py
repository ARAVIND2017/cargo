from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class Coordinates(BaseModel):
    width: int
    depth: int
    height: int

class Position(BaseModel):
    startCoordinates: Coordinates
    endCoordinates: Coordinates

class Item(BaseModel):
    itemId: str
    name: str
    containerId: str
    width: int
    depth: int
    height: int
    expiryDate: Optional[str] = None
    usageLimit: Optional[int] = None
    mass: Optional[float] = None
    preferredZone: Optional[str] = None
    priority: Optional[int] = 1
    position: Optional[Position] = None

class Container(BaseModel):
    containerId: str
    zone: str
    width: int
    depth: int
    height: int

class RetrievalLog(BaseModel):
    itemId: str
    retrievedBy: str
    timestamp: str
    fromContainer: str
    newContainer: Optional[str] = None
    type: str
    title: str
    description: Optional[str] = None

class WasteReturn(BaseModel):
    itemIds: List[str]
    schedule: str
    notes: Optional[str] = None

class SimulationSettings(BaseModel):
    isRunning: bool = False
    speed: int = 1
    elapsedHours: int = 0
    autoExpiry: bool = True
    expiredItems: int = 0
    currentDate: str

class RetrievalStep(BaseModel):
    step: int
    instruction: str
    itemsToMove: Optional[List[str]] = None

class RetrievalPlan(BaseModel):
    targetItem: str
    container: str
    steps: List[RetrievalStep]

class WasteReturnPlan(BaseModel):
    containerSummary: Dict[str, int]
    totalItems: int
    totalMass: float
    schedule: str
    itemsById: Dict[str, Any]