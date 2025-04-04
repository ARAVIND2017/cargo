"""
This script inserts sample data into the MongoDB database for development and testing.
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import random

def insert_sample_data():
    """
    Inserts sample data into the MongoDB database for testing purposes.
    """
    from backend.db import get_db
    
    # Get database
    db = get_db()
    
    # Clear existing data
    db.containers.delete_many({})
    db.items.delete_many({})
    db.retrieval_logs.delete_many({})
    db.waste_returns.delete_many({})
    db.simulation_settings.delete_many({})
    
    # Insert sample containers
    containers = [
        {
            "containerId": "contA",
            "zone": "Crew Quarters",
            "width": 100,
            "depth": 80,
            "height": 60
        },
        {
            "containerId": "contB",
            "zone": "Science Lab",
            "width": 120,
            "depth": 90,
            "height": 70
        },
        {
            "containerId": "contC",
            "zone": "Galley",
            "width": 80,
            "depth": 60,
            "height": 50
        },
        {
            "containerId": "contD",
            "zone": "Hygiene Compartment",
            "width": 70,
            "depth": 50,
            "height": 40
        },
        {
            "containerId": "contE",
            "zone": "Exercise Area",
            "width": 150,
            "depth": 100,
            "height": 80
        },
        {
            "containerId": "contZ",
            "zone": "Undocking Zone",
            "width": 200,
            "depth": 150,
            "height": 100
        }
    ]
    db.containers.insert_many(containers)
    
    # Insert sample items
    items = [
        {
            "itemId": "001",
            "name": "Food Packet",
            "containerId": "contA",
            "expiryDate": (datetime.now() + timedelta(days=30)).isoformat(),
            "usageLimit": 1,
            "mass": 0.5,
            "width": 20,
            "depth": 15,
            "height": 5,
            "preferredZone": "Galley",
            "priority": 2,
            "position": {
                "startCoordinates": {"width": 0, "depth": 0, "height": 0},
                "endCoordinates": {"width": 20, "depth": 15, "height": 5}
            }
        },
        {
            "itemId": "002",
            "name": "Experiment Kit",
            "containerId": "contB",
            "expiryDate": (datetime.now() + timedelta(days=90)).isoformat(),
            "usageLimit": 5,
            "mass": 1.2,
            "width": 30,
            "depth": 25,
            "height": 10,
            "preferredZone": "Science Lab",
            "priority": 3,
            "position": {
                "startCoordinates": {"width": 0, "depth": 0, "height": 0},
                "endCoordinates": {"width": 30, "depth": 25, "height": 10}
            }
        },
        {
            "itemId": "003",
            "name": "Medicine Container",
            "containerId": "contA",
            "expiryDate": (datetime.now() + timedelta(days=180)).isoformat(),
            "usageLimit": 20,
            "mass": 0.3,
            "width": 15,
            "depth": 10,
            "height": 5,
            "preferredZone": "Crew Quarters",
            "priority": 4,
            "position": {
                "startCoordinates": {"width": 25, "depth": 0, "height": 0},
                "endCoordinates": {"width": 40, "depth": 10, "height": 5}
            }
        },
        {
            "itemId": "004",
            "name": "Spare Parts",
            "containerId": "contC",
            "expiryDate": None,
            "usageLimit": 10,
            "mass": 2.5,
            "width": 40,
            "depth": 30,
            "height": 20,
            "preferredZone": "Maintenance",
            "priority": 2,
            "position": {
                "startCoordinates": {"width": 0, "depth": 0, "height": 0},
                "endCoordinates": {"width": 40, "depth": 30, "height": 20}
            }
        },
        {
            "itemId": "005",
            "name": "Hygiene Kit",
            "containerId": "contD",
            "expiryDate": (datetime.now() + timedelta(days=365)).isoformat(),
            "usageLimit": 30,
            "mass": 0.8,
            "width": 25,
            "depth": 20,
            "height": 10,
            "preferredZone": "Hygiene Compartment",
            "priority": 3,
            "position": {
                "startCoordinates": {"width": 0, "depth": 0, "height": 0},
                "endCoordinates": {"width": 25, "depth": 20, "height": 10}
            }
        },
        {
            "itemId": "006",
            "name": "Exercise Equipment",
            "containerId": "contE",
            "expiryDate": None,
            "usageLimit": 100,
            "mass": 5.0,
            "width": 60,
            "depth": 50,
            "height": 30,
            "preferredZone": "Exercise Area",
            "priority": 2,
            "position": {
                "startCoordinates": {"width": 0, "depth": 0, "height": 0},
                "endCoordinates": {"width": 60, "depth": 50, "height": 30}
            }
        }
    ]
    db.items.insert_many(items)
    
    # Insert sample retrieval logs
    logs = [
        {
            "itemId": "002",
            "retrievedBy": "astronaut1",
            "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
            "fromContainer": "contB",
            "newContainer": "contA",
            "type": "transfer",
            "title": "Moved experiment kit to crew quarters"
        },
        {
            "itemId": "001",
            "retrievedBy": "astronaut2",
            "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
            "fromContainer": "contA",
            "type": "usage",
            "title": "Used food packet"
        },
        {
            "itemId": "005",
            "retrievedBy": "astronaut3",
            "timestamp": (datetime.now() - timedelta(hours=12)).isoformat(),
            "fromContainer": "contD",
            "type": "usage",
            "title": "Used hygiene kit"
        },
        {
            "itemId": "002",
            "retrievedBy": "astronaut1",
            "timestamp": (datetime.now() - timedelta(hours=6)).isoformat(),
            "fromContainer": "contA",
            "newContainer": "contB",
            "type": "transfer",
            "title": "Returned experiment kit to science lab"
        },
        {
            "itemId": "006",
            "retrievedBy": "astronaut4",
            "timestamp": (datetime.now() - timedelta(hours=3)).isoformat(),
            "fromContainer": "contE",
            "type": "usage",
            "title": "Used exercise equipment"
        }
    ]
    db.retrieval_logs.insert_many(logs)
    
    # Insert sample waste returns
    waste_returns = [
        {
            "itemIds": ["001"],
            "schedule": (datetime.now() + timedelta(days=35)).isoformat(),
            "notes": "Food packet expiry return"
        }
    ]
    db.waste_returns.insert_many(waste_returns)
    
    # Insert simulation settings
    simulation_settings = {
        "isRunning": False,
        "speed": 1,
        "elapsedHours": 0,
        "autoExpiry": True,
        "expiredItems": 0,
        "currentDate": datetime.now().isoformat()
    }
    db.simulation_settings.insert_one(simulation_settings)
    
    return True

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Insert sample data
    insert_sample_data()
    print("Sample data inserted successfully")