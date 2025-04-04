from flask import Blueprint, request, jsonify, g, send_file
import os
import csv
import json
import io
from datetime import datetime
from werkzeug.utils import secure_filename

# Create blueprint
bp = Blueprint('import_export', __name__)

# Import containers from CSV
@bp.route('/containers', methods=['POST'])
def import_containers():
    """
    Imports container data from a CSV file
    
    Time Complexity: O(n) where n is the number of rows in the CSV
    Space Complexity: O(n) for processing container data
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "File must be a CSV"}), 400
        
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        # Process containers
        containers = []
        errors = []
        row_num = 1
        
        for row in csv_reader:
            row_num += 1  # Account for header row
            
            # Validate required fields
            required_fields = ["containerId", "zone", "width", "depth", "height"]
            missing_fields = [field for field in required_fields if field not in row or not row[field]]
            
            if missing_fields:
                errors.append({
                    "row": row_num,
                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                    "data": row
                })
                continue
            
            # Validate numeric fields
            numeric_fields = ["width", "depth", "height"]
            invalid_numbers = []
            
            for field in numeric_fields:
                try:
                    if field in row:
                        row[field] = int(row[field])
                except ValueError:
                    invalid_numbers.append(field)
            
            if invalid_numbers:
                errors.append({
                    "row": row_num,
                    "error": f"Invalid numeric values for fields: {', '.join(invalid_numbers)}",
                    "data": row
                })
                continue
            
            # Check if container ID already exists
            existing = g.db.containers.find_one({"containerId": row["containerId"]})
            
            if existing:
                errors.append({
                    "row": row_num,
                    "error": f"Container with ID {row['containerId']} already exists",
                    "data": row
                })
                continue
            
            # Add container to list for insertion
            containers.append({
                "containerId": row["containerId"],
                "zone": row["zone"],
                "width": row["width"],
                "depth": row["depth"],
                "height": row["height"]
            })
        
        # Insert valid containers
        if containers:
            result = g.db.containers.insert_many(containers)
            inserted_count = len(result.inserted_ids)
        else:
            inserted_count = 0
        
        return jsonify({
            "success": True,
            "insertedCount": inserted_count,
            "errorCount": len(errors),
            "errors": errors
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Import items from CSV
@bp.route('/items', methods=['POST'])
def import_items():
    """
    Imports item data from a CSV file
    
    Time Complexity: O(n) where n is the number of rows in the CSV
    Space Complexity: O(n) for processing item data
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "File must be a CSV"}), 400
        
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        # Process items
        items = []
        errors = []
        row_num = 1
        
        for row in csv_reader:
            row_num += 1  # Account for header row
            
            # Validate required fields
            required_fields = ["itemId", "name", "containerId", "width", "depth", "height"]
            missing_fields = [field for field in required_fields if field not in row or not row[field]]
            
            if missing_fields:
                errors.append({
                    "row": row_num,
                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                    "data": row
                })
                continue
            
            # Validate numeric fields
            numeric_fields = ["width", "depth", "height", "usageLimit", "mass"]
            invalid_numbers = []
            
            for field in numeric_fields:
                try:
                    if field in row and row[field]:
                        row[field] = float(row[field])
                except ValueError:
                    invalid_numbers.append(field)
            
            if invalid_numbers:
                errors.append({
                    "row": row_num,
                    "error": f"Invalid numeric values for fields: {', '.join(invalid_numbers)}",
                    "data": row
                })
                continue
            
            # Check if item ID already exists
            existing = g.db.items.find_one({"itemId": row["itemId"]})
            
            if existing:
                errors.append({
                    "row": row_num,
                    "error": f"Item with ID {row['itemId']} already exists",
                    "data": row
                })
                continue
            
            # Check if container exists
            container = g.db.containers.find_one({"containerId": row["containerId"]})
            
            if not container:
                errors.append({
                    "row": row_num,
                    "error": f"Container with ID {row['containerId']} does not exist",
                    "data": row
                })
                continue
            
            # Create item object
            item = {
                "itemId": row["itemId"],
                "name": row["name"],
                "containerId": row["containerId"],
                "width": row["width"],
                "depth": row["depth"],
                "height": row["height"]
            }
            
            # Add optional fields if present
            if "expiryDate" in row and row["expiryDate"]:
                item["expiryDate"] = row["expiryDate"]
            if "usageLimit" in row and row["usageLimit"]:
                item["usageLimit"] = int(row["usageLimit"])
            if "mass" in row and row["mass"]:
                item["mass"] = float(row["mass"])
            if "priority" in row and row["priority"]:
                try:
                    item["priority"] = int(row["priority"])
                except ValueError:
                    item["priority"] = 1  # Default priority
            
            # Find a position for the item if not provided
            if "position" not in row or not row["position"]:
                from routes.placement import find_placement_position
                position = find_placement_position(item, container)
                
                if position:
                    item["position"] = position
            
            # Add item to list for insertion
            items.append(item)
        
        # Insert valid items
        if items:
            result = g.db.items.insert_many(items)
            inserted_count = len(result.inserted_ids)
        else:
            inserted_count = 0
        
        return jsonify({
            "success": True,
            "insertedCount": inserted_count,
            "errorCount": len(errors),
            "errors": errors
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export containers as CSV
@bp.route('/containers/export', methods=['GET'])
def export_containers():
    """
    Exports container data as a CSV file
    
    Time Complexity: O(n) where n is the number of containers
    Space Complexity: O(n) for generating CSV data
    """
    try:
        # Get all containers
        containers = list(g.db.containers.find())
        
        if not containers:
            return jsonify({"error": "No containers found to export"}), 404
        
        # Create CSV file in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["containerId", "zone", "width", "depth", "height"])
        
        # Write container data
        for container in containers:
            writer.writerow([
                container.get("containerId", ""),
                container.get("zone", ""),
                container.get("width", ""),
                container.get("depth", ""),
                container.get("height", "")
            ])
        
        # Prepare response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'containers_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export items as CSV
@bp.route('/items/export', methods=['GET'])
def export_items():
    """
    Exports item data as a CSV file
    
    Time Complexity: O(n) where n is the number of items
    Space Complexity: O(n) for generating CSV data
    """
    try:
        # Get all items
        items = list(g.db.items.find())
        
        if not items:
            return jsonify({"error": "No items found to export"}), 404
        
        # Create CSV file in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "itemId", "name", "containerId", "width", "depth", "height",
            "expiryDate", "usageLimit", "mass", "priority"
        ])
        
        # Write item data
        for item in items:
            writer.writerow([
                item.get("itemId", ""),
                item.get("name", ""),
                item.get("containerId", ""),
                item.get("width", ""),
                item.get("depth", ""),
                item.get("height", ""),
                item.get("expiryDate", ""),
                item.get("usageLimit", ""),
                item.get("mass", ""),
                item.get("priority", "")
            ])
        
        # Prepare response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'items_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export current arrangement as CSV
@bp.route('/arrangement/export', methods=['GET'])
def export_arrangement():
    """
    Exports current arrangement as a CSV file
    
    Time Complexity: O(n) where n is the number of items
    Space Complexity: O(n) for generating CSV data
    """
    try:
        # Get all items with positions
        items = list(g.db.items.find({"position": {"$exists": True}}))
        
        if not items:
            return jsonify({"error": "No items with positions found to export"}), 404
        
        # Create CSV file in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "itemId", "name", "containerId", "startCoordinates", "endCoordinates"
        ])
        
        # Write item data
        for item in items:
            position = item.get("position", {})
            start_coords = position.get("startCoordinates", {})
            end_coords = position.get("endCoordinates", {})
            
            # Format coordinates as strings
            start_str = f"({start_coords.get('width', 0)},{start_coords.get('depth', 0)},{start_coords.get('height', 0)})"
            end_str = f"({end_coords.get('width', 0)},{end_coords.get('depth', 0)},{end_coords.get('height', 0)})"
            
            writer.writerow([
                item.get("itemId", ""),
                item.get("name", ""),
                item.get("containerId", ""),
                start_str,
                end_str
            ])
        
        # Prepare response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'arrangement_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500