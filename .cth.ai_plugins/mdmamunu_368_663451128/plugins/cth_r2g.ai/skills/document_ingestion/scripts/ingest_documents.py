
from autobots_sdk.base.executors.knowledge_hub.local_rag import local_rag_ingest
import os
import shutil
import argparse
from pathlib import Path

def ingest_documents(input_paths, output_rag_directory=None):
    """
    Ingest documents into the local RAG knowledge base.
    
    Args:
        input_paths: List of document file paths to ingest (required).
        output_rag_directory: Path to save the RAG knowledge base. If None, uses default location.
    
    Returns:
        dict: Result containing 'documents_added' and 'db_path'
    """
    # Get the script directory
    script_dir = Path(__file__).parent
    
    # Determine output knowledge base path
    if output_rag_directory:
        kb_path = Path(output_rag_directory)
    else:
        kb_path = script_dir / "local_kb"
    
    # Remove the directory if it exists to ensure clean ingestion
    if kb_path.exists():
        print(f"Removing existing knowledge base at {kb_path}")
        shutil.rmtree(kb_path)
    
    # Process input files
    files = [str(Path(p).resolve()) for p in input_paths]
    print(f"Ingesting {len(files)} documents:")
    for f in files:
        print(f"  - {f}")

    result = local_rag_ingest(
        file_path=files,
        db_path=str(kb_path),
        chunk_size=1000,
        chunk_overlap=100,
    )

    print(f"\nIngestion complete!")
    print(f"Ingested {result['documents_added']} document chunks")
    print(f"Database saved at: {result['db_path']}")
    return result

def main():
    parser = argparse.ArgumentParser(
        description="Ingest local documents into SAGE RAG knowledge base",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single document
  python ingest_documents.py -input_paths "doc1.pdf"
  
  # Multiple documents (each as separate argument)
  python ingest_documents.py -input_paths "doc1.pdf" "doc2.txt" "doc3.asciidoc"
  
  # With custom output directory
  python ingest_documents.py -input_paths "doc1.pdf" "doc2.txt" -output_rag_directory "./my_kb"
        """
    )
    
    parser.add_argument(
        '-input_paths',
        nargs='+',
        required=True,
        metavar='PATH',
        help='One or more document paths to ingest'
    )
    
    parser.add_argument(
        '-output_rag_directory',
        metavar='DIR',
        help='Directory path where the RAG knowledge base will be saved'
    )
    
    args = parser.parse_args()
    
    ingest_documents(
        input_paths=args.input_paths,
        output_rag_directory=args.output_rag_directory
    )

if __name__ == "__main__":
    main()