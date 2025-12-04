"""
Topic management routes.

This module handles CRUD operations for topics/courses:
- Listing all topics
- Creating new topics
- Retrieving topic details
"""
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Topic
from backend.constants import (
    HTTP_STATUS_OK,
    HTTP_STATUS_CREATED,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
)
from datetime import datetime

topic_bp = Blueprint('topics', __name__)


@topic_bp.route('/', methods=['GET'])
def list_topics():
    """
    List all topics ordered by creation date (newest first).
    
    Returns:
        JSON response with list of all topics (200) or error (500)
    """
    try:
        all_topics = Topic.query.order_by(Topic.created_at.desc()).all()
        return jsonify({
            'topics': [topic.to_dict() for topic in all_topics]
        }), HTTP_STATUS_OK
    except Exception as list_error:
        return jsonify({'error': str(list_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@topic_bp.route('/', methods=['POST'])
def create_topic():
    """
    Create a new topic.
    
    Expected JSON payload:
        - name: Topic name (required)
        - deadline: Optional deadline in ISO format (YYYY-MM-DDTHH:MM:SS)
    
    Returns:
        JSON response with created topic info (201),
        or error message on failure (400/500)
    """
    try:
        request_data = request.get_json()
        
        if not request_data:
            return jsonify({'error': 'No data provided'}), HTTP_STATUS_BAD_REQUEST
        
        topic_name = request_data.get('name')
        deadline_string = request_data.get('deadline')
        
        # Validate topic name is provided
        if not topic_name:
            return jsonify({'error': 'Topic name is required'}), HTTP_STATUS_BAD_REQUEST
        
        # Parse deadline if provided
        deadline_datetime = None
        if deadline_string:
            try:
                # Handle ISO format with or without timezone
                deadline_string_normalized = deadline_string.replace('Z', '+00:00')
                deadline_datetime = datetime.fromisoformat(deadline_string_normalized)
            except ValueError:
                return jsonify({'error': 'Invalid deadline format. Use ISO format.'}), HTTP_STATUS_BAD_REQUEST
        
        # Create new topic
        new_topic = Topic(name=topic_name, deadline=deadline_datetime)
        db.session.add(new_topic)
        db.session.commit()
        
        return jsonify({
            'message': 'Topic created successfully',
            'topic': new_topic.to_dict()
        }), HTTP_STATUS_CREATED
        
    except Exception as creation_error:
        db.session.rollback()
        return jsonify({'error': str(creation_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@topic_bp.route('/<int:topic_id>', methods=['GET'])
def get_topic(topic_id):
    """
    Get information about a specific topic by ID.
    
    Args:
        topic_id: ID of the topic to retrieve
    
    Returns:
        JSON response with topic information (200),
        or error if not found (404/500)
    """
    try:
        requested_topic = Topic.query.get(topic_id)
        
        if not requested_topic:
            return jsonify({'error': 'Topic not found'}), HTTP_STATUS_NOT_FOUND
        
        return jsonify({'topic': requested_topic.to_dict()}), HTTP_STATUS_OK
        
    except Exception as retrieval_error:
        return jsonify({'error': str(retrieval_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR

