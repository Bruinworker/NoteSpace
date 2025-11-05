from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from backend.database import db
import os
from datetime import timedelta

# Initialize JWT manager
jwt = JWTManager()

def create_app():
    # Get the project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Find frontend build path
    possible_build_paths = [
        os.path.join(project_root, 'frontend', 'build'),
        os.path.join(os.getcwd(), 'frontend', 'build'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'build'),
    ]
    
    frontend_build_path = None
    for build_path in possible_build_paths:
        abs_path = os.path.abspath(build_path)
        if os.path.exists(abs_path):
            frontend_build_path = abs_path
            break
    
    # Configure Flask with static folder for React build (following Render pattern)
    if frontend_build_path:
        app = Flask(__name__, static_folder=frontend_build_path, static_url_path="/")
    else:
        app = Flask(__name__)
    
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
    
    # Register blueprints (API routes must come before catch-all)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(topic_bp, url_prefix='/api/topics')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    
    # Serve React frontend - catch-all route for all non-API routes (must be last)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        # Don't serve frontend for API routes
        if path.startswith('api/'):
            return jsonify({'error': 'Not found'}), 404
        
        # Serve React build files
        if frontend_build_path and os.path.exists(frontend_build_path):
            # If path exists as a file in build folder, serve it
            if path != "" and os.path.exists(os.path.join(frontend_build_path, path)):
                return send_from_directory(frontend_build_path, path)
            # Otherwise serve index.html (React Router handles routing)
            else:
                return send_from_directory(frontend_build_path, 'index.html')
        else:
            # Debug info if build folder not found
            debug_info = {
                'message': 'NoteSpace API - Frontend not built',
                'project_root': project_root,
                'cwd': os.getcwd(),
                'checked_paths': possible_build_paths,
                'build_exists': [os.path.exists(os.path.abspath(p)) for p in possible_build_paths],
            }
            return jsonify(debug_info), 200
    
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
    
    app.run(debug=True, port=5001)

