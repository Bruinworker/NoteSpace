"""
Processing pipeline for extracting text, chunking, and synthesizing with LLM.

This module handles the complete pipeline for processing uploaded files:
1. Text extraction from various file formats
2. Text cleaning and combination
3. Chunking for LLM processing
4. Synthesis using LLM API
5. Saving results to database
"""
import os
import json
from typing import List, Dict, Optional, Tuple
from backend.database import db
from backend.models import Note, Topic, MetaDocument
from backend.text_extractor import extract_text_from_file, clean_text
from backend.llm_service import chunk_text, synthesize_text_with_llm, count_tokens
from backend.constants import DEFAULT_MAX_CHUNK_SIZE_TOKENS, DEFAULT_CHUNK_OVERLAP_TOKENS, UPLOAD_FOLDER_NAME


def _get_upload_folder_path(upload_folder: Optional[str] = None) -> str:
    """
    Get the upload folder path, using app config or default.
    
    Args:
        upload_folder: Optional explicit upload folder path
        
    Returns:
        Absolute path to upload folder
    """
    if upload_folder:
        return upload_folder
    
    try:
        from flask import current_app
        return current_app.config.get('UPLOAD_FOLDER', UPLOAD_FOLDER_NAME)
    except RuntimeError:
        # Not in app context, use project root
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(project_root, UPLOAD_FOLDER_NAME)


def _extract_filename_from_url(file_url: str) -> str:
    """
    Extract filename from file URL.
    
    Handles both full URLs and relative paths.
    
    Args:
        file_url: File URL or path
        
    Returns:
        Filename extracted from URL
    """
    api_prefix = '/api/upload/files/'
    if file_url.startswith(api_prefix):
        return file_url.replace(api_prefix, '')
    return os.path.basename(file_url)


def _extract_texts_from_notes(notes: List[Note], upload_folder_path: str) -> Tuple[List[str], List[str]]:
    """
    Extract and clean text from all notes.
    
    Args:
        notes: List of Note objects to extract text from
        upload_folder_path: Path to the upload folder
        
    Returns:
        Tuple of (extracted_texts_list, source_filenames_list)
    """
    extracted_texts = []
    source_filenames = []
    
    for note in notes:
        filename = _extract_filename_from_url(note.file_url)
        file_path = os.path.join(upload_folder_path, filename)
        
        extracted_text, extraction_error = extract_text_from_file(file_path)
        if extraction_error:
            print(f"Error extracting text from {note.original_filename}: {extraction_error}")
            continue
        
        if extracted_text:
            cleaned_text_content = clean_text(extracted_text)
            if cleaned_text_content:
                extracted_texts.append(cleaned_text_content)
                source_filenames.append(note.original_filename)
    
    return extracted_texts, source_filenames


def process_topic_files(topic_id: int, upload_folder: str = None) -> Dict[str, any]:
    """
    Process all files for a topic and create a meta document.
    
    Pipeline:
    1. Get all notes for the topic
    2. Extract text from each file
    3. Clean and combine text
    4. Chunk the combined text
    5. Send to LLM for synthesis
    6. Save meta document to database
    
    Args:
        topic_id: ID of the topic to process
        
    Returns:
        Dict with status and result/error message
    """
    try:
        # Get topic from database
        topic = Topic.query.get(topic_id)
        if not topic:
            return {'status': 'error', 'message': f'Topic {topic_id} not found'}
        
        # Get all notes for this topic
        topic_notes = Note.query.filter_by(topic_id=topic_id).all()
        if not topic_notes:
            return {'status': 'error', 'message': 'No files found for this topic'}
        
        # Create or update meta document record with processing status
        meta_document = MetaDocument.query.filter_by(
            topic_id=topic_id,
            processing_status='processing'
        ).first()
        
        if not meta_document:
            meta_document = MetaDocument(
                topic_id=topic_id,
                processing_status='processing',
                synthesized_content='',
                source_filenames='[]'
            )
            db.session.add(meta_document)
            db.session.commit()
        
        # Step 1: Extract text from all files
        upload_folder_path = _get_upload_folder_path(upload_folder)
        extracted_texts, source_filenames = _extract_texts_from_notes(topic_notes, upload_folder_path)
        
        if not extracted_texts:
            meta_document.processing_status = 'failed'
            meta_document.error_message = 'No text could be extracted from any files'
            db.session.commit()
            return {'status': 'error', 'message': 'No text could be extracted from any files'}
        
        # Step 2: Combine all extracted text with source markers
        text_separator = '\n\n---\n\n'
        combined_text = text_separator.join([
            f"Source: {source_filename}\n\n{extracted_text}" 
            for source_filename, extracted_text in zip(source_filenames, extracted_texts)
        ])
        
        # Step 3: Chunk the combined text for LLM processing
        text_chunks = chunk_text(
            combined_text,
            max_chunk_size=DEFAULT_MAX_CHUNK_SIZE_TOKENS,
            overlap=DEFAULT_CHUNK_OVERLAP_TOKENS
        )
        
        # Step 4: Synthesize with LLM
        synthesized_content, synthesis_error, total_tokens_used = synthesize_text_with_llm(
            text_chunks,
            topic.name
        )
        
        if synthesis_error:
            meta_document.processing_status = 'failed'
            meta_document.error_message = synthesis_error
            db.session.commit()
            return {'status': 'error', 'message': synthesis_error}
        
        # Step 5: Save synthesized content to database
        meta_document.synthesized_content = synthesized_content
        meta_document.source_filenames = json.dumps(source_filenames)
        meta_document.chunk_count = len(text_chunks)
        meta_document.token_count = total_tokens_used
        meta_document.processing_status = 'completed'
        meta_document.error_message = None
        
        db.session.commit()
        
        return {
            'status': 'success',
            'message': 'Meta document created successfully',
            'meta_document_id': meta_document.id,
            'chunk_count': len(text_chunks),
            'token_count': total_tokens_used
        }
        
    except Exception as processing_error:
        # Update meta document status on any error
        if 'meta_document' in locals():
            meta_document.processing_status = 'failed'
            meta_document.error_message = str(processing_error)
            db.session.commit()
        
        return {'status': 'error', 'message': f'Processing failed: {str(processing_error)}'}


def process_single_file(note_id: int) -> Dict[str, any]:
    """
    Process a single file and create a meta document.
    
    This function processes a single note by delegating to the topic-based
    processing function, which handles all files in the note's topic.
    
    Args:
        note_id: ID of the note to process
        
    Returns:
        Dict with status and result/error message
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return {'status': 'error', 'message': f'Note {note_id} not found'}
        
        # Delegate to topic-based processing (processes all files in the topic)
        return process_topic_files(note.topic_id)
        
    except Exception as processing_error:
        return {'status': 'error', 'message': f'Processing failed: {str(processing_error)}'}

