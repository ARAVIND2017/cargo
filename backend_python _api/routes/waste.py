from flask import Blueprint, request, jsonify, g
from bson.objectid import ObjectId
from datetime import datetime, timedelta

# Create blueprint
bp = Blueprint('waste', __name__)

# Identify waste items
@bp.route('/identify', methods=['GET'])
def identify_waste():
    """
    Identifies waste items (expired or depleted)
    
    Time Complexity: O(n) where n is the number of items
    Space Complexity: O(m) where m is the number of waste items
    """
    try:
        # Get current date
        current_date = datetime.now()
        
        # Check for simulation date override
        simulation_settings = g.db.simulation_settings.find_one()
        if simulation_settings and "currentDate" in simulation_settings:
            try:
                current_date = datetime.fromisoformat(simulation_settings["currentDate"].replace("Z", "+00:00"))
            except:
                pass
        
        # Query items with expiry dates
        expired_items = list(g.db.items.find({
            "expiryDate": {"$ne": None}
        }))
        
        # Filter expired items
        waste_items = []
        
        for item in expired_items:
            if "expiryDate" not in item or not item["expiryDate"]:
                continue
                
            try:
                expiry_date = datetime.fromisoformat(item["expiryDate"].replace("Z", "+00:00"))
                
                # Check if expired
                if expiry_date <= current_date:
                    item["expiry_status"] = "expired"
                    waste_items.append(item)
                # Check if expiring soon (within 30 days)
                elif (expiry_date - current_date).days <= 30:
                    item["expiry_status"] = "expiring_soon"
                    waste_items.append(item)
            except:
                # Skip items with invalid dates
                pass
        
        # Query items nearing usage limit
        depleted_items = list(g.db.items.find({
            "usageLimit": {"$ne": None},
            "usageCount": {"$ne": None}
        }))
        
        # Filter depleted items
        for item in depleted_items:
            if "usageLimit" not in item or "usageCount" not in item:
                continue
                
            usage_limit = item.get("usageLimit", 0)
            usage_count = item.get("usageCount", 0)
            
            # Check if depleted
            if usage_count >= usage_limit:
                item["usage_status"] = "depleted"
                # Add to waste_items if not already there
                if not any(w.get("itemId") == item.get("itemId") for w in waste_items):
                    waste_items.append(item)
            # Check if nearing depletion (80% used)
            elif usage_limit > 0 and usage_count >= usage_limit * 0.8:
                item["usage_status"] = "depleting_soon"
                # Add to waste_items if not already there
                if not any(w.get("itemId") == item.get("itemId") for w in waste_items):
                    waste_items.append(item)
        
        return jsonify(waste_items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Schedule waste return
@bp.route('/schedule-return', methods=['POST'])
def schedule_waste_return():
    """
    Schedules waste items for return
    
    Time Complexity: O(1) for database operations
    Space Complexity: O(1)
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemIds", "schedule"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Create return schedule
        return_schedule = {
            "itemIds": data["itemIds"],
            "schedule": data["schedule"],
            "notes": data.get("notes", ""),
            "createdAt": datetime.now().isoformat()
        }
        
        # Save to database
        result = g.db.waste_returns.insert_one(return_schedule)
        
        # Return success
        return jsonify({
            "success": True,
            "id": str(result.inserted_id),
            "message": "Waste return scheduled successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get scheduled returns
@bp.route('/scheduled-returns', methods=['GET'])
def get_scheduled_returns():
    """
    Gets all scheduled waste returns
    
    Time Complexity: O(n) where n is the number of scheduled returns
    Space Complexity: O(n) for storing scheduled returns
    """
    try:
        # Get all scheduled returns
        returns = list(g.db.waste_returns.find().sort("schedule", 1))
        
        # For each return, get details of the items
        for return_plan in returns:
            item_details = []
            
            for item_id in return_plan.get("itemIds", []):
                item = g.db.items.find_one({"itemId": item_id})
                if item:
                    item_details.append({
                        "itemId": item["itemId"],
                        "name": item.get("name", "Unknown"),
                        "mass": item.get("mass", 0)
                    })
            
            return_plan["items"] = item_details
        
        return jsonify(returns)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create a return plan
@bp.route('/create-return-plan', methods=['POST'])
def create_return_plan():
    """
    Creates a plan for returning waste items
    
    Time Complexity: O(n log n) where n is the number of waste items
    Space Complexity: O(n) for storing the plan
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemIds", "maxWeight", "containerForUndocking"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        item_ids = data["itemIds"]
        max_weight = data.get("maxWeight", 100)
        container_id = data["containerForUndocking"]
        
        # Check if container exists
        container = g.db.containers.find_one({"containerId": container_id})
        if not container:
            return jsonify({"error": f"Container {container_id} not found"}), 404
        
        # Get all specified items
        items = []
        for item_id in item_ids:
            item = g.db.items.find_one({"itemId": item_id})
            if item:
                items.append(item)
        
        # Sort items by priority (expired first, then by mass)
        sorted_items = sorted(items, key=lambda x: (
            0 if "expiry_status" in x and x["expiry_status"] == "expired" else 1,
            0 if "usage_status" in x and x["usage_status"] == "depleted" else 1,
            -(x.get("mass", 0))  # Heavier items first
        ))
        
        # Create plan
        plan = {
            "containerForUndocking": container_id,
            "maxWeight": max_weight,
            "totalItems": len(sorted_items),
            "totalMass": sum(item.get("mass", 0) for item in sorted_items),
            "items": sorted_items,
            "retrievalInstructions": generate_retrieval_instructions(sorted_items)
        }
        
        return jsonify({
            "success": True,
            "plan": plan
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Complete undocking
@bp.route('/complete-undocking', methods=['POST'])
def complete_undocking():
    """
    Completes the undocking process
    Removes all items from the undocking container
    
    Time Complexity: O(n) where n is the number of items in the container
    Space Complexity: O(n) for storing removed items
    """
    try:
        data = request.json
        
        # Validate required fields
        if "containerId" not in data:
            return jsonify({"error": "Missing required field: containerId"}), 400
        
        container_id = data["containerId"]
        
        # Check if container exists
        container = g.db.containers.find_one({"containerId": container_id})
        if not container:
            return jsonify({"error": f"Container {container_id} not found"}), 404
        
        # Get all items in the container
        items = list(g.db.items.find({"containerId": container_id}))
        
        # Remove items from the system
        for item in items:
            g.db.items.delete_one({"_id": item["_id"]})
            
            # Create log entry for the removal
            log_entry = {
                "itemId": item["itemId"],
                "retrievedBy": "system",
                "timestamp": datetime.now().isoformat(),
                "fromContainer": container_id,
                "type": "removed",
                "title": f"Removed {item.get('name', 'item')} during undocking",
                "description": "Item was undocked with container"
            }
            
            # Insert log entry
            g.db.retrieval_logs.insert_one(log_entry)
        
        return jsonify({
            "success": True,
            "itemsRemoved": len(items),
            "message": f"Successfully undocked container {container_id} with {len(items)} items"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper function to generate retrieval instructions
def generate_retrieval_instructions(items):
    """
    Generates step-by-step retrieval instructions for the waste return plan
    
    Time Complexity: O(n) where n is the number of items
    Space Complexity: O(n) for storing instructions
    """
    # Group items by container
    items_by_container = {}
    
    for item in items:
        container_id = item.get("containerId")
        if not container_id:
            continue
            
        if container_id not in items_by_container:
            items_by_container[container_id] = []
            
        items_by_container[container_id].append(item)
    
    # Generate instructions
    instructions = []
    step_number = 1
    
    # Add instructions for each container
    for container_id, container_items in items_by_container.items():
        instructions.append({
            "step": step_number,
            "description": f"Go to container {container_id}",
            "items": []
        })
        step_number += 1
        
        # Add instructions for retrieving items
        instructions.append({
            "step": step_number,
            "description": f"Retrieve {len(container_items)} items from container {container_id}",
            "items": [{
                "itemId": item.get("itemId"),
                "name": item.get("name", "Unknown")
            } for item in container_items]
        })
        step_number += 1
    
    # Add instruction for final step
    instructions.append({
        "step": step_number,
        "description": "Move all items to undocking container",
        "items": []
    })
    
    return instructions