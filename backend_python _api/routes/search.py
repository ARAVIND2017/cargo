from flask import Blueprint, request, jsonify, g
from bson.objectid import ObjectId
from datetime import datetime

# Create blueprint
bp = Blueprint('search', __name__)

# Search for an item by ID or name
@bp.route('', methods=['GET'])
def search_item():
    """
    Searches for an item by ID or name
    Returns item details and retrieval steps
    """
    try:
        # Get query parameters
        query = request.args.get('query')
        
        if not query:
            return jsonify({"error": "Missing query parameter"}), 400
        
        # Search by ID or name
        item = g.db.items.find_one({"itemId": query})
        
        if not item:
            # Try search by name (case-insensitive)
            items = list(g.db.items.find({"name": {"$regex": query, "$options": "i"}}))
            
            if not items:
                return jsonify({"error": f"No items found matching '{query}'"}), 404
            
            # If multiple items found, return them all
            if len(items) > 1:
                return jsonify({
                    "items": items,
                    "message": f"Found {len(items)} items matching '{query}'"
                })
            
            # If only one item found, continue with it
            item = items[0]
        
        # Get container details
        container = g.db.containers.find_one({"containerId": item["containerId"]})
        
        if not container:
            return jsonify({"error": "Container not found for item"}), 404
        
        # Generate retrieval steps
        retrieval_steps = generate_retrieval_steps(item, container)
        
        # Return item details and retrieval steps
        return jsonify({
            "item": item,
            "container": container,
            "retrievalSteps": retrieval_steps
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Record item retrieval
@bp.route('/retrieve', methods=['POST'])
def retrieve_item():
    """
    Records item retrieval
    Updates item usage count and creates retrieval log
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemId", "retrievedBy", "fromContainer"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Get item details
        item = g.db.items.find_one({"itemId": data["itemId"]})
        
        if not item:
            return jsonify({"error": f"Item with ID {data['itemId']} not found"}), 404
        
        # Check if container matches
        if item["containerId"] != data["fromContainer"]:
            return jsonify({"error": f"Item {data['itemId']} is not in container {data['fromContainer']}"}), 400
        
        # Create log entry
        log_entry = {
            "itemId": data["itemId"],
            "retrievedBy": data["retrievedBy"],
            "timestamp": datetime.now().isoformat(),
            "fromContainer": data["fromContainer"],
            "type": data.get("type", "retrieval"),
            "title": data.get("title", f"Retrieved {item.get('name', 'item')}"),
            "description": data.get("description", "")
        }
        
        # If new container is provided, add it to the log entry
        if "newContainer" in data:
            log_entry["newContainer"] = data["newContainer"]
        
        # Insert log entry
        g.db.retrieval_logs.insert_one(log_entry)
        
        # Update item usage count if applicable
        if "usageLimit" in item and item["usageLimit"] is not None:
            current_usage = item.get("usageCount", 0)
            new_usage = current_usage + 1
            
            # Update item usage count
            g.db.items.update_one(
                {"itemId": data["itemId"]},
                {"$set": {"usageCount": new_usage}}
            )
            
            # Check if item has reached usage limit
            if new_usage >= item["usageLimit"]:
                log_entry = {
                    "itemId": data["itemId"],
                    "retrievedBy": data["retrievedBy"],
                    "timestamp": datetime.now().isoformat(),
                    "fromContainer": data["fromContainer"],
                    "type": "depleted",
                    "title": f"{item.get('name', 'Item')} has reached usage limit",
                    "description": "Item should be considered for waste return"
                }
                
                # Insert log entry for depletion
                g.db.retrieval_logs.insert_one(log_entry)
        
        # Update item container if new container is provided
        if "newContainer" in data:
            # Check if new container exists
            container = g.db.containers.find_one({"containerId": data["newContainer"]})
            
            if not container:
                return jsonify({"error": f"Container with ID {data['newContainer']} not found"}), 404
            
            # Update item container
            g.db.items.update_one(
                {"itemId": data["itemId"]},
                {"$set": {"containerId": data["newContainer"]}}
            )
        
        return jsonify({
            "success": True,
            "message": "Item retrieval recorded successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Record item placement
@bp.route('/place', methods=['POST'])
def place_item():
    """
    Records item placement
    Updates item container and position
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemId", "containerId", "position"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Get item details
        item = g.db.items.find_one({"itemId": data["itemId"]})
        
        if not item:
            return jsonify({"error": f"Item with ID {data['itemId']} not found"}), 404
        
        # Check if container exists
        container = g.db.containers.find_one({"containerId": data["containerId"]})
        
        if not container:
            return jsonify({"error": f"Container with ID {data['containerId']} not found"}), 404
        
        # Update item container and position
        result = g.db.items.update_one(
            {"itemId": data["itemId"]},
            {"$set": {
                "containerId": data["containerId"],
                "position": data["position"]
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "No changes made to item"}), 400
        
        # Create log entry for item placement
        log_entry = {
            "itemId": data["itemId"],
            "retrievedBy": data.get("placedBy", "system"),
            "timestamp": datetime.now().isoformat(),
            "fromContainer": item["containerId"],
            "newContainer": data["containerId"],
            "type": "placement",
            "title": f"Placed {item.get('name', 'item')} in {data['containerId']}"
        }
        
        # Insert log entry
        g.db.retrieval_logs.insert_one(log_entry)
        
        return jsonify({
            "success": True,
            "message": "Item placement recorded successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper function to prioritize items
def prioritize_items(items):
    """
    Prioritizes items based on:
    1. Expiry date (closer to expiry first)
    2. Ease of retrieval (fewer obstructions)
    
    Time Complexity: O(n log n) where n is the number of items
    Space Complexity: O(n) for storing prioritized items
    """
    # Add position score to each item
    for item in items:
        item["position_score"] = calculate_position_score(item)
    
    # Sort items by expiry date (items without expiry last)
    items_with_expiry = [item for item in items if "expiryDate" in item and item["expiryDate"]]
    items_without_expiry = [item for item in items if "expiryDate" not in item or not item["expiryDate"]]
    
    # Sort items with expiry by date
    items_with_expiry.sort(key=lambda x: x["expiryDate"])
    
    # Sort items without expiry by position score
    items_without_expiry.sort(key=lambda x: x["position_score"], reverse=True)
    
    # Combine sorted lists
    return items_with_expiry + items_without_expiry

# Helper function to calculate position score
def calculate_position_score(item):
    """
    Calculates a position score for an item based on how easy it is to retrieve
    Higher score means easier to retrieve
    
    Time Complexity: O(1) for position calculation
    Space Complexity: O(1)
    """
    # Default score
    score = 50
    
    # If no position, return default score
    if "position" not in item or not item["position"]:
        return score
    
    position = item["position"]
    
    # Score based on height (lower is better)
    if "startCoordinates" in position and "height" in position["startCoordinates"]:
        # Assuming maximum height of 100
        height_score = 100 - min(position["startCoordinates"]["height"], 100)
        score += height_score * 0.5  # Weight for height
    
    # Score based on distance from front (smaller depth is better)
    if "startCoordinates" in position and "depth" in position["startCoordinates"]:
        # Assuming maximum depth of 100
        depth_score = 100 - min(position["startCoordinates"]["depth"], 100)
        score += depth_score * 0.3  # Weight for depth
    
    # Score based on distance from side (smaller width is better)
    if "startCoordinates" in position and "width" in position["startCoordinates"]:
        # Assuming maximum width of 100
        width_score = 100 - min(position["startCoordinates"]["width"], 100)
        score += width_score * 0.2  # Weight for width
    
    return score

# Helper function to calculate obstruction penalty
def calculate_obstruction_penalty(item, container):
    """
    Calculates penalty for items that are obstructed by other items
    
    Time Complexity: O(n) where n is the number of items in the container
    Space Complexity: O(1)
    """
    # Default penalty
    penalty = 0
    
    # If no position, return default penalty
    if "position" not in item or not item["position"]:
        return penalty
    
    # Get item position
    item_position = item["position"]
    
    # Get all items in the container
    container_items = list(g.db.items.find({
        "containerId": container["containerId"],
        "position": {"$exists": True},
        "itemId": {"$ne": item["itemId"]}  # Exclude the current item
    }))
    
    # Count number of blocking items
    blocking_items = 0
    
    for other_item in container_items:
        if "position" in other_item and other_item["position"]:
            if is_blocking_access(other_item["position"], item_position):
                blocking_items += 1
    
    # Calculate penalty based on number of blocking items
    penalty = blocking_items * 10  # Each blocking item adds 10 to the penalty
    
    return penalty

# Helper function to generate retrieval steps
def generate_retrieval_steps(item, container):
    """
    Generates step-by-step instructions for retrieving an item
    Takes into account any other items that might need to be moved
    
    Time Complexity: O(n) where n is the number of items in the container
    Space Complexity: O(n) for storing steps
    """
    steps = []
    
    # Add step to locate the container
    steps.append({
        "step": 1,
        "instruction": f"Locate container {container['containerId']} in the {container['zone']} zone"
    })
    
    # If item has no position, just add step to retrieve item
    if "position" not in item or not item["position"]:
        steps.append({
            "step": 2,
            "instruction": f"Retrieve item {item['itemId']} ({item.get('name', 'Unknown')}) from the container"
        })
        return steps
    
    # Get item position
    item_position = item["position"]
    
    # Add step to locate the item within the container
    start_coords = item_position["startCoordinates"]
    steps.append({
        "step": 2,
        "instruction": f"Locate item at position ({start_coords['width']}, {start_coords['depth']}, {start_coords['height']}) within the container"
    })
    
    # Get all items in the container
    container_items = list(g.db.items.find({
        "containerId": container["containerId"],
        "position": {"$exists": True},
        "itemId": {"$ne": item["itemId"]}  # Exclude the current item
    }))
    
    # Find blocking items
    blocking_items = []
    
    for other_item in container_items:
        if "position" in other_item and other_item["position"]:
            if is_blocking_access(other_item["position"], item_position):
                blocking_items.append(other_item)
    
    # Add steps to move blocking items if any
    if blocking_items:
        steps.append({
            "step": 3,
            "instruction": f"Temporarily move {len(blocking_items)} items that are blocking access",
            "itemsToMove": [item["itemId"] for item in blocking_items]
        })
        
        step_num = 4
    else:
        step_num = 3
    
    # Add step to retrieve the item
    steps.append({
        "step": step_num,
        "instruction": f"Retrieve item {item['itemId']} ({item.get('name', 'Unknown')})"
    })
    
    # Add step to replace blocking items if any
    if blocking_items:
        steps.append({
            "step": step_num + 1,
            "instruction": "Replace the items that were moved",
            "itemsToMove": [item["itemId"] for item in blocking_items]
        })
    
    return steps

# Helper function to check if one item is blocking access to another
def is_blocking_access(blocker_position, target_position):
    """
    Determines if one item is blocking access to another
    
    Time Complexity: O(1) for position comparison
    Space Complexity: O(1)
    """
    # Get coordinates
    blocker_start = blocker_position["startCoordinates"]
    blocker_end = blocker_position["endCoordinates"]
    target_start = target_position["startCoordinates"]
    target_end = target_position["endCoordinates"]
    
    # Check if blocker is in front of target (smaller depth)
    if blocker_end["depth"] <= target_start["depth"]:
        return False
    
    # Check if blocker overlaps with target in width
    width_overlap = (blocker_end["width"] > target_start["width"] and
                   blocker_start["width"] < target_end["width"])
    
    # Check if blocker overlaps with target in height
    height_overlap = (blocker_end["height"] > target_start["height"] and
                    blocker_start["height"] < target_end["height"])
    
    # If blocker overlaps in both width and height, it's blocking access
    return width_overlap and height_overlap