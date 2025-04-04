import os

# Create routes package
routes_dir = os.path.join(os.path.dirname(__file__), 'routes')
if not os.path.exists(routes_dir):
    os.makedirs(routes_dir)
    # Create __init__.py file for routes package
    with open(os.path.join(routes_dir, '__init__.py'), 'w') as f:
        f.write('# Routes package')

# Create uploaded files directory
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)