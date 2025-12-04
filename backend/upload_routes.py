"""
File upload and management routes.

This module handles:
- File uploads with optional authentication
- File downloads
- Listing uploaded files
- Upvoting notes
"""
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
from backend.database import db
from backend.models import Note, Topic, User, Upvote
from backend.constants import (
    HTTP_STATUS_OK,
    HTTP_STATUS_CREATED,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
)
import os
import uuid

upload_bp = Blueprint('upload', __name__)


def _get_user_id_from_token() -> str:
    """
    Extract user ID from JWT token if present and valid.
    
    Returns:
        User ID as string if authenticated, None otherwise
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            verify_jwt_in_request()
            return get_jwt_identity()
    except Exception:
        # No auth token or invalid token - return None
        pass
    return None


def _generate_unique_filename(original_filename: str) -> str:
    """
    Generate a unique filename while preserving the file extension.
    
    Args:
        original_filename: Original filename to extract extension from
        
    Returns:
        Unique filename with UUID prefix
    """
    secured_filename = secure_filename(original_filename)
    if '.' in secured_filename:
        file_extension = secured_filename.rsplit('.', 1)[1].lower()
        return f"{uuid.uuid4()}.{file_extension}"
    return str(uuid.uuid4())

@upload_bp.route('/', methods=['POST'])
def upload_file():
    """
    Upload a file to a topic.
    
    Accepts file uploads with optional authentication. If authenticated,
    the file is associated with the user. If not, it's treated as anonymous.
    
    Expected form data:
        - file: The file to upload (multipart/form-data)
        - topic_id: ID of the topic to associate the file with
    
    Returns:
        JSON response with note information on success (201),
        or error message on failure (400/404/500)
    """
    try:
        # Get user_id if authenticated, otherwise None (anonymous upload)
        authenticated_user_id = _get_user_id_from_token()
        
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), HTTP_STATUS_BAD_REQUEST
        
        uploaded_file = request.files['file']
        topic_id = request.form.get('topic_id')
        
        # Validate file was selected
        if uploaded_file.filename == '':
            return jsonify({'error': 'No file selected'}), HTTP_STATUS_BAD_REQUEST
        
        # Validate topic_id is provided
        if not topic_id:
            return jsonify({'error': 'Topic ID is required'}), HTTP_STATUS_BAD_REQUEST
        
        # Validate topic exists
        selected_topic = Topic.query.get(topic_id)
        if not selected_topic:
            return jsonify({'error': 'Topic not found'}), HTTP_STATUS_NOT_FOUND
        
        # Generate unique filename to prevent collisions
        original_filename = secure_filename(uploaded_file.filename)
        unique_filename = _generate_unique_filename(original_filename)
        
        # Save file to upload folder
        upload_folder = current_app.config['UPLOAD_FOLDER']
        file_save_path = os.path.join(upload_folder, unique_filename)
        uploaded_file.save(file_save_path)
        
        # Get file size for storage
        file_size_bytes = os.path.getsize(file_save_path)
        
        # Create note record in database
        new_note = Note(
            user_id=authenticated_user_id,  # Can be None if not authenticated
            topic_id=topic_id,
            file_url=f"/api/upload/files/{unique_filename}",
            original_filename=original_filename,
            file_size=file_size_bytes
        )
        
        db.session.add(new_note)
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'note': new_note.to_dict()
        }), HTTP_STATUS_CREATED
        
    except Exception as upload_error:
        db.session.rollback()
        return jsonify({'error': str(upload_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR

@upload_bp.route('/files/<filename>', methods=['GET'])
def download_file(filename):
    """
    Download a file by filename.
    
    Args:
        filename: Name of the file to download
        
    Returns:
        File download response or error message (500)
    """
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        return send_from_directory(
            upload_folder,
            filename,
            as_attachment=True
        )
    except Exception as download_error:
        return jsonify({'error': str(download_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@upload_bp.route('/list', methods=['GET'])
def list_files():
    """
    List all uploaded files, optionally filtered by topic or user.
    
    Query parameters:
        - topic_id: (optional) Filter by topic ID
        - user_id: (optional) Filter by user ID
    
    Returns:
        JSON response with list of notes (200) or error (500)
    """
    try:
        filter_topic_id = request.args.get('topic_id')
        filter_user_id = request.args.get('user_id')
        
        notes_query = Note.query
        
        # Apply filters if provided
        if filter_topic_id:
            notes_query = notes_query.filter_by(topic_id=filter_topic_id)
        
        if filter_user_id:
            notes_query = notes_query.filter_by(user_id=filter_user_id)
        
        # Order by upload date, most recent first
        all_notes = notes_query.order_by(Note.uploaded_at.desc()).all()
        
        return jsonify({
            'notes': [note.to_dict() for note in all_notes]
        }), HTTP_STATUS_OK
        
    except Exception as list_error:
        return jsonify({'error': str(list_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@upload_bp.route('/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """
    Get information about a specific note by ID.
    
    Args:
        note_id: ID of the note to retrieve
    
    Returns:
        JSON response with note information (200),
        or error if not found (404/500)
    """
    try:
        requested_note = Note.query.get(note_id)
        
        if not requested_note:
            return jsonify({'error': 'Note not found'}), HTTP_STATUS_NOT_FOUND
        
        return jsonify({'note': requested_note.to_dict()}), HTTP_STATUS_OK
        
    except Exception as retrieval_error:
        return jsonify({'error': str(retrieval_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@upload_bp.route('/<int:note_id>/upvote', methods=['POST'])
@jwt_required()
def upvote_note(note_id):
    """
    Upvote a note (requires authentication).
    
    Each user can only upvote a note once. The upvote count is
    automatically incremented on successful upvote.
    
    Args:
        note_id: ID of the note to upvote
    
    Requires: Valid JWT token in Authorization header
    
    Returns:
        JSON response with upvote status (200),
        or error if note not found (404/500)
    """
    try:
        authenticated_user_id = int(get_jwt_identity())
        
        note_to_upvote = Note.query.get(note_id)
        if not note_to_upvote:
            return jsonify({'error': 'Note not found'}), HTTP_STATUS_NOT_FOUND
        
        # Check if user already upvoted this note
        existing_upvote = Upvote.query.filter_by(
            user_id=authenticated_user_id,
            note_id=note_id
        ).first()
        
        if existing_upvote:
            return jsonify({
                'message': 'Already upvoted',
                'upvote_count': note_to_upvote.upvote_count,
                'already_upvoted': True
            }), HTTP_STATUS_OK
        
        # Create new upvote record
        new_upvote = Upvote(user_id=authenticated_user_id, note_id=note_id)
        db.session.add(new_upvote)
        
        # Increment upvote count on the note
        current_upvote_count = note_to_upvote.upvote_count or 0
        note_to_upvote.upvote_count = current_upvote_count + 1
        db.session.commit()
        
        return jsonify({
            'message': 'Upvoted successfully',
            'upvote_count': note_to_upvote.upvote_count,
            'already_upvoted': False
        }), HTTP_STATUS_OK
        
    except Exception as upvote_error:
        db.session.rollback()
        return jsonify({'error': str(upvote_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR

