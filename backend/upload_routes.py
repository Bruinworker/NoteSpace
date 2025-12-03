from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from backend.database import db
from backend.models import Note, Topic, User, NoteUpvote
import os
import uuid

upload_bp = Blueprint('upload', __name__)

def allowed_file(filename):
    # Allow any file type - no restrictions
    return '.' in filename

@upload_bp.route('/', methods=['POST'])
def upload_file():
    try:
        # Get user_id if authenticated, otherwise None
        user_id = None
        try:
            # Try to get user_id from JWT token if present
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                # Use get_jwt_identity if token is valid
                from flask_jwt_extended import verify_jwt_in_request
                verify_jwt_in_request()
                user_id = get_jwt_identity()
        except Exception:
            # No auth token or invalid token - user_id stays None
            pass
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        topic_id = request.form.get('topic_id')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not topic_id:
            return jsonify({'error': 'Topic ID is required'}), 400
        
        # Validate topic exists
        topic = Topic.query.get(topic_id)
        if not topic:
            return jsonify({'error': 'Topic not found'}), 404
        
        # No file type validation - allow any file
        
        # Secure filename and create unique name
        original_filename = secure_filename(file.filename)
        if '.' in original_filename:
            file_ext = original_filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_ext}"
        else:
            unique_filename = f"{uuid.uuid4()}"
        
        # Save file
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Create note record
        note = Note(
            user_id=user_id,  # Can be None if not authenticated
            topic_id=topic_id,
            file_url=f"/api/upload/files/{unique_filename}",
            original_filename=original_filename,
            file_size=file_size
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'note': note.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/files/<filename>', methods=['GET'])
def download_file(filename):
    try:
        return send_from_directory(
            current_app.config['UPLOAD_FOLDER'],
            filename,
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/list', methods=['GET'])
def list_files():
    try:
        topic_id = request.args.get('topic_id')
        user_id = request.args.get('user_id')
        
        query = Note.query
        
        if topic_id:
            query = query.filter_by(topic_id=topic_id)
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        notes = query.order_by(Note.uploaded_at.desc()).all()
        
        return jsonify({
            'notes': [note.to_dict() for note in notes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/<int:note_id>', methods=['GET'])
def get_note(note_id):
    try:
        note = Note.query.get(note_id)
        
        if not note:
            return jsonify({'error': 'Note not found'}), 404

        # 🔹 Increment view counter
        note.view_count = (note.view_count or 0) + 1
        db.session.commit()
        
        return jsonify({'note': note.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/<int:note_id>/upvote', methods=['POST'])
@jwt_required()  # require login to upvote
def upvote_note(note_id):
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        note = Note.query.get(note_id)
        if not note:
            return jsonify({'error': 'Note not found'}), 404

        # Check if this user already upvoted this note
        existing = NoteUpvote.query.filter_by(
            note_id=note_id,
            user_id=user_id
        ).first()

        if existing:
            # Already upvoted → don't increment again
            return jsonify({
                'note_id': note.id,
                'upvote_count': note.upvote_count or 0,
                'already_upvoted': True
            }), 200

        # First time upvoting → record it + increment counter
        upvote = NoteUpvote(note_id=note_id, user_id=user_id)
        db.session.add(upvote)

        note.upvote_count = (note.upvote_count or 0) + 1
        db.session.commit()

        return jsonify({
            'note_id': note.id,
            'upvote_count': note.upvote_count,
            'already_upvoted': False
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

