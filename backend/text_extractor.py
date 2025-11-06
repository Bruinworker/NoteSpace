"""
Text extraction service for PDF, DOCX, and TXT files
"""
import os
import PyPDF2
from docx import Document
from typing import Optional, Tuple


def extract_text_from_file(file_path: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract text from a file based on its extension.
    
    Args:
        file_path: Path to the file to extract text from
        
    Returns:
        Tuple of (extracted_text, error_message)
        Returns (None, error_message) if extraction fails
    """
    if not os.path.exists(file_path):
        return None, f"File not found: {file_path}"
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if file_ext == '.pdf':
            return extract_text_from_pdf(file_path)
        elif file_ext == '.docx':
            return extract_text_from_docx(file_path)
        elif file_ext == '.txt':
            return extract_text_from_txt(file_path)
        else:
            return None, f"Unsupported file type: {file_ext}"
    except Exception as e:
        return None, f"Error extracting text: {str(e)}"


def extract_text_from_pdf(file_path: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract text from PDF file."""
    try:
        text_content = []
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
        
        combined_text = '\n\n'.join(text_content)
        return combined_text, None
    except Exception as e:
        return None, f"Error reading PDF: {str(e)}"


def extract_text_from_docx(file_path: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract text from DOCX file."""
    try:
        doc = Document(file_path)
        text_content = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text)
        
        combined_text = '\n\n'.join(text_content)
        return combined_text, None
    except Exception as e:
        return None, f"Error reading DOCX: {str(e)}"


def extract_text_from_txt(file_path: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract text from TXT file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            text = file.read()
        return text, None
    except UnicodeDecodeError:
        # Try with different encoding
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                text = file.read()
            return text, None
        except Exception as e:
            return None, f"Error reading TXT file: {str(e)}"
    except Exception as e:
        return None, f"Error reading TXT file: {str(e)}"


def clean_text(text: str) -> str:
    """
    Clean and normalize extracted text.
    
    Args:
        text: Raw extracted text
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    import re
    # Replace multiple newlines with double newline
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Replace multiple spaces with single space
    text = re.sub(r' {2,}', ' ', text)
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split('\n')]
    # Remove empty lines
    lines = [line for line in lines if line]
    
    return '\n'.join(lines)

