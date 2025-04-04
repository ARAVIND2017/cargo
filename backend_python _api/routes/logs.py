from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
import json

# Create blueprint
bp = Blueprint('logs', __name__)

# Get logs with optional filtering
@bp.route('', methods=['GET'])
def get_logs():
    """
    Gets logs with optional filtering by date range, item ID, user ID, and action type
    
    Time Complexity: O(n) where n is the number of matching logs
    Space Complexity: O(n) for storing and returning logs
    """
    try:
        # Parse query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        item_id = request.args.get('itemId')
        user_id = request.args.get('userId')
        action_type = request.args.get('type')
        limit = request.args.get('limit', default=100, type=int)
        
        # Build query
        query = {}
        
        # Add date range filter
        if start_date or end_date:
            timestamp_filter = {}
            if start_date:
                try:
                    start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                    timestamp_filter["$gte"] = start.isoformat()
                except:
                    return jsonify({"error": "Invalid startDate format"}), 400
            if end_date:
                try:
                    end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    timestamp_filter["$lte"] = end.isoformat()
                except:
                    return jsonify({"error": "Invalid endDate format"}), 400
            query["timestamp"] = timestamp_filter
        
        # Add item ID filter
        if item_id:
            query["itemId"] = item_id
        
        # Add user ID filter
        if user_id:
            query["retrievedBy"] = user_id
        
        # Add action type filter
        if action_type:
            query["type"] = action_type
        
        # Get logs with sorting and limit
        logs = list(g.db.retrieval_logs.find(query).sort("timestamp", -1).limit(limit))
        
        # Add container and item details
        for log in logs:
            # Get item details
            if "itemId" in log:
                item = g.db.items.find_one({"itemId": log["itemId"]})
                if item:
                    log["itemName"] = item.get("name", "Unknown")
            
            # Get container details
            if "fromContainer" in log:
                container = g.db.containers.find_one({"containerId": log["fromContainer"]})
                if container:
                    log["fromContainerZone"] = container.get("zone", "Unknown")
            
            if "newContainer" in log:
                container = g.db.containers.find_one({"containerId": log["newContainer"]})
                if container:
                    log["newContainerZone"] = container.get("zone", "Unknown")
        
        return jsonify({
            "success": True,
            "logs": logs,
            "count": len(logs),
            "totalCount": g.db.retrieval_logs.count_documents(query)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get summary statistics
@bp.route('/summary', methods=['GET'])
def get_log_summary():
    """
    Gets summary statistics from logs
    
    Time Complexity: O(n) where n is the number of logs in the specified period
    Space Complexity: O(1) for storing and returning summary data
    """
    try:
        # Parse query parameters
        days = request.args.get('days', default=7, type=int)
        
        # Calculate start date
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get logs for the period
        logs = list(g.db.retrieval_logs.find({
            "timestamp": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }))
        
        # Calculate summary statistics
        stats = {
            "totalLogs": len(logs),
            "byType": {},
            "byContainer": {},
            "byUser": {},
            "topItems": [],
            "period": {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "days": days
            }
        }
        
        # Count by type
        for log in logs:
            log_type = log.get("type", "unknown")
            stats["byType"][log_type] = stats["byType"].get(log_type, 0) + 1
            
            # Count by container
            container = log.get("fromContainer", "unknown")
            stats["byContainer"][container] = stats["byContainer"].get(container, 0) + 1
            
            # Count by user
            user = log.get("retrievedBy", "unknown")
            stats["byUser"][user] = stats["byUser"].get(user, 0) + 1
        
        # Get top items
        item_counts = {}
        for log in logs:
            item_id = log.get("itemId")
            if not item_id:
                continue
            
            if item_id not in item_counts:
                # Get item name
                item = g.db.items.find_one({"itemId": item_id})
                item_name = item.get("name", "Unknown") if item else "Unknown"
                
                item_counts[item_id] = {
                    "itemId": item_id,
                    "name": item_name,
                    "count": 0
                }
            
            item_counts[item_id]["count"] += 1
        
        # Sort by count and get top 5
        top_items = sorted(item_counts.values(), key=lambda x: x["count"], reverse=True)[:5]
        stats["topItems"] = top_items
        
        return jsonify({
            "success": True,
            "summary": stats
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create a custom log entry
@bp.route('', methods=['POST'])
def create_log():
    """
    Creates a custom log entry
    
    Time Complexity: O(1) for database operation
    Space Complexity: O(1)
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["itemId", "type", "title"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Prepare log entry
        log_entry = {
            "itemId": data["itemId"],
            "type": data["type"],
            "title": data["title"],
            "timestamp": data.get("timestamp", datetime.now().isoformat()),
            "retrievedBy": data.get("userId", "system"),
            "description": data.get("description", "")
        }
        
        # Add container fields if provided
        if "fromContainer" in data:
            log_entry["fromContainer"] = data["fromContainer"]
        if "newContainer" in data:
            log_entry["newContainer"] = data["newContainer"]
        
        # Insert log entry
        result = g.db.retrieval_logs.insert_one(log_entry)
        
        return jsonify({
            "success": True,
            "id": str(result.inserted_id),
            "message": "Log entry created successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500