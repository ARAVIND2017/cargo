from flask import Blueprint, request, jsonify, g
from bson.objectid import ObjectId
from datetime import datetime

# Create blueprint
bp = Blueprint('placement', __name__)

# Get all containers
@bp.route('/containers', methods=['GET'])
def get_containers():
    """Returns all containers"""
    try:
        containers = list(g.db.containers.find())
        return jsonify(containers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get a specific container by ID
@bp.route('/containers/<container_id>', methods=['GET'])
def get_container(container_id):
    """Returns a specific container by ID"""
    try:
        container = g.db.containers.find_one({"containerId": container_id})
        
        if not container:
            return jsonify({"error": f"Container with ID {container_id} not found"}), 404
        
        return jsonify(container)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all items in a specific container
@bp.route('/containers/<container_id>/items', methods=['GET'])
def get_container_items(container_id):
    """Returns all items in a specific container"""
    try:
        # Check if container exists
        container = g.db.containers.find_one({"containerId": container_id})
        
        if not container:
            return jsonify({"error": f"Container with ID {container_id} not found"}), 404
        
        # Get all items in the container
        items = list(g.db.items.find({"containerId": container_id}))
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all items
@bp.route('/items', methods=['GET'])
def get_items():
    """Returns all items"""
    try:
        items = list(g.db.items.find())
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get a specific item by ID
@bp.route('/items/<item_id>', methods=['GET'])
def get_item(item_id):
    """Returns a specific item by ID"""
    try:
        item = g.db.items.find_one({"itemId": item_id})
        
        if not item:
            return jsonify({"error": f"Item with ID {item_id} not found"}), 404
        
        return jsonify(item)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create a new container
@bp.route('/containers', methods=['POST'])
def create_container():
    """Creates a new container"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["containerId", "zone", "width", "depth", "height"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if container ID already exists
        existing = g.db.containers.find_one({"containerId": data["containerId"]})
        
        if existing:
            return jsonify({"error": f"Container with ID {data['containerId']} already exists"}), 409
        
        # Insert container
        result = g.db.containers.insert_one(data)
        
        # Return created container
        container = g.db.containers.find_one({"_id": result.inserted_id})
        return jsonify(container), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create a new item
@bp.route('/items', methods=['POST'])
def create_item():
    """Creates a new item"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemId", "name", "containerId", "width", "depth", "height"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if item ID already exists
        existing = g.db.items.find_one({"itemId": data["itemId"]})
        
        if existing:
            return jsonify({"error": f"Item with ID {data['itemId']} already exists"}), 409
        
        # Check if container exists
        container = g.db.containers.find_one({"containerId": data["containerId"]})
        
        if not container:
            return jsonify({"error": f"Container with ID {data['containerId']} not found"}), 404
        
        # Find a position for the item if not provided
        if "position" not in data or not data["position"]:
            position = find_placement_position(data, container)
            
            if position:
                data["position"] = position
        
        # Insert item
        result = g.db.items.insert_one(data)
        
        # Return created item
        item = g.db.items.find_one({"_id": result.inserted_id})
        return jsonify(item), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update an item's position
@bp.route('/items/<item_id>/position', methods=['PUT'])
def update_item_position(item_id):
    """Updates an item's position"""
    try:
        data = request.json
        
        # Validate position data
        if "position" not in data:
            return jsonify({"error": "Missing position data"}), 400
        
        # Check if item exists
        item = g.db.items.find_one({"itemId": item_id})
        
        if not item:
            return jsonify({"error": f"Item with ID {item_id} not found"}), 404
        
        # Update item position
        result = g.db.items.update_one(
            {"itemId": item_id},
            {"$set": {"position": data["position"]}}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "No changes made to item position"}), 400
        
        # Return updated item
        updated_item = g.db.items.find_one({"itemId": item_id})
        return jsonify(updated_item)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get placement recommendations for items
@bp.route('/recommend', methods=['POST'])
def recommend_placement():
    """
    Recommends optimal placement positions for items
    Uses 3D bin packing algorithm with priority considerations
    """
    try:
        data = request.json
        
        # Validate required fields
        if "items" not in data or not isinstance(data["items"], list):
            return jsonify({"error": "Missing or invalid items list"}), 400
        
        if "containerId" not in data:
            return jsonify({"error": "Missing container ID"}), 400
        
        # Check if container exists
        container = g.db.containers.find_one({"containerId": data["containerId"]})
        
        if not container:
            return jsonify({"error": f"Container with ID {data['containerId']} not found"}), 404
        
        # Get existing items in the container
        existing_items = list(g.db.items.find({"containerId": data["containerId"]}))
        
        # Process placement recommendations
        recommendations = process_placement_recommendations(data["items"], container, existing_items)
        
        return jsonify({
            "containerId": data["containerId"],
            "recommendations": recommendations
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper function to find a placement position
def find_placement_position(item, container):
    """
    Finds a position for an item in a container using a first-fit algorithm
    Returns position object if found, None otherwise
    
    Time Complexity: O(n) where n is the number of existing items
    Space Complexity: O(1) for calculating position
    """
    # Get existing items in the container
    existing_items = list(g.db.items.find({
        "containerId": container["containerId"],
        "position": {"$exists": True}
    }))
    
    # Get container dimensions
    container_width = container["width"]
    container_depth = container["depth"]
    container_height = container["height"]
    
    # Get item dimensions
    item_width = item["width"]
    item_depth = item["depth"]
    item_height = item["height"]
    
    # Check if item fits in container
    if item_width > container_width or item_depth > container_depth or item_height > container_height:
        return None
    
    # Get all occupied spaces
    occupied_spaces = []
    
    for existing_item in existing_items:
        if "position" in existing_item and existing_item["position"]:
            position = existing_item["position"]
            start = position["startCoordinates"]
            end = position["endCoordinates"]
            
            occupied_spaces.append({
                "start": start,
                "end": end
            })
    
    # Try to find a position starting from the bottom of the container
    for height in range(0, container_height - item_height + 1, 5):  # Step of 5 for optimization
        for depth in range(0, container_depth - item_depth + 1, 5):  # Step of 5 for optimization
            for width in range(0, container_width - item_width + 1, 5):  # Step of 5 for optimization
                # Create potential position
                position = {
                    "startCoordinates": {
                        "width": width,
                        "depth": depth,
                        "height": height
                    },
                    "endCoordinates": {
                        "width": width + item_width,
                        "depth": depth + item_depth,
                        "height": height + item_height
                    }
                }
                
                # Check if position collides with any occupied spaces
                if not check_collision(position, occupied_spaces):
                    return position
    
    # If no position found, try again with smaller steps
    for height in range(0, container_height - item_height + 1):
        for depth in range(0, container_depth - item_depth + 1):
            for width in range(0, container_width - item_width + 1):
                # Create potential position
                position = {
                    "startCoordinates": {
                        "width": width,
                        "depth": depth,
                        "height": height
                    },
                    "endCoordinates": {
                        "width": width + item_width,
                        "depth": depth + item_depth,
                        "height": height + item_height
                    }
                }
                
                # Check if position collides with any occupied spaces
                if not check_collision(position, occupied_spaces):
                    return position
    
    # If no position found, return None
    return None

# Helper function to check for collisions
def check_collision(position, occupied_spaces):
    """
    Checks if a position collides with any occupied spaces
    Returns True if collision detected, False otherwise
    
    Time Complexity: O(n) where n is the number of occupied spaces
    Space Complexity: O(1) for collision check
    """
    start = position["startCoordinates"]
    end = position["endCoordinates"]
    
    for space in occupied_spaces:
        space_start = space["start"]
        space_end = space["end"]
        
        # Check if positions overlap in all dimensions
        if (end["width"] > space_start["width"] and start["width"] < space_end["width"] and
            end["depth"] > space_start["depth"] and start["depth"] < space_end["depth"] and
            end["height"] > space_start["height"] and start["height"] < space_end["height"]):
            return True
    
    return False

# Helper function to process placement recommendations
def process_placement_recommendations(items, container, existing_items):
    """
    Processes placement recommendations using 3D bin packing algorithm
    
    Time Complexity: O(n log n) for sorting + O(n * m) for placement
    Space Complexity: O(n) for storing recommendations
    
    Args:
        items: List of items to place
        container: Container object
        existing_items: Existing items in the container
    
    Returns:
        List of placement recommendations
    """
    # Sort items by priority (higher priority first)
    sorted_items = sorted(items, key=get_item_priority, reverse=True)
    
    # Get all occupied spaces
    occupied_spaces = []
    
    for existing_item in existing_items:
        if "position" in existing_item and existing_item["position"]:
            position = existing_item["position"]
            start = position["startCoordinates"]
            end = position["endCoordinates"]
            
            occupied_spaces.append({
                "start": start,
                "end": end
            })
    
    # Process each item
    recommendations = []
    
    for item in sorted_items:
        # Create a copy of occupied spaces for each item
        current_occupied_spaces = occupied_spaces.copy()
        
        # Get container dimensions
        container_width = container["width"]
        container_depth = container["depth"]
        container_height = container["height"]
        
        # Get item dimensions
        item_width = item.get("width", 0)
        item_depth = item.get("depth", 0)
        item_height = item.get("height", 0)
        
        if item_width <= 0 or item_depth <= 0 or item_height <= 0:
            recommendations.append({
                "itemId": item.get("itemId", "unknown"),
                "success": False,
                "message": "Invalid item dimensions"
            })
            continue
        
        # Check if item fits in container
        if item_width > container_width or item_depth > container_depth or item_height > container_height:
            recommendations.append({
                "itemId": item.get("itemId", "unknown"),
                "success": False,
                "message": "Item too large for container"
            })
            continue
        
        # Try to find a position using different strategies
        position = None
        
        # Strategy 1: Bottom-up with lowest height first
        for depth in range(0, container_depth - item_depth + 1, 5):
            for width in range(0, container_width - item_width + 1, 5):
                for height in range(0, container_height - item_height + 1, 5):
                    # Create potential position
                    potential_position = {
                        "startCoordinates": {
                            "width": width,
                            "depth": depth,
                            "height": height
                        },
                        "endCoordinates": {
                            "width": width + item_width,
                            "depth": depth + item_depth,
                            "height": height + item_height
                        }
                    }
                    
                    # Check if position collides with any occupied spaces
                    if not check_collision(potential_position, current_occupied_spaces):
                        position = potential_position
                        break
                
                if position:
                    break
            
            if position:
                break
        
        # If no position found, try again with smaller steps (more precise but slower)
        if not position:
            for depth in range(0, container_depth - item_depth + 1):
                for width in range(0, container_width - item_width + 1):
                    for height in range(0, container_height - item_height + 1):
                        # Create potential position
                        potential_position = {
                            "startCoordinates": {
                                "width": width,
                                "depth": depth,
                                "height": height
                            },
                            "endCoordinates": {
                                "width": width + item_width,
                                "depth": depth + item_depth,
                                "height": height + item_height
                            }
                        }
                        
                        # Check if position collides with any occupied spaces
                        if not check_collision(potential_position, current_occupied_spaces):
                            position = potential_position
                            break
                    
                    if position:
                        break
                
                if position:
                    break
        
        # Add recommendation
        if position:
            recommendations.append({
                "itemId": item.get("itemId", "unknown"),
                "success": True,
                "position": position
            })
            
            # Add position to occupied spaces for next items
            occupied_spaces.append({
                "start": position["startCoordinates"],
                "end": position["endCoordinates"]
            })
        else:
            recommendations.append({
                "itemId": item.get("itemId", "unknown"),
                "success": False,
                "message": "No suitable position found"
            })
    
    return recommendations

# Helper function to get item priority
def get_item_priority(item):
    """Helper function to determine item priority for placement"""
    # Default priority is 1 if not specified
    priority = item.get("priority", 1)
    
    # Additional priority factors
    # Expiring items get higher priority
    if "expiryDate" in item and item["expiryDate"]:
        try:
            expiry_date = datetime.fromisoformat(item["expiryDate"].replace("Z", "+00:00"))
            days_until_expiry = (expiry_date - datetime.now()).days
            
            if days_until_expiry < 30:  # Less than a month until expiry
                priority += 2
            elif days_until_expiry < 90:  # Less than three months until expiry
                priority += 1
        except:
            pass
    
    # Heavier items get higher priority (placed at the bottom)
    if "mass" in item and item["mass"]:
        mass = float(item["mass"])
        if mass > 3.0:
            priority += 2
        elif mass > 1.0:
            priority += 1
    
    return priority