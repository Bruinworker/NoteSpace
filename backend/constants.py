"""
Application-wide constants for configuration values.

This module centralizes all magic numbers and configuration values
to improve code readability and maintainability.
"""

# File upload configuration
MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024  # 16MB maximum file size
UPLOAD_FOLDER_NAME = 'uploads'
ALLOWED_FILE_EXTENSIONS = {'pdf', 'docx', 'txt'}

# JWT token configuration
JWT_ACCESS_TOKEN_EXPIRY_HOURS = 24

# Text processing configuration
DEFAULT_MAX_CHUNK_SIZE_TOKENS = 8000  # Maximum tokens per chunk for LLM processing
DEFAULT_CHUNK_OVERLAP_TOKENS = 200  # Token overlap between chunks to maintain context

# Token estimation (when tiktoken is not available)
CHARACTERS_PER_TOKEN_ESTIMATE = 4  # Rough estimate: 1 token ≈ 4 characters

# LLM API configuration
DEFAULT_LLM_MODEL = "gpt-4-turbo-preview"
DEFAULT_LLM_TEMPERATURE = 0.7
DEFAULT_LLM_MAX_TOKENS = 4000

# HTTP status codes (for consistency)
HTTP_STATUS_OK = 200
HTTP_STATUS_CREATED = 201
HTTP_STATUS_BAD_REQUEST = 400
HTTP_STATUS_UNAUTHORIZED = 401
HTTP_STATUS_NOT_FOUND = 404
HTTP_STATUS_UNPROCESSABLE_ENTITY = 422
HTTP_STATUS_INTERNAL_SERVER_ERROR = 500

# Password validation
MIN_PASSWORD_LENGTH = 6

# Database defaults
DEFAULT_TOPIC_NAME = 'cs35l'

