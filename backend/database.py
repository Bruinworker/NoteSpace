from flask_sqlalchemy import SQLAlchemy

# Initialize database instance
# This is imported by both app.py (to initialize with Flask app) and models.py (to define models)
db = SQLAlchemy()

