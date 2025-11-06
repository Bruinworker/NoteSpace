"""
LLM service for text synthesis using OpenAI API
"""
import os
from openai import OpenAI
from typing import List, Optional, Tuple

# Try to import tiktoken, but make it optional
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False


# Initialize OpenAI client
def get_openai_client():
    """Get OpenAI client, using API key from environment."""
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    return OpenAI(api_key=api_key)


def chunk_text(text: str, max_chunk_size: int = 8000, overlap: int = 200) -> List[str]:
    """
    Split text into chunks for processing.
    
    Args:
        text: Text to chunk
        max_chunk_size: Maximum tokens per chunk
        overlap: Number of tokens to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text:
        return []
    
    # Use tiktoken if available, otherwise use character-based estimation
    if TIKTOKEN_AVAILABLE:
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            tokens = encoding.encode(text)
            
            if len(tokens) <= max_chunk_size:
                return [text]
            
            chunks = []
            start = 0
            
            while start < len(tokens):
                end = min(start + max_chunk_size, len(tokens))
                chunk_tokens = tokens[start:end]
                chunk_text = encoding.decode(chunk_tokens)
                chunks.append(chunk_text)
                
                # Move start position with overlap
                start = end - overlap
            
            return chunks
        except Exception:
            # Fall through to character-based chunking if tiktoken fails
            pass
    
    # Fallback: character-based chunking (1 token ≈ 4 characters)
    char_chunk_size = max_chunk_size * 4
    char_overlap_size = overlap * 4
    
    if len(text) <= char_chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = min(start + char_chunk_size, len(text))
        chunk_text = text[start:end]
        chunks.append(chunk_text)
        
        # Move start position with overlap
        start = end - char_overlap_size
    
    return chunks


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
        client = get_openai_client()
        
        # Combine all chunks with clear separation
        combined_text = "\n\n---\n\n".join([f"Chunk {i+1}:\n{chunk}" for i, chunk in enumerate(chunks)])
        
        # Create prompt for synthesis
        prompt = f"""You are a helpful assistant that synthesizes and summarizes educational content.

Given multiple document chunks related to the topic "{topic_name}", please:
1. Combine and synthesize the information into a coherent, comprehensive document
2. Remove redundancy while preserving important details
3. Organize the content logically
4. Maintain key concepts, definitions, and important information
5. Create a well-structured summary document

Here are the document chunks:

{combined_text}

Please provide a synthesized, comprehensive document that combines all the information above in a clear and organized manner."""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # or "gpt-3.5-turbo" for cheaper option
            messages=[
                {"role": "system", "content": "You are a helpful assistant that synthesizes educational documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        synthesized_text = response.choices[0].message.content
        total_tokens = response.usage.total_tokens if hasattr(response, 'usage') else 0
        
        return synthesized_text, None, total_tokens
        
    except Exception as e:
        return None, f"Error calling LLM: {str(e)}", 0


def count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken if available, otherwise estimate."""
    if TIKTOKEN_AVAILABLE:
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            tokens = encoding.encode(text)
            return len(tokens)
        except Exception:
            # Fall through to character-based estimation
            pass
    
    # Fallback: rough estimate (1 token ≈ 4 characters)
    return len(text) // 4

