from backend.database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    notes = db.relationship('Note', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

class Topic(db.Model):
    __tablename__ = 'topics'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    notes = db.relationship('Note', backref='topic', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat()
        }

class Note(db.Model):
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Made nullable
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    upvote_count = db.Column(db.Integer, default=0)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    meta_document = db.relationship('MetaDocument', backref='note', uselist=False, cascade='all, delete-orphan')
    upvotes = db.relationship('Upvote', backref='note', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
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
    __tablename__ = 'upvotes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate upvotes
    __table_args__ = (db.UniqueConstraint('user_id', 'note_id', name='unique_user_note_upvote'),)

class MetaDocument(db.Model):
    __tablename__ = 'meta_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id'), nullable=True)  # Optional: can be for a single note or combined
    synthesized_content = db.Column(db.Text, nullable=False)  # The LLM-generated meta document
    source_filenames = db.Column(db.Text, nullable=False)  # JSON array of source file names
    chunk_count = db.Column(db.Integer, default=0)
    token_count = db.Column(db.Integer, default=0)
    processing_status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topic = db.relationship('Topic', backref='meta_documents')
    
    def to_dict(self):
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

