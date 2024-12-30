import chromadb
import os

class VectorService:
    def __init__(self):
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection("research_data")
    
    def add_document(self, text: str, metadata: dict = None) -> str:
        # Generate a unique ID for the document
        doc_id = os.urandom(16).hex()
        
        # Add the document to the collection
        self.collection.add(
            documents=[text],
            metadatas=[metadata or {}],
            ids=[doc_id]
        )
        
        return doc_id
    
    def search_similar(self, query: str, n_results: int = 5):
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results

# Initialize the service
vector_service = VectorService()
