import chromadb
import os
from langchain.agents import AgentType, initialize_agent
from langchain.chains import LLMChain
from langchain.tools import DuckDuckGoSearchRun
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.chat_models import ChatOpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not os.getenv("OPENAI_API_KEY"):
    logger.error("OPENAI_API_KEY environment variable is not set")
    raise ValueError("OPENAI_API_KEY environment variable is required")

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

# Initialize services
try:
    vector_store = chromadb.Client()
    collection = vector_store.get_or_create_collection("research_data")
    search_tool = DuckDuckGoSearchRun()
    logger.info("Successfully initialized vector store and search tool")
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

    Format the blog post in a professional, engaging style with proper headings and paragraphs.
    """
)

@app.post("/api/research")
async def conduct_research(request: ResearchRequest):
    try:
        logger.info(f"Starting research for topic: {request.topic}")

        # Step 1: Web Research
        search_results = search_tool.run(f"latest information about {request.topic}")
        logger.info("Successfully completed web research")

        # Step 2: Store in vector database
        doc_id = os.urandom(16).hex()
        collection.add(
            documents=[search_results],
            metadatas=[{"topic": request.topic}],
            ids=[doc_id]
        )
        logger.info(f"Stored research data with ID: {doc_id}")

        # Step 3: Generate blog post
        llm = ChatOpenAI(temperature=0.7)  # Add some creativity
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    logger.info("Starting vector service on port 5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")