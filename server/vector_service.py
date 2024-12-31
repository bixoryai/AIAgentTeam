import chromadb
import os
import openai
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatOpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Verify OpenAI API key first
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.error("OPENAI_API_KEY environment variable is not set")
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Configure OpenAI
openai.api_key = openai_api_key

class ResearchRequest(BaseModel):
    topic: str
    word_count: int
    instructions: str = ""

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services with proper error handling
try:
    # Initialize ChromaDB
    logger.info("Initializing ChromaDB...")
    vector_store = chromadb.Client()
    collection = vector_store.get_or_create_collection("research_data")
    logger.info("ChromaDB initialized successfully")

    # Initialize DuckDuckGo search
    logger.info("Initializing DuckDuckGo search...")
    search_tool = DuckDuckGoSearchAPIWrapper()
    logger.info("DuckDuckGo search initialized successfully")

    # Initialize OpenAI LLM
    logger.info("Initializing OpenAI LLM...")
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        openai_api_key=openai_api_key,
    )
    # Test the LLM connection
    llm.predict("test")
    logger.info("OpenAI LLM initialized and tested successfully")

except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

research_prompt = PromptTemplate(
    input_variables=["topic", "word_count", "research_data", "instructions"],
    template="""
    Write a blog post about {topic} with approximately {word_count} words.

    Use this research data as reference:
    {research_data}

    Additional instructions:
    {instructions}

    Important requirements:
    1. Make the content SEO-friendly with proper headings and structure
    2. Include relevant statistics and data from the research
    3. Write in a clear, engaging style
    4. Break down complex topics into digestible sections
    5. Add a compelling introduction and conclusion

    Format the blog post in markdown format.
    """
)

@app.post("/api/research")
async def conduct_research(request: ResearchRequest):
    try:
        logger.info(f"Starting research for topic: {request.topic}")

        # Step 1: Web Research using DuckDuckGo
        logger.info("Starting web research...")
        search_results = search_tool.run(
            f"latest information statistics data research about {request.topic}"
        )
        logger.info("Successfully completed web research")

        # Step 2: Store in vector database
        logger.info("Storing research data in vector database...")
        doc_id = os.urandom(16).hex()
        collection.add(
            documents=[search_results],
            metadatas=[{"topic": request.topic}],
            ids=[doc_id]
        )
        logger.info(f"Stored research data with ID: {doc_id}")

        # Step 3: Generate blog post using LangChain
        logger.info("Generating blog post...")
        blog_chain = LLMChain(llm=llm, prompt=research_prompt)

        blog_post = blog_chain.run({
            "topic": request.topic,
            "word_count": request.word_count,
            "research_data": search_results,
            "instructions": request.instructions
        })
        logger.info("Successfully generated blog post")

        return {
            "content": blog_post,
            "vector_id": doc_id,
            "research_data": search_results
        }

    except Exception as e:
        logger.error(f"Error in research process: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Research process failed: {str(e)}"
        )

@app.get("/health")
async def health_check():
    try:
        # Verify OpenAI API key
        if not openai_api_key:
            raise ValueError("OpenAI API key not found")

        # Test vector store
        logger.info("Testing vector store connection...")
        collection.count()
        logger.info("Vector store connection successful")

        # Test LLM connection
        logger.info("Testing OpenAI connection...")
        llm.predict("test")
        logger.info("OpenAI connection successful")

        return {
            "status": "healthy",
            "services": {
                "vector_store": "connected",
                "llm": "connected",
                "search": "available"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: {str(e)}"
        )

if __name__ == "__main__":
    logger.info("Starting vector service on port 5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")