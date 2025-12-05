"""
LLM service for text synthesis using OpenAI API.

This module provides functions for:
- Text chunking for LLM processing
- Synthesizing text chunks using OpenAI's API
- Token counting utilities
"""
import os
import httpx
from openai import OpenAI
from typing import List, Optional, Tuple
from backend.constants import (
    DEFAULT_MAX_CHUNK_SIZE_TOKENS,
    DEFAULT_CHUNK_OVERLAP_TOKENS,
    CHARACTERS_PER_TOKEN_ESTIMATE,
    DEFAULT_LLM_MODEL,
    DEFAULT_LLM_TEMPERATURE,
    DEFAULT_LLM_MAX_TOKENS
)

# Try to import tiktoken, but make it optional
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False


def get_openai_client() -> OpenAI:
    """
    Get OpenAI client, using API key from environment.
    
    Returns:
        Initialized OpenAI client instance
        
    Raises:
        ValueError: If OPENAI_API_KEY environment variable is not set
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    # Create httpx client without proxy to avoid proxy-related issues
    http_client = httpx.Client(proxy=None)
    return OpenAI(api_key=api_key, http_client=http_client)


def chunk_text(
    text: str,
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE_TOKENS,
    overlap: int = DEFAULT_CHUNK_OVERLAP_TOKENS
) -> List[str]:
    """
    Split text into chunks for LLM processing.
    
    Uses tiktoken for accurate token counting if available, otherwise
    falls back to character-based estimation.
    
    Args:
        text: Text to chunk into smaller pieces
        max_chunk_size: Maximum tokens per chunk (default: 8000)
        overlap: Number of tokens to overlap between chunks for context continuity (default: 200)
        
    Returns:
        List of text chunks ready for LLM processing
    """
    if not text:
        return []
    
    # Use tiktoken if available for accurate token counting
    if TIKTOKEN_AVAILABLE:
        try:
            token_encoding = tiktoken.encoding_for_model("gpt-4")
            encoded_tokens = token_encoding.encode(text)
            
            # If text fits in one chunk, return as-is
            if len(encoded_tokens) <= max_chunk_size:
                return [text]
            
            text_chunks = []
            chunk_start_index = 0
            
            while chunk_start_index < len(encoded_tokens):
                chunk_end_index = min(chunk_start_index + max_chunk_size, len(encoded_tokens))
                chunk_token_slice = encoded_tokens[chunk_start_index:chunk_end_index]
                decoded_chunk_text = token_encoding.decode(chunk_token_slice)
                text_chunks.append(decoded_chunk_text)
                
                # Move start position with overlap for context continuity
                chunk_start_index = chunk_end_index - overlap
            
            return text_chunks
        except Exception:
            # Fall through to character-based chunking if tiktoken fails
            pass
    
    # Fallback: character-based chunking using token estimation
    characters_per_chunk = max_chunk_size * CHARACTERS_PER_TOKEN_ESTIMATE
    characters_overlap = overlap * CHARACTERS_PER_TOKEN_ESTIMATE
    
    if len(text) <= characters_per_chunk:
        return [text]
    
    text_chunks = []
    chunk_start_index = 0
    
    while chunk_start_index < len(text):
        chunk_end_index = min(chunk_start_index + characters_per_chunk, len(text))
        chunk_text_content = text[chunk_start_index:chunk_end_index]
        text_chunks.append(chunk_text_content)
        
        # Move start position with overlap for context continuity
        chunk_start_index = chunk_end_index - characters_overlap
    
    return text_chunks


def synthesize_text_with_llm(chunks: List[str], topic_name: str) -> Tuple[Optional[str], Optional[str], int]:
    """
    Synthesize text chunks using LLM.
    
    Args:
        chunks: List of text chunks to synthesize
        topic_name: Name of the topic for context
        
    Returns:
        Tuple of (synthesized_text, error_message, total_tokens)
    """
    if not chunks:
        return None, "No text chunks provided", 0
    
    try:
        openai_client = get_openai_client()
        
        # Combine all chunks with clear separation for LLM processing
        chunk_separator = "\n\n---\n\n"
        numbered_chunks = [f"Chunk {chunk_index + 1}:\n{chunk_content}" 
                          for chunk_index, chunk_content in enumerate(chunks)]
        combined_chunks_text = chunk_separator.join(numbered_chunks)
        
        # Create prompt for synthesis
        synthesis_prompt = f"""You are a helpful assistant that synthesizes and summarizes educational content.

Given multiple document chunks related to the topic "{topic_name}", please:
1. Combine and synthesize the information into a coherent, comprehensive document
2. Remove redundancy while preserving important details
3. Organize the content logically
4. Maintain key concepts, definitions, and important information
5. Create a well-structured summary document

Here are the document chunks:

{combined_chunks_text}

Please provide a synthesized, comprehensive document that combines all the information above in a clear and organized manner."""

        # Call OpenAI API for text synthesis
        api_response = openai_client.chat.completions.create(
            model=DEFAULT_LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that synthesizes educational documents."},
                {"role": "user", "content": synthesis_prompt}
            ],
            temperature=DEFAULT_LLM_TEMPERATURE,
            max_tokens=DEFAULT_LLM_MAX_TOKENS
        )
        
        synthesized_content = api_response.choices[0].message.content
        total_tokens_used = api_response.usage.total_tokens if hasattr(api_response, 'usage') else 0
        
        return synthesized_content, None, total_tokens_used
        
    except Exception as api_error:
        error_message = f"Error calling LLM: {str(api_error)}"
        return None, error_message, 0


def count_tokens(text: str) -> int:
    """
    Count tokens in text using tiktoken if available, otherwise estimate.
    
    Args:
        text: Text to count tokens for
        
    Returns:
        Estimated or exact number of tokens in the text
    """
    if TIKTOKEN_AVAILABLE:
        try:
            token_encoding = tiktoken.encoding_for_model("gpt-4")
            encoded_tokens = token_encoding.encode(text)
            return len(encoded_tokens)
        except Exception:
            # Fall through to character-based estimation
            pass
    
    # Fallback: rough estimate using character-to-token ratio
    return len(text) // CHARACTERS_PER_TOKEN_ESTIMATE

