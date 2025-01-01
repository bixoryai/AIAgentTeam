import chromadb
import os
from openai import OpenAI
import json
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import uvicorn
import logging
from docx import Document
from io import BytesIO
import markdown

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Verify OpenAI API key first
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.error("OPENAI_API_KEY environment variable is not set")
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Initialize OpenAI client
client = OpenAI(api_key=openai_api_key)

class ResearchRequest(BaseModel):
    topic: str
    word_count: int
    instructions: str = ""

app = FastAPI()

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
try:
    logger.info("Initializing ChromaDB...")
    # Use persistent directory for ChromaDB
    PERSIST_DIRECTORY = os.path.join(os.getcwd(), "chroma_db")
    os.makedirs(PERSIST_DIRECTORY, exist_ok=True)

    vector_store = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
    collection = vector_store.get_or_create_collection("research_data")
    logger.info("ChromaDB initialized successfully with persistent storage")

    logger.info("Initializing DuckDuckGo search...")
    search_tool = DuckDuckGoSearchAPIWrapper()
    logger.info("DuckDuckGo search initialized successfully")

    logger.info("Initializing OpenAI LLM...")
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        api_key=openai_api_key,
    )
    logger.info("OpenAI LLM initialized successfully")

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

@app.get("/health")
async def health_check():
    """Enhanced health check endpoint with detailed service status"""
    try:
        # Test vector store
        logger.info("Testing vector store connection...")
        try:
            collection.count()
            vector_store_status = "connected"
            logger.info("Vector store connection successful")
        except Exception as e:
            logger.error(f"Vector store connection failed: {str(e)}")
            vector_store_status = "error"
            raise ValueError(f"Vector store connection failed: {str(e)}")

        # Test OpenAI connection
        logger.info("Testing OpenAI connection...")
        try:
            client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "test"}]
            )
            llm_status = "connected"
            logger.info("OpenAI connection successful")
        except Exception as e:
            logger.error(f"OpenAI API connection failed: {str(e)}")
            llm_status = "error"
            raise ValueError(f"OpenAI API connection failed: {str(e)}")

        return {
            "status": "healthy",
            "services": {
                "vector_store": vector_store_status,
                "llm": llm_status,
                "search": "available"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )

@app.post("/api/research")
async def conduct_research(request: ResearchRequest):
    try:
        logger.info(f"Starting research for topic: {request.topic}")

        # Step 1: Web Research using DuckDuckGo
        logger.info("Starting web research...")
        try:
            search_results = search_tool.run(
                f"latest information statistics data research about {request.topic}"
            )
            logger.debug(f"Search results: {search_results[:200]}...")  # Log first 200 chars
            logger.info("Successfully completed web research")
        except Exception as e:
            logger.error(f"Web research failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Web research failed: {str(e)}"
            )

        # Step 2: Store in vector database
        try:
            doc_id = os.urandom(16).hex()
            collection.add(
                documents=[search_results],
                metadatas=[{"topic": request.topic}],
                ids=[doc_id]
            )
            logger.info(f"Stored research data with ID: {doc_id}")
        except Exception as e:
            logger.error(f"Vector storage failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Vector storage failed: {str(e)}"
            )

        # Step 3: Generate blog post using LangChain
        try:
            logger.info("Creating blog chain...")
            blog_chain = LLMChain(llm=llm, prompt=research_prompt)

            logger.info("Running blog generation...")
            blog_post = blog_chain.run({
                "topic": request.topic,
                "word_count": request.word_count,
                "research_data": search_results,
                "instructions": request.instructions
            })

            if not blog_post:
                logger.error("Generated blog post is empty")
                raise ValueError("Generated blog post is empty")

            logger.info("Successfully generated blog post")
            logger.debug(f"Blog post preview: {blog_post[:200]}...")  # Log first 200 chars

            return {
                "content": blog_post,
                "vector_id": doc_id,
                "research_data": search_results
            }
        except Exception as e:
            logger.error(f"Blog generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Blog generation failed: {str(e)}"
            )

    except HTTPException as e:
        logger.error(f"HTTP error in research process: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in research process: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Research process failed: {str(e)}"
        )

if __name__ == "__main__":
    PORT = 5001  # Use a fixed port
    logger.info(f"Starting vector service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")