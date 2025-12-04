/**
 * Application-wide constants.
 * 
 * This module centralizes all configuration values and magic numbers
 * to improve code readability and maintainability.
 */

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || (window.location.origin + '/api');

// View Types
export const VIEW_TYPES = {
  UPLOAD: 'upload',
  LIST: 'list',
  META_DOCUMENTS: 'meta-documents'
};

// Status Messages
export const STATUS_MESSAGES = {
  UPLOAD_SUCCESS: 'Upload successful!',
  UPLOAD_FAILED: 'Upload failed',
  TOPIC_CREATED: 'Topic created successfully!',
  NO_FILE_SELECTED: 'No file selected',
  SELECT_TOPIC_FIRST: 'Please select a topic first',
  NO_FILES_UPLOADED: 'No files uploaded yet.',
  NO_TOPICS_AVAILABLE: 'No topics available. Create a topic first.',
  PROCESSING_STARTED: 'Processing started! This may take a few moments. Check back in a bit.',
  DOWNLOAD_FAILED: 'Failed to download document',
  PROCESSING_FAILED: 'Failed to start processing'
};

// Processing Status
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

