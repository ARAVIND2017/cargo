from pydantic import BaseModel
from typing import Optional

class Item(BaseModel):
    itemId: str
    name: str
    width: int
    depth: int
    height: int
    priority: int
    expiryDate: Optional[str]
    usageLimit: int
    preferredZone: str

class Container(BaseModel):
    containerId: str
    zone: str
    width: int
    depth: int
    height: int
