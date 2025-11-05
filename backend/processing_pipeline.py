"""
Processing pipeline for extracting text, chunking, and synthesizing with LLM
"""
import os
import json
from typing import List, Dict, Optional
from backend.database import db
from backend.models import Note, Topic, MetaDocument
from backend.text_extractor import extract_text_from_file, clean_text
from backend.llm_service import chunk_text, synthesize_text_with_llm, count_tokens


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
        # Get topic
        topic = Topic.query.get(topic_id)
        if not topic:
            return {'status': 'error', 'message': f'Topic {topic_id} not found'}
        
        # Get all notes for this topic
        notes = Note.query.filter_by(topic_id=topic_id).all()
        if not notes:
            return {'status': 'error', 'message': 'No files found for this topic'}
        
        # Create or update meta document record
        meta_doc = MetaDocument.query.filter_by(topic_id=topic_id, processing_status='processing').first()
        if not meta_doc:
            meta_doc = MetaDocument(
                topic_id=topic_id,
                processing_status='processing',
                synthesized_content='',
                source_filenames='[]'
            )
            db.session.add(meta_doc)
            db.session.commit()
        
        # Step 1: Extract text from all files
        extracted_texts = []
        source_filenames = []
        
        for note in notes:
            # Get file path from URL
            file_url = note.file_url
            # Remove /api/upload/files/ prefix to get filename
            if file_url.startswith('/api/upload/files/'):
                filename = file_url.replace('/api/upload/files/', '')
            else:
                filename = os.path.basename(file_url)
            
            # Get upload folder path
            if not upload_folder:
                try:
                    from flask import current_app
                    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
                except RuntimeError:
                    # Not in app context, use project root
                    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    upload_folder = os.path.join(project_root, 'uploads')
            
            file_path = os.path.join(upload_folder, filename)
            
            # Extract text
            text, error = extract_text_from_file(file_path)
            if error:
                print(f"Error extracting text from {note.original_filename}: {error}")
                continue
            
            if text:
                cleaned_text = clean_text(text)
                if cleaned_text:
                    extracted_texts.append(cleaned_text)
                    source_filenames.append(note.original_filename)
        
        if not extracted_texts:
            meta_doc.processing_status = 'failed'
            meta_doc.error_message = 'No text could be extracted from any files'
            db.session.commit()
            return {'status': 'error', 'message': 'No text could be extracted from any files'}
        
        # Step 2: Combine all extracted text
        combined_text = '\n\n---\n\n'.join([
            f"Source: {filename}\n\n{text}" 
            for filename, text in zip(source_filenames, extracted_texts)
        ])
        
        # Step 3: Chunk the combined text
        chunks = chunk_text(combined_text, max_chunk_size=8000, overlap=200)
        
        # Step 4: Synthesize with LLM
        synthesized_text, error, total_tokens = synthesize_text_with_llm(chunks, topic.name)
        
        if error:
            meta_doc.processing_status = 'failed'
            meta_doc.error_message = error
            db.session.commit()
            return {'status': 'error', 'message': error}
        
        # Step 5: Save to database
        meta_doc.synthesized_content = synthesized_text
        meta_doc.source_filenames = json.dumps(source_filenames)
        meta_doc.chunk_count = len(chunks)
        meta_doc.token_count = total_tokens
        meta_doc.processing_status = 'completed'
        meta_doc.error_message = None
        
        db.session.commit()
        
        return {
            'status': 'success',
            'message': 'Meta document created successfully',
            'meta_document_id': meta_doc.id,
            'chunk_count': len(chunks),
            'token_count': total_tokens
        }
        
    except Exception as e:
        # Update meta document status
        if 'meta_doc' in locals():
            meta_doc.processing_status = 'failed'
            meta_doc.error_message = str(e)
            db.session.commit()
        
        return {'status': 'error', 'message': f'Processing failed: {str(e)}'}


def process_single_file(note_id: int) -> Dict[str, any]:
    """
    Process a single file and create a meta document.
    
    Args:
        note_id: ID of the note to process
        
    Returns:
        Dict with status and result/error message
    """
    try:
        note = Note.query.get(note_id)
        if not note:
            return {'status': 'error', 'message': f'Note {note_id} not found'}
        
        # Use the topic-based processing
        return process_topic_files(note.topic_id)
        
    except Exception as e:
        return {'status': 'error', 'message': f'Processing failed: {str(e)}'}

