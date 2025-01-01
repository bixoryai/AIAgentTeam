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
import time
import asyncio
from typing import Optional, Dict, Any

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

# Add port checking function
def is_port_in_use(port: int) -> bool:
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('0.0.0.0', port))
            return False
        except socket.error:
            return True

# Add rate limiting configuration
RATE_LIMIT_DELAY = 2  # seconds between requests
MAX_RETRIES = 3

async def get_research_data(topic: str, retries: int = 0) -> tuple[str, bool]:
    """Get research data with fallback mechanism"""
    try:
        if retries > 0:
            logger.info(f"Retry attempt {retries} for topic: {topic}")
            await asyncio.sleep(RATE_LIMIT_DELAY * (2 ** (retries - 1)))

        search_results = search_tool.run(
            f"latest trends and developments about {topic}"
        )
        return search_results, True

    except Exception as e:
        logger.error(f"Search attempt {retries + 1} failed: {str(e)}")
        if retries < MAX_RETRIES:
            return await get_research_data(topic, retries + 1)

        # If all retries failed, return fallback content
        fallback_content = f"""
        Key points about {topic}:
        1. This is an emerging topic in technology and innovation
        2. Many organizations and researchers are actively working in this area
        3. Recent developments show promising potential
        4. Industry experts predict significant growth
        5. There are both opportunities and challenges to consider
        """
        return fallback_content, False

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

        # Get research data with retries and fallback
        search_results, is_live_data = await get_research_data(request.topic)

        # Store in vector database if we have live data
        doc_id = os.urandom(16).hex()
        if is_live_data:
            try:
                collection.add(
                    documents=[search_results],
                    metadatas=[{"topic": request.topic}],
                    ids=[doc_id]
                )
                logger.info(f"Stored research data with ID: {doc_id}")
            except Exception as e:
                logger.error(f"Vector storage failed: {str(e)}")
                # Continue even if storage fails

        # Generate blog post
        try:
            logger.info("Creating blog chain...")
            blog_chain = LLMChain(llm=llm, prompt=research_prompt)

            # Add context about data source to instructions
            enhanced_instructions = request.instructions
            if not is_live_data:
                enhanced_instructions += "\nNote: Using general knowledge for content generation due to research limitations."

            logger.info("Running blog generation...")
            blog_post = blog_chain.run({
                "topic": request.topic,
                "word_count": request.word_count,
                "research_data": search_results,
                "instructions": enhanced_instructions
            })

            if not blog_post:
                raise ValueError("Generated blog post is empty")

            logger.info("Successfully generated blog post")
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

    except Exception as e:
        logger.error(f"Research process failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Research process failed: {str(e)}"
        )

class ConvertRequest(BaseModel):
    title: str
    content: str

@app.post("/api/convert")
async def convert_to_docx(request: ConvertRequest):
    try:
        logger.info(f"Converting content to DOCX: {request.title}")

        # Create a new Word document
        doc = Document()

        # Add title
        doc.add_heading(request.title, 0)

        # Convert markdown to HTML
        html = markdown.markdown(request.content)

        # Add content (simplified - just text)
        doc.add_paragraph(html)

        # Save to memory buffer
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        # Return the document
        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{request.title.replace(" ", "_")}.docx"'
            }
        )
    except Exception as e:
        logger.error(f"Failed to convert document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to convert document: {str(e)}"
        )

if __name__ == "__main__":
    PORT = 5001
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    for attempt in range(MAX_RETRIES):
        if not is_port_in_use(PORT):
            logger.info(f"Starting vector service on port {PORT}")
            uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
            break
        else:
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"Port {PORT} is in use, waiting {RETRY_DELAY} seconds before retry...")
                import time
                time.sleep(RETRY_DELAY)
            else:
                logger.error(f"Port {PORT} is still in use after {MAX_RETRIES} attempts")
                raise SystemExit(1)