from flask import Flask, jsonify
from controllers.placement_controller import placement_bp
from controllers.retrieval_controller import retrieval_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow frontend (React/Next.js) to connect

# Register both blueprints
app.register_blueprint(placement_bp, url_prefix="/api")
app.register_blueprint(retrieval_bp, url_prefix="/api")
from controllers.rearrange_controller import rearrange_bp
app.register_blueprint(rearrange_bp, url_prefix="/api")
from controllers.waste_controller import waste_bp
app.register_blueprint(waste_bp, url_prefix="/api")
from controllers.simulation_controller import simulation_bp
app.register_blueprint(simulation_bp, url_prefix="/api")




@app.route('/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append(str(rule))
    return jsonify(routes)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
