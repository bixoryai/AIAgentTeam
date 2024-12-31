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

# Configure logging
logging.basicConfig(level=logging.INFO)
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

class ConvertRequest(BaseModel):
    title: str
    content: str

app = FastAPI()

# Add CORS middleware
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
    vector_store = chromadb.Client()
    collection = vector_store.get_or_create_collection("research_data")
    logger.info("ChromaDB initialized successfully")

    logger.info("Initializing DuckDuckGo search...")
    search_tool = DuckDuckGoSearchAPIWrapper()
    logger.info("DuckDuckGo search initialized successfully")

    logger.info("Initializing OpenAI LLM...")
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        api_key=openai_api_key,
    )
    llm.predict("test") #Added a test to ensure the LLM is working
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

@app.post("/api/convert")
async def convert_to_word(request: ConvertRequest):
    try:
        logger.info(f"Converting document: {request.title}")
        html_content = markdown.markdown(request.content)

        # Create Word document
        doc = Document()
        doc.add_heading(request.title, level=1)

        for para in request.content.split('\n\n'):
            if para.strip():
                if para.startswith('#'):
                    level = len(para.split()[0].strip('#'))
                    text = ' '.join(para.split()[1:])
                    doc.add_heading(text, level=min(level + 1, 9))
                else:
                    doc.add_paragraph(para.strip())

        doc_io = BytesIO()
        doc.save(doc_io)
        doc_io.seek(0)

        return Response(
            content=doc_io.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{request.title.replace(" ", "_")}.docx"'
            }
        )

    except Exception as e:
        logger.error(f"Failed to convert document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document conversion failed: {str(e)}")

@app.get("/health")
async def health_check():
    try:
        # Test vector store
        logger.info("Testing vector store connection...")
        try:
            collection.count()
            logger.info("Vector store connection successful")
        except Exception as e:
            raise ValueError(f"Vector store connection failed: {str(e)}")

        # Test OpenAI connection
        logger.info("Testing OpenAI connection...")
        try:
            client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "test"}]
            )
            logger.info("OpenAI connection successful")
        except Exception as e:
            raise ValueError(f"OpenAI API connection failed: {str(e)}")

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
            detail=str(e)
        )

if __name__ == "__main__":
    logger.info("Starting vector service on port 5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")