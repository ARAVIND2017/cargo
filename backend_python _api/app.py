from flask import Flask, jsonify, g, request, redirect
from flask_cors import CORS
import os
from dotenv import load_dotenv
from bson import json_util
import json

# Import modules
from db import get_db, close_db, MongoJSONEncoder

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.json_encoder = MongoJSONEncoder

# Configure CORS
CORS(app, resources={r"/": {"origins": ""}})

# Setup database connection
@app.before_request
def before_request():
    """Connect to the database before each request."""
    g.db = get_db()

@app.teardown_request
def teardown_db(exception):
    """Close the database connection after each request."""
    close_db()

# Home route - redirect to client app
@app.route('/')
def home():
    return redirect('/api/status')

# API status check
@app.route('/api/status')
def status():
    """Return API status."""
    return jsonify({
        "status": "online",
        "api_version": "1.0.0",
        "mongodb": "connected" if g.db is not None else "disconnected"
    })

# List all available routes
@app.route('/api/routes')
def list_routes():
    """List all available routes."""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": [method for method in rule.methods if method != 'OPTIONS' and method != 'HEAD'],
            "path": str(rule)
        })
    return jsonify({"routes": routes})

# Register route blueprints
def register_blueprints():
    # Import blueprints
    from routes.placement import bp as placement_bp
    from routes.search import bp as search_bp
    from routes.waste import bp as waste_bp
    from routes.simulation import bp as simulation_bp
    from routes.import_export import bp as import_export_bp
    from routes.logs import bp as logs_bp
    
    # Register blueprints
    app.register_blueprint(placement_bp, url_prefix='/api/placement')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(waste_bp, url_prefix='/api/waste')
    app.register_blueprint(simulation_bp, url_prefix='/api/simulation')
    app.register_blueprint(import_export_bp, url_prefix='/api/import-export')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')

# Initialize blueprint registration
register_blueprints()

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Server error"}), 500

# Initialize database with sample data if needed
def init_db():
    """Initialize database with sample data if empty."""
    from insert_mock_data import insert_sample_data
    
    # Check if containers collection has data
    db = get_db()
    if db.containers.count_documents({}) == 0:
        print("Initializing database with sample data...")
        insert_sample_data()
        print("Sample data inserted successfully")

# Initialize database on startup
if os.environ.get('FLASK_ENV') != 'test':
    with app.app_context():
        init_db()

if __name__ == '_main_':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)