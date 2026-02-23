import os
import sys

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.embedding_service import FaceEmbeddingService

def run_embedding():
    print("Starting embedding generation for pending students...")
    results = FaceEmbeddingService.process_all_pending()
    print(f"Results: {results}")

if __name__ == "__main__":
    run_embedding()
