from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta

# Create blueprint
bp = Blueprint('simulation', __name__)

# Get current simulation status
@bp.route('/status', methods=['GET'])
def get_simulation_status():
    """
    Gets the current simulation status
    
    Time Complexity: O(1) for database lookup
    Space Complexity: O(1) for returning status
    """
    try:
        # Get simulation settings from database
        settings = g.db.simulation_settings.find_one()
        
        if not settings:
            # Create default settings if not found
            settings = {
                "isRunning": False,
                "speed": 1,
                "elapsedHours": 0,
                "autoExpiry": True,
                "expiredItems": 0,
                "currentDate": datetime.now().isoformat()
            }
            g.db.simulation_settings.insert_one(settings)
        
        return jsonify(settings)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update simulation settings
@bp.route('/settings', methods=['POST'])
def update_simulation_settings():
    """
    Updates the simulation settings
    
    Time Complexity: O(1) for database update
    Space Complexity: O(1)
    """
    try:
        data = request.json
        
        # Get current settings
        settings = g.db.simulation_settings.find_one()
        
        if not settings:
            # Create default settings if not found
            settings = {
                "isRunning": False,
                "speed": 1,
                "elapsedHours": 0,
                "autoExpiry": True,
                "expiredItems": 0,
                "currentDate": datetime.now().isoformat()
            }
        
        # Update settings with new values
        for key, value in data.items():
            if key in settings:
                settings[key] = value
        
        # Save updated settings
        if "_id" in settings:
            g.db.simulation_settings.replace_one({"_id": settings["_id"]}, settings)
        else:
            g.db.simulation_settings.insert_one(settings)
        
        return jsonify(settings)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Advance time in simulation
@bp.route('/advance', methods=['POST'])
def advance_time():
    """
    Advances time in the simulation
    
    Time Complexity: O(n) where n is the number of items affected
    Space Complexity: O(n) for storing affected items
    """
    try:
        data = request.json
        
        # Process optional parameters
        num_days = data.get("numOfDays", 1)
        to_timestamp = data.get("toTimestamp")
        items_to_use = data.get("itemsToBeUsedPerDay", [])
        
        # Get current settings
        settings = g.db.simulation_settings.find_one()
        
        if not settings:
            # Create default settings if not found
            settings = {
                "isRunning": False,
                "speed": 1,
                "elapsedHours": 0,
                "autoExpiry": True,
                "expiredItems": 0,
                "currentDate": datetime.now().isoformat()
            }
            g.db.simulation_settings.insert_one(settings)
        
        # Calculate new date
        current_date = datetime.fromisoformat(settings["currentDate"].replace("Z", "+00:00"))
        
        if to_timestamp:
            # Advance to specific date
            target_date = datetime.fromisoformat(to_timestamp.replace("Z", "+00:00"))
            days_diff = (target_date - current_date).days
            new_date = target_date
        else:
            # Advance by number of days
            days_diff = num_days
            new_date = current_date + timedelta(days=days_diff)
        
        # Update settings with new date
        settings["currentDate"] = new_date.isoformat()
        settings["elapsedHours"] += days_diff * 24
        
        # Save updated settings
        if "_id" in settings:
            g.db.simulation_settings.replace_one({"_id": settings["_id"]}, settings)
        else:
            g.db.simulation_settings.insert_one(settings)
        
        # Track changes for response
        changes = {
            "itemsUsed": [],
            "itemsExpired": [],
            "itemsDepletedToday": []
        }
        
        # Process item usage
        for item_to_use in items_to_use:
            if "itemId" not in item_to_use:
                continue
                
            # Get the item
            item = g.db.items.find_one({"itemId": item_to_use["itemId"]})
            
            if not item:
                continue
                
            # Update usage count
            current_usage = item.get("usageCount", 0)
            new_usage = current_usage + days_diff
            
            # Check if item has usage limit
            if "usageLimit" in item and item["usageLimit"] is not None:
                # Check if item is now depleted
                if current_usage < item["usageLimit"] and new_usage >= item["usageLimit"]:
                    changes["itemsDepletedToday"].append({
                        "itemId": item["itemId"],
                        "name": item.get("name", "Unknown")
                    })
                
                # Add to used items list
                changes["itemsUsed"].append({
                    "itemId": item["itemId"],
                    "name": item.get("name", "Unknown"),
                    "remainingUses": max(0, item["usageLimit"] - new_usage)
                })
            
            # Update item in database
            g.db.items.update_one(
                {"itemId": item["itemId"]},
                {"$set": {"usageCount": new_usage}}
            )
        
        # Check for expired items if autoExpiry is enabled
        if settings.get("autoExpiry", True):
            # Get all items with expiry dates
            items = list(g.db.items.find({"expiryDate": {"$ne": None}}))
            
            for item in items:
                if "expiryDate" not in item or not item["expiryDate"]:
                    continue
                    
                try:
                    expiry_date = datetime.fromisoformat(item["expiryDate"].replace("Z", "+00:00"))
                    
                    # Check if item has expired during simulation
                    if current_date < expiry_date <= new_date:
                        changes["itemsExpired"].append({
                            "itemId": item["itemId"],
                            "name": item.get("name", "Unknown"),
                            "expiryDate": item["expiryDate"]
                        })
                        
                        # Update expired items count
                        settings["expiredItems"] += 1
                        
                        # Save updated settings
                        g.db.simulation_settings.replace_one({"_id": settings["_id"]}, settings)
                        
                        # Add to waste items if not already there
                        waste_item = g.db.waste_items.find_one({"itemId": item["itemId"]})
                        
                        if not waste_item:
                            g.db.waste_items.insert_one({
                                "itemId": item["itemId"],
                                "name": item.get("name", "Unknown"),
                                "reason": "expired",
                                "expiryDate": item["expiryDate"],
                                "identifiedDate": new_date.isoformat()
                            })
                except:
                    # Skip items with invalid dates
                    pass
        
        # Return the result
        return jsonify({
            "success": True,
            "newDate": new_date.isoformat(),
            "daysPassed": days_diff,
            "changes": changes
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Reset simulation
@bp.route('/reset', methods=['POST'])
def reset_simulation():
    """
    Resets the simulation to default state
    
    Time Complexity: O(1) for database operations
    Space Complexity: O(1)
    """
    try:
        # Create default settings
        settings = {
            "isRunning": False,
            "speed": 1,
            "elapsedHours": 0,
            "autoExpiry": True,
            "expiredItems": 0,
            "currentDate": datetime.now().isoformat()
        }
        
        # Delete existing settings
        g.db.simulation_settings.delete_many({})
        
        # Insert new settings
        g.db.simulation_settings.insert_one(settings)
        
        # Reset usage counts for all items
        g.db.items.update_many({}, {"$set": {"usageCount": 0}})
        
        # Clear waste items
        g.db.waste_items.delete_many({})
        
        return jsonify({
            "success": True,
            "message": "Simulation reset successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Start simulation
@bp.route('/start', methods=['POST'])
def start_simulation():
    """
    Starts the simulation
    
    Time Complexity: O(1) for database operations
    Space Complexity: O(1)
    """
    try:
        data = request.json
        
        # Get speed and autoExpiry from request
        speed = data.get("speed", 1)
        auto_expiry = data.get("autoExpiry", True)
        
        # Get current settings
        settings = g.db.simulation_settings.find_one()
        
        if not settings:
            # Create default settings if not found
            settings = {
                "isRunning": True,
                "speed": speed,
                "elapsedHours": 0,
                "autoExpiry": auto_expiry,
                "expiredItems": 0,
                "currentDate": datetime.now().isoformat()
            }
            g.db.simulation_settings.insert_one(settings)
        else:
            # Update settings
            settings["isRunning"] = True
            settings["speed"] = speed
            settings["autoExpiry"] = auto_expiry
            
            # Save updated settings
            g.db.simulation_settings.replace_one({"_id": settings["_id"]}, settings)
        
        return jsonify({
            "success": True,
            "message": "Simulation started successfully",
            "settings": settings
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Pause simulation
@bp.route('/pause', methods=['POST'])
def pause_simulation():
    """
    Pauses the simulation
    
    Time Complexity: O(1) for database operations
    Space Complexity: O(1)
    """
    try:
        # Get current settings
        settings = g.db.simulation_settings.find_one()
        
        if not settings:
            # Create default settings if not found
            settings = {
                "isRunning": False,
                "speed": 1,
                "elapsedHours": 0,
                "autoExpiry": True,
                "expiredItems": 0,
                "currentDate": datetime.now().isoformat()
            }
            g.db.simulation_settings.insert_one(settings)
        else:
            # Update settings
            settings["isRunning"] = False
            
            # Save updated settings
            g.db.simulation_settings.replace_one({"_id": settings["_id"]}, settings)
        
        return jsonify({
            "success": True,
            "message": "Simulation paused successfully",
            "settings": settings
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500