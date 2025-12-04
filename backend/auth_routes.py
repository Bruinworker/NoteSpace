"""
Authentication routes for user registration, login, and logout.

This module handles all authentication-related endpoints including:
- User registration
- User login
- User logout
- Current user information retrieval
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.database import db
from backend.models import User
from backend.constants import (
    MIN_PASSWORD_LENGTH,
    HTTP_STATUS_OK,
    HTTP_STATUS_CREATED,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_UNAUTHORIZED,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user account.
    
    Creates a new user with the provided name, email, and password.
    Returns a JWT access token upon successful registration.
    
    Expected JSON payload:
        - name: User's full name
        - email: User's email address (must be unique)
        - password: User's password (minimum 6 characters)
    
    Returns:
        JSON response with access_token and user info on success (201),
        or error message on failure (400/500)
    """
    try:
        request_data = request.get_json()
        
        if not request_data:
            return jsonify({'error': 'No data provided'}), HTTP_STATUS_BAD_REQUEST
        
        user_name = request_data.get('name')
        user_email = request_data.get('email')
        user_password = request_data.get('password')
        
        # Validate required fields
        if not user_name or not user_email or not user_password:
            return jsonify({'error': 'Name, email, and password are required'}), HTTP_STATUS_BAD_REQUEST
        
        # Validate password length
        if len(user_password) < MIN_PASSWORD_LENGTH:
            return jsonify({'error': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'}), HTTP_STATUS_BAD_REQUEST
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=user_email).first()
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), HTTP_STATUS_BAD_REQUEST
        
        # Create new user
        new_user = User(name=user_name, email=user_email)
        new_user.set_password(user_password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Create access token (identity must be a string)
        access_token = create_access_token(identity=str(new_user.id))
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': new_user.to_dict()
        }), HTTP_STATUS_CREATED
        
    except Exception as registration_error:
        db.session.rollback()
        return jsonify({'error': str(registration_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate a user and return a JWT access token.
    
    Validates the user's email and password, then returns a JWT token
    for authenticated requests.
    
    Expected JSON payload:
        - email: User's email address
        - password: User's password
    
    Returns:
        JSON response with access_token and user info on success (200),
        or error message on failure (400/401/500)
    """
    try:
        request_data = request.get_json()
        
        if not request_data:
            return jsonify({'error': 'No data provided'}), HTTP_STATUS_BAD_REQUEST
        
        user_email = request_data.get('email')
        user_password = request_data.get('password')
        
        if not user_email or not user_password:
            return jsonify({'error': 'Email and password are required'}), HTTP_STATUS_BAD_REQUEST
        
        # Find user by email
        user = User.query.filter_by(email=user_email).first()
        
        # Verify password
        if not user or not user.check_password(user_password):
            return jsonify({'error': 'Invalid email or password'}), HTTP_STATUS_UNAUTHORIZED
        
        # Create access token (identity must be a string)
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), HTTP_STATUS_OK
        
    except Exception as login_error:
        return jsonify({'error': str(login_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout the current user.
    
    Note: With JWT, logout is typically handled on the client side by removing
    the token. This endpoint exists for consistency and can be extended with
    token blacklisting if needed.
    
    Requires: Valid JWT token in Authorization header
    
    Returns:
        JSON response confirming logout (200)
    """
    return jsonify({'message': 'Logout successful'}), HTTP_STATUS_OK


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get information about the currently authenticated user.
    
    Requires: Valid JWT token in Authorization header
    
    Returns:
        JSON response with user information on success (200),
        or error message if user not found (404/500)
    """
    try:
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), HTTP_STATUS_NOT_FOUND
        
        return jsonify({'user': current_user.to_dict()}), HTTP_STATUS_OK
        
    except Exception as retrieval_error:
        return jsonify({'error': str(retrieval_error)}), HTTP_STATUS_INTERNAL_SERVER_ERROR

