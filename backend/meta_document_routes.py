"""
API routes for meta document processing and retrieval
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.database import db
from backend.models import MetaDocument, Topic, Note
from backend.processing_pipeline import process_topic_files, process_single_file
import io
import json

meta_document_bp = Blueprint('meta_document', __name__)


@meta_document_bp.route('/process/topic/<int:topic_id>', methods=['POST'])
def process_topic(topic_id):
    """
    Trigger processing of all files for a topic.
    Creates or updates a meta document.
    """
    try:
        from flask import current_app
        
        # Verify topic exists
        topic = Topic.query.get(topic_id)
        if not topic:
            return jsonify({'error': 'Topic not found'}), 404
        
        # Get upload folder from app config
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        
        # Process files
        result = process_topic_files(topic_id, upload_folder=upload_folder)
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify({
            'message': 'Processing started successfully',
            'result': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/process/note/<int:note_id>', methods=['POST'])
def process_note(note_id):
    """
    Trigger processing of a single file.
    """
    try:
        # Verify note exists
        note = Note.query.get(note_id)
        if not note:
            return jsonify({'error': 'Note not found'}), 404
        
        # Process file (uses topic-based processing)
        result = process_single_file(note_id)
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify({
            'message': 'Processing started successfully',
            'result': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/topic/<int:topic_id>', methods=['GET'])
def get_meta_document_by_topic(topic_id):
    """
    Get meta document for a topic.
    """
    try:
        meta_doc = MetaDocument.query.filter_by(topic_id=topic_id).order_by(
            MetaDocument.created_at.desc()
        ).first()
        
        if not meta_doc:
            return jsonify({'error': 'Meta document not found for this topic'}), 404
        
        return jsonify({
            'meta_document': meta_doc.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/<int:meta_document_id>', methods=['GET'])
def get_meta_document(meta_document_id):
    """
    Get a specific meta document by ID.
    """
    try:
        meta_doc = MetaDocument.query.get(meta_document_id)
        
        if not meta_doc:
            return jsonify({'error': 'Meta document not found'}), 404
        
        return jsonify({
            'meta_document': meta_doc.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/list', methods=['GET'])
def list_meta_documents():
    """
    List all meta documents, optionally filtered by topic.
    """
    try:
        topic_id = request.args.get('topic_id', type=int)
        
        query = MetaDocument.query
        
        if topic_id:
            query = query.filter_by(topic_id=topic_id)
        
        meta_docs = query.order_by(MetaDocument.created_at.desc()).all()
        
        return jsonify({
            'meta_documents': [doc.to_dict() for doc in meta_docs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/<int:meta_document_id>/download', methods=['GET'])
def download_meta_document(meta_document_id):
    """
    Download meta document as a text file.
    """
    try:
        meta_doc = MetaDocument.query.get(meta_document_id)
        
        if not meta_doc:
            return jsonify({'error': 'Meta document not found'}), 404
        
        if meta_doc.processing_status != 'completed':
            return jsonify({'error': 'Meta document is not ready for download'}), 400
        
        # Create text file in memory
        filename = f"meta_document_topic_{meta_doc.topic_id}.txt"
        content = f"Meta Document - Topic: {meta_doc.topic_name or meta_doc.topic_id}\n"
        content += f"Source Files: {', '.join(json.loads(meta_doc.source_filenames))}\n"
        content += f"Created: {meta_doc.created_at}\n"
        content += f"{'='*80}\n\n"
        content += meta_doc.synthesized_content
        
        # Create file-like object
        file_obj = io.BytesIO(content.encode('utf-8'))
        
        return send_file(
            file_obj,
            mimetype='text/plain',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meta_document_bp.route('/<int:meta_document_id>/status', methods=['GET'])
def get_meta_document_status(meta_document_id):
    """
    Get processing status of a meta document.
    """
    try:
        meta_doc = MetaDocument.query.get(meta_document_id)
        
        if not meta_doc:
            return jsonify({'error': 'Meta document not found'}), 404
        
        return jsonify({
            'id': meta_doc.id,
            'topic_id': meta_doc.topic_id,
            'processing_status': meta_doc.processing_status,
            'error_message': meta_doc.error_message,
            'created_at': meta_doc.created_at.isoformat(),
            'updated_at': meta_doc.updated_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

