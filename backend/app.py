"""
Flask application factory and configuration.

This module creates and configures the Flask application, including:
- Database initialization
- JWT authentication setup
- Route registration
- Frontend static file serving
"""
from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from backend.database import db
from backend.constants import (
    MAX_FILE_SIZE_BYTES,
    JWT_ACCESS_TOKEN_EXPIRY_HOURS,
    UPLOAD_FOLDER_NAME,
    ALLOWED_FILE_EXTENSIONS,
    DEFAULT_TOPIC_NAME,
    HTTP_STATUS_OK,
    HTTP_STATUS_UNAUTHORIZED,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_UNPROCESSABLE_ENTITY
)
import os
from datetime import timedelta

# Initialize JWT manager
jwt = JWTManager()


def _find_frontend_build_path(project_root: str) -> str:
    """
    Find the frontend build directory by checking common locations.
    
    Args:
        project_root: Root directory of the project
        
    Returns:
        Absolute path to frontend build directory, or None if not found
    """
    possible_build_paths = [
        os.path.join(project_root, 'frontend', 'build'),
        os.path.join(os.getcwd(), 'frontend', 'build'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'build'),
    ]
    
    for build_path in possible_build_paths:
        absolute_path = os.path.abspath(build_path)
        if os.path.exists(absolute_path):
            return absolute_path
    
    return None


def _initialize_default_topic():
    """
    Create the default topic if it doesn't exist in the database.
    
    This ensures that the application has at least one topic available
    for users to upload files to.
    """
    from backend.models import Topic
    
    default_topic = Topic.query.filter_by(name=DEFAULT_TOPIC_NAME).first()
    if not default_topic:
        default_topic = Topic(name=DEFAULT_TOPIC_NAME)
        db.session.add(default_topic)
        db.session.commit()
        print(f"Created default topic: {DEFAULT_TOPIC_NAME}")


def create_app():
    """
    Create and configure the Flask application instance.
    
    This factory function sets up:
    - Application configuration (database, JWT, file uploads)
    - Database initialization
    - Route registration
    - Static file serving for the React frontend
    
    Returns:
        Configured Flask application instance
    """
    # Get the project root directory (parent of backend directory)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Find frontend build path for serving React static files
    frontend_build_path = _find_frontend_build_path(project_root)
    
    # Configure Flask with static folder for React build (following Render pattern)
    if frontend_build_path:
        app = Flask(__name__, static_folder=frontend_build_path, static_url_path="/")
    else:
        app = Flask(__name__)
    
    # Application configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(project_root, "notespace.db")}')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=JWT_ACCESS_TOKEN_EXPIRY_HOURS)
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', os.path.join(project_root, UPLOAD_FOLDER_NAME))
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_BYTES
    app.config['ALLOWED_EXTENSIONS'] = ALLOWED_FILE_EXTENSIONS
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # JWT error handlers for better error messages
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired JWT tokens with a clear error message."""
        return jsonify({'error': 'Token has expired'}), HTTP_STATUS_UNAUTHORIZED
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid JWT tokens with a descriptive error message."""
        error_message = str(error)
        return jsonify({'error': f'Invalid token: {error_message}'}), HTTP_STATUS_UNPROCESSABLE_ENTITY
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Handle missing JWT tokens with a clear error message."""
        return jsonify({'error': 'Authorization token is missing'}), HTTP_STATUS_UNAUTHORIZED
    
    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Import models to register them with SQLAlchemy
    from backend import models
    
    # Initialize database tables (important for production deployment)
    with app.app_context():
        try:
            db.create_all()
            
            # Create default topic if it doesn't exist
            _initialize_default_topic()
        except Exception as error:
            print(f"Database initialization error: {error}")
            # Continue anyway - might be a schema issue
    
    # Import routes
    from backend.auth_routes import auth_bp
    from backend.topic_routes import topic_bp
    from backend.upload_routes import upload_bp
    from backend.meta_document_routes import meta_document_bp
    
    # Register blueprints (API routes must come before catch-all)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(topic_bp, url_prefix='/api/topics')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(meta_document_bp, url_prefix='/api/meta-documents')
    
    # Explicitly handle /static/ routes FIRST (before catch-all)
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """
        Serve static files from React build directory with proper MIME types.
        
        This route handles requests for static assets (JS, CSS, images) from
        the React build directory, ensuring correct MIME types are set.
        
        Args:
            filename: Name of the static file to serve
            
        Returns:
            File response or 404 error if file not found
        """
        if frontend_build_path and os.path.exists(frontend_build_path):
            static_file_path = os.path.join(frontend_build_path, 'static', filename)
            if os.path.exists(static_file_path):
                file_response = send_from_directory(os.path.join(frontend_build_path, 'static'), filename)
                # Set proper MIME types for different file types
                if filename.endswith('.js'):
                    file_response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
                elif filename.endswith('.css'):
                    file_response.headers['Content-Type'] = 'text/css; charset=utf-8'
                elif filename.endswith('.json'):
                    file_response.headers['Content-Type'] = 'application/json; charset=utf-8'
                elif filename.endswith('.png'):
                    file_response.headers['Content-Type'] = 'image/png'
                elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
                    file_response.headers['Content-Type'] = 'image/jpeg'
                elif filename.endswith('.svg'):
                    file_response.headers['Content-Type'] = 'image/svg+xml'
                return file_response
        return jsonify({'error': 'Static file not found'}), HTTP_STATUS_NOT_FOUND
    
    # Serve React frontend - catch-all route for all non-API routes (must be last)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        """
        Serve React frontend application.
        
        This is a catch-all route that serves the React frontend for all
        non-API routes. React Router handles client-side routing.
        
        Args:
            path: Request path (used by React Router)
            
        Returns:
            index.html for React Router or specific file if it exists
        """
        # Don't serve frontend for API routes
        if path.startswith('api/'):
            return jsonify({'error': 'Not found'}), HTTP_STATUS_NOT_FOUND
        
        # Don't interfere with static routes (already handled above)
        if path.startswith('static/'):
            return jsonify({'error': 'Static file not found'}), HTTP_STATUS_NOT_FOUND
        
        # Serve React build files
        if frontend_build_path and os.path.exists(frontend_build_path):
            # If path exists as a file in build folder, serve it directly
            if path != "" and os.path.exists(os.path.join(frontend_build_path, path)):
                return send_from_directory(frontend_build_path, path)
            # Otherwise serve index.html (React Router handles routing)
            else:
                return send_from_directory(frontend_build_path, 'index.html')
        else:
            # Debug info if build folder not found (helpful for deployment troubleshooting)
            debug_info = {
                'message': 'NoteSpace API - Frontend not built',
                'project_root': project_root,
                'current_working_directory': os.getcwd(),
            }
            return jsonify(debug_info), HTTP_STATUS_OK
    
    return app

app = create_app()

if __name__ == '__main__':
    """
    Run the Flask development server.
    
    When running directly (not via WSGI server), this initializes
    the database and starts the development server on port 5001.
    """
    with app.app_context():
        try:
            # Create/update database tables
            db.create_all()
            
            # Check if migration is needed for user_id column
            # SQLite doesn't support ALTER COLUMN, so migration requires table recreation
            try:
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                note_table_columns = inspector.get_columns('notes')
                for column in note_table_columns:
                    if column['name'] == 'user_id' and not column['nullable']:
                        # Migration needed - SQLite doesn't support ALTER COLUMN well
                        print("Note: Database migration may be needed for user_id")
            except Exception as migration_check_error:
                print(f"Migration check: {migration_check_error}")
            
            # Initialize default topic
            _initialize_default_topic()
        except Exception as initialization_error:
            print(f"Database initialization error: {initialization_error}")
            # Continue anyway - might be a schema issue
    
    app.run(debug=True, port=5001)

