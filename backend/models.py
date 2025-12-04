"""
Database models for the NoteSpace application.

This module defines the SQLAlchemy ORM models that represent the database schema:
- User: Stores user account information and authentication credentials
- Topic: Represents course topics/categories for organizing notes
- Note: Stores uploaded file metadata and references
- Upvote: Tracks user upvotes on notes (many-to-many relationship)
- MetaDocument: Stores AI-generated summaries of notes

Each model includes:
- Database columns with appropriate constraints
- Relationships to other models
- Helper methods for serialization (to_dict)
"""
from backend.database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


class User(db.Model):
    """
    User model for authentication and user management.
    
    Stores user credentials and profile information. Passwords are hashed
    using werkzeug's generate_password_hash for security.
    
    Attributes:
        id: Primary key, auto-incremented
        name: User's display name
        email: User's email address (unique, used for login)
        password_hash: Hashed password (never store plaintext passwords!)
        created_at: Timestamp when account was created
        
    Relationships:
        notes: All notes uploaded by this user (one-to-many)
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - cascade delete ensures notes are removed when user is deleted
    notes = db.relationship('Note', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and store the user's password securely."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify a password against the stored hash. Returns True if valid."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary for JSON serialization (excludes password)."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

class Topic(db.Model):
    """
    Topic model for organizing notes by course/subject.
    
    Topics serve as categories for grouping related notes together.
    Users can create topics to organize their uploads by class or subject.
    
    Attributes:
        id: Primary key, auto-incremented
        name: Topic/course name (e.g., "CS 101", "Biology 201")
        deadline: Optional deadline for the topic (e.g., assignment due date)
        created_at: Timestamp when topic was created
        
    Relationships:
        notes: All notes belonging to this topic (one-to-many)
        meta_documents: AI-generated summaries for this topic
    """
    __tablename__ = 'topics'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - cascade delete removes associated notes when topic is deleted
    notes = db.relationship('Note', backref='topic', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert topic to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat()
        }

class Note(db.Model):
    """
    Note model for storing uploaded file metadata.
    
    Notes represent uploaded files and store metadata about each file,
    including the original filename, file size, and storage location.
    The actual file is stored on disk; this model stores the reference.
    
    Attributes:
        id: Primary key, auto-incremented
        user_id: Foreign key to uploading user (nullable for anonymous uploads)
        topic_id: Foreign key to associated topic (required)
        file_url: API endpoint path to access the file
        original_filename: Original name of the uploaded file
        file_size: File size in bytes
        upvote_count: Cached count of upvotes (denormalized for performance)
        uploaded_at: Timestamp when file was uploaded
        
    Relationships:
        user: The user who uploaded this note (many-to-one)
        topic: The topic this note belongs to (many-to-one)
        upvotes: All upvotes on this note (one-to-many)
        meta_document: AI-generated summary for this note (one-to-one)
    """
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for anonymous uploads
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    upvote_count = db.Column(db.Integer, default=0)  # Denormalized for query performance
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    meta_document = db.relationship('MetaDocument', backref='note', uselist=False, cascade='all, delete-orphan')
    upvotes = db.relationship('Upvote', backref='note', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert note to dictionary for JSON serialization with related data."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'topic_id': self.topic_id,
            'file_url': self.file_url,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'upvote_count': self.upvote_count,
            'uploaded_at': self.uploaded_at.isoformat(),
            'uploader_name': self.user.name if self.user else 'Anonymous',
            'topic_name': self.topic.name if self.topic else None
        }


class Upvote(db.Model):
    """
    Upvote model for tracking user votes on notes.
    
    Implements a many-to-many relationship between users and notes,
    allowing each user to upvote each note only once. The unique
    constraint prevents duplicate upvotes.
    
    Attributes:
        id: Primary key, auto-incremented
        user_id: Foreign key to the voting user
        note_id: Foreign key to the voted note
        created_at: Timestamp when upvote was cast
        
    Constraints:
        unique_user_note_upvote: Prevents same user from upvoting same note twice
    """
    __tablename__ = 'upvotes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint prevents duplicate upvotes from same user on same note
    __table_args__ = (db.UniqueConstraint('user_id', 'note_id', name='unique_user_note_upvote'),)


class MetaDocument(db.Model):
    """
    MetaDocument model for AI-generated document summaries.
    
    Stores synthesized content generated from processing uploaded notes
    using AI/LLM. Can be created for individual notes or entire topics.
    
    Attributes:
        id: Primary key, auto-incremented
        topic_id: Foreign key to associated topic
        note_id: Optional foreign key to specific note (if per-note summary)
        synthesized_content: The AI-generated summary/meta document text
        source_filenames: JSON array of filenames used to generate this summary
        chunk_count: Number of text chunks processed
        token_count: Total tokens processed (for tracking API usage)
        processing_status: Current status (pending/processing/completed/failed)
        error_message: Error details if processing failed
        created_at: Timestamp when processing started
        updated_at: Timestamp of last update (auto-updated on changes)
        
    Relationships:
        topic: The topic this meta document summarizes (many-to-one)
        note: Optional specific note this summarizes (one-to-one)
    """
    __tablename__ = 'meta_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id'), nullable=True)  # Nullable for topic-wide summaries
    synthesized_content = db.Column(db.Text, nullable=False)  # AI-generated content
    source_filenames = db.Column(db.Text, nullable=False)  # JSON array of source files
    chunk_count = db.Column(db.Integer, default=0)  # Number of chunks processed
    token_count = db.Column(db.Integer, default=0)  # Total tokens for API tracking
    processing_status = db.Column(db.String(50), default='pending')  # Status: pending/processing/completed/failed
    error_message = db.Column(db.Text, nullable=True)  # Error details if failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topic = db.relationship('Topic', backref='meta_documents')
    
    def to_dict(self):
        """Convert meta document to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'topic_id': self.topic_id,
            'note_id': self.note_id,
            'synthesized_content': self.synthesized_content,
            'source_filenames': self.source_filenames,
            'chunk_count': self.chunk_count,
            'token_count': self.token_count,
            'processing_status': self.processing_status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'topic_name': self.topic.name if self.topic else None
        }

