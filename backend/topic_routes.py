from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Topic
from datetime import datetime

topic_bp = Blueprint('topics', __name__)

@topic_bp.route('/', methods=['GET'])
def list_topics():
    try:
        topics = Topic.query.order_by(Topic.created_at.desc()).all()
        return jsonify({
            'topics': [topic.to_dict() for topic in topics]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@topic_bp.route('/', methods=['POST'])
def create_topic():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name')
        deadline_str = data.get('deadline')
        
        if not name:
            return jsonify({'error': 'Topic name is required'}), 400
        
        # Parse deadline if provided
        deadline = None
        if deadline_str:
            try:
                deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid deadline format. Use ISO format.'}), 400
        
        # Create topic
        topic = Topic(name=name, deadline=deadline)
        db.session.add(topic)
        db.session.commit()
        
        return jsonify({
            'message': 'Topic created successfully',
            'topic': topic.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@topic_bp.route('/<int:topic_id>', methods=['GET'])
def get_topic(topic_id):
    try:
        topic = Topic.query.get(topic_id)
        
        if not topic:
            return jsonify({'error': 'Topic not found'}), 404
        
        return jsonify({'topic': topic.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

