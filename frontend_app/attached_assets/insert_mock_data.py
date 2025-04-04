from db import db
from datetime import datetime

placements = db["placements"]
containers = db["containers"]
retrieval_logs = db["retrieval_logs"]

# Clear collections
placements.delete_many({})
containers.delete_many({})
retrieval_logs.delete_many({})

# Containers
containers.insert_many([
    {"containerId": "contA", "zone": "Crew Quarters", "width": 100, "depth": 85, "height": 200},
    {"containerId": "contB", "zone": "Airlock", "width": 50, "depth": 85, "height": 200},
    {"containerId": "contZ", "zone": "Undocking Module", "width": 100, "depth": 100, "height": 100}
])

# Items
placements.insert_many([
    {
        "itemId": "001",
        "name": "Food Packet",
        "containerId": "contA",
        "expiryDate": "2024-03-01",  # Expired
        "usageLimit": 5,
        "mass": 5,
        "position": {
            "startCoordinates": {"width": 0, "depth": 0, "height": 0},
            "endCoordinates": {"width": 10, "depth": 10, "height": 20}
        }
    },
    {
        "itemId": "002",
        "name": "Oxygen Cylinder",
        "containerId": "contB",
        "expiryDate": "2025-06-01",
        "usageLimit": 2,
        "mass": 15,
        "position": {
            "startCoordinates": {"width": 0, "depth": 0, "height": 0},
            "endCoordinates": {"width": 15, "depth": 15, "height": 50}
        }
    }
])

# Dummy retrieval log
retrieval_logs.insert_one({
    "itemId": "002",
    "retrievedBy": "Astronaut Alice",
    "fromContainer": "contB",
    "newContainer": "contA",
    "timestamp": datetime.utcnow()
})

print("✅ Mock data + retrieval log inserted successfully!")
