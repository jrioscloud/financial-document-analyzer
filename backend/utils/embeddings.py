"""
Financial Document Analyzer - Embedding Generation
Generate and store embeddings using OpenAI API
"""

import os
from typing import List, Optional
from openai import OpenAI

# Initialize OpenAI client
client = None

def get_client() -> OpenAI:
    """Get or create OpenAI client."""
    global client
    if client is None:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client


def generate_embedding(text: str, model: str = None) -> List[float]:
    """
    Generate embedding for a single text.

    Args:
        text: Text to embed
        model: Embedding model (default: from env or text-embedding-3-small)

    Returns:
        Embedding vector as list of floats
    """
    model = model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    response = get_client().embeddings.create(
        model=model,
        input=text
    )

    return response.data[0].embedding


def generate_embeddings_batch(
    texts: List[str],
    model: str = None,
    batch_size: int = 100
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts with batching.

    OpenAI has limits on batch size, so we chunk the requests.

    Args:
        texts: List of texts to embed
        model: Embedding model (default: from env or text-embedding-3-small)
        batch_size: Max texts per API call (default: 100)

    Returns:
        List of embedding vectors
    """
    model = model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    all_embeddings = []

    # Process in batches
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        response = get_client().embeddings.create(
            model=model,
            input=batch
        )

        # Extract embeddings in order
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def embed_transactions(
    transactions,
    text_field: str = "description"
) -> List[dict]:
    """
    Add embeddings to transaction records.

    Args:
        transactions: List of transaction dicts OR ParsedTransaction objects
        text_field: Field to embed (default: 'description')

    Returns:
        List of transaction dicts with 'embedding' field added
    """
    from dataclasses import asdict, is_dataclass

    # Convert to dicts if needed (handles ParsedTransaction dataclass)
    txn_dicts = []
    for txn in transactions:
        if is_dataclass(txn):
            txn_dict = asdict(txn)
        elif hasattr(txn, '__dict__'):
            txn_dict = dict(txn.__dict__)
        else:
            txn_dict = dict(txn)
        txn_dicts.append(txn_dict)

    # Extract texts to embed
    texts = [txn.get(text_field, "") for txn in txn_dicts]

    # Generate embeddings in batch
    embeddings = generate_embeddings_batch(texts)

    # Add embeddings to transactions
    for txn, embedding in zip(txn_dicts, embeddings):
        txn["embedding"] = embedding

    return txn_dicts


def format_embedding_for_pgvector(embedding: List[float]) -> str:
    """
    Format embedding vector for pgvector insertion.

    pgvector expects format: '[0.1, 0.2, 0.3, ...]'

    Args:
        embedding: List of floats

    Returns:
        String formatted for pgvector
    """
    return "[" + ",".join(str(x) for x in embedding) + "]"
