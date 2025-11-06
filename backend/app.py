from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from backend.database import db
import os
from datetime import timedelta

# Initialize JWT manager
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    # Get the project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(project_root, "notespace.db")}')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', os.path.join(project_root, 'uploads'))
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'docx', 'txt'}
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # JWT error handlers for better error messages
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        error_msg = str(error)
        return jsonify({'error': f'Invalid token: {error_msg}'}), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing'}), 401
    
    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Import models to register them with SQLAlchemy
    from backend import models
    
    # Import routes
    from backend.auth_routes import auth_bp
    from backend.topic_routes import topic_bp
    from backend.upload_routes import upload_bp
    from backend.meta_document_routes import meta_document_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(topic_bp, url_prefix='/api/topics')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(meta_document_bp, url_prefix='/api/meta-documents')
    
    # Serve React frontend
    frontend_build_path = os.path.join(project_root, 'frontend', 'build')
    
    # Debug: Print build path on startup (helpful for Render debugging)
    print(f"Frontend build path: {frontend_build_path}")
    print(f"Build path exists: {os.path.exists(frontend_build_path)}")
    if os.path.exists(frontend_build_path):
        print(f"Build contents: {os.listdir(frontend_build_path)}")
        static_dir = os.path.join(frontend_build_path, 'static')
        if os.path.exists(static_dir):
            print(f"Static dir exists: {os.path.exists(static_dir)}")
            print(f"Static dir contents: {os.listdir(static_dir)}")
    
    # Serve static files from React build (must be registered FIRST)
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        if not os.path.exists(frontend_build_path):
            return jsonify({'error': 'Frontend build not found', 'path': frontend_build_path}), 404
        
        static_file_path = os.path.join(frontend_build_path, 'static', filename)
        if not os.path.exists(static_file_path):
            return jsonify({'error': f'Static file not found: {filename}', 'searched_path': static_file_path}), 404
        
        response = send_from_directory(os.path.join(frontend_build_path, 'static'), filename)
        
        # Set proper MIME types for JavaScript and CSS
        if filename.endswith('.js'):
            response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
        elif filename.endswith('.css'):
            response.headers['Content-Type'] = 'text/css; charset=utf-8'
        
        return response
    
    # Serve index.html for root route (register BEFORE catch-all)
    @app.route('/')
    def serve_index():
        if not os.path.exists(frontend_build_path):
            return jsonify({'message': 'NoteSpace API', 'note': 'Frontend not built. Run "npm run build" in frontend directory.'}), 200
        return send_from_directory(frontend_build_path, 'index.html')
    
    # Serve other static assets and React Router routes (catch-all, register LAST)
    @app.route('/<path:path>')
    def serve_react_app(path):
        # Don't serve frontend for API routes
        if path.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404
        
        # Only serve frontend if build directory exists
        if not os.path.exists(frontend_build_path):
            return jsonify({'message': 'NoteSpace API', 'note': 'Frontend not built. Run "npm run build" in frontend directory.'}), 200
        
        # Serve other static files (manifest.json, favicon, etc.)
        file_path = os.path.join(frontend_build_path, path)
        if path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(frontend_build_path, path)
        
        # Serve index.html for React Router (client-side routing)
        return send_from_directory(frontend_build_path, 'index.html')
    
    return app

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        try:
            # Try to create/update tables
            db.create_all()
            
            # Handle migration: make user_id nullable if it's not already
            try:
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                columns = inspector.get_columns('notes')
                for col in columns:
                    if col['name'] == 'user_id' and not col['nullable']:
                        # Migration needed - SQLite doesn't support ALTER COLUMN well
                        # For now, we'll just recreate if needed
                        print("Note: Database migration may be needed for user_id")
            except Exception as e:
                print(f"Migration check: {e}")
            
            # Create default "cs35l" topic if it doesn't exist
            from backend.models import Topic
            cs35l_topic = Topic.query.filter_by(name='cs35l').first()
            if not cs35l_topic:
                cs35l_topic = Topic(name='cs35l')
                db.session.add(cs35l_topic)
                db.session.commit()
                print("Created default topic: cs35l")
        except Exception as e:
            print(f"Database initialization error: {e}")
            # Continue anyway - might be a schema issue
    
    app.run(debug=True, port=int(os.environ.get('PORT', 5001)), host='0.0.0.0')

