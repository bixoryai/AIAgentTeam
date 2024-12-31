import chromadb
import os
from openai import OpenAI
import json
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatOpenAI
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

class TopicRequest(BaseModel):
    seed_topic: str | None = None
    style: str
    count: int = 5

class TopicValidationRequest(BaseModel):
    topic: str
    style: str

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
    llm.predict("test")
    logger.info("OpenAI LLM initialized and tested successfully")

except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# Add new route for document conversion
@app.post("/api/convert")
async def convert_to_word(request: ConvertRequest):
    try:
        logger.info(f"Converting document: {request.title}")

        # Convert markdown to HTML for better formatting
        html_content = markdown.markdown(request.content)

        # Create a new Word document
        doc = Document()

        # Add title
        doc.add_heading(request.title, level=1)

        # Add content - split by paragraphs
        paragraphs = request.content.split('\n\n')
        for para in paragraphs:
            if para.strip():
                # Check if paragraph is a heading (starts with #)
                if para.startswith('#'):
                    level = len(para.split()[0].strip('#'))
                    text = ' '.join(para.split()[1:])
                    doc.add_heading(text, level=min(level + 1, 9))
                else:
                    doc.add_paragraph(para.strip())

        # Save document to memory
        doc_io = BytesIO()
        doc.save(doc_io)
        doc_io.seek(0)

        # Return the document with appropriate headers
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

@app.post("/api/suggest-topics")
async def suggest_topics(request: TopicRequest):
    try:
        logger.info(f"Generating topic suggestions based on: {request.seed_topic}")

        # Build the system message for consistent JSON output
        system_message = """You are a professional blog topic curator. 
Your responses must be valid JSON arrays containing objects with 'title' and 'description' fields.
Each suggestion should be unique and creative."""

        # Generate prompt for topic suggestions
        user_message = f"""Generate {request.count} blog post topic suggestions 
{"related to " + request.seed_topic if request.seed_topic else "on trending subjects"}
in a {request.style} style.

Each topic should be:
1. Specific and focused
2. Engaging and relevant to current trends
3. Suitable for the specified {request.style} writing style
4. Different enough from each other to provide variety

Respond with ONLY a JSON array of objects, each containing 'title' and 'description' fields.
Example format:
[
    {{
        "title": "The Future of AI in Healthcare",
        "description": "Exploring how artificial intelligence is revolutionizing medical diagnosis and treatment"
    }}
]"""

        # Use OpenAI to generate suggestions using new API format
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"}
        )

        # Parse JSON response
        try:
            response_content = completion.choices[0].message.content
            logger.info(f"OpenAI response: {response_content}")
            suggestions = json.loads(response_content)

            # Ensure the response is a list
            if isinstance(suggestions, dict) and "suggestions" in suggestions:
                suggestions = suggestions["suggestions"]
            elif not isinstance(suggestions, list):
                suggestions = [suggestions]

            return suggestions[:request.count]  # Limit to requested count

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response: {str(e)}")
            # Fallback to default suggestions
            return [
                {
                    "title": f"Latest Trends in {request.style.capitalize()} Writing",
                    "description": "Explore current trends and best practices in content creation."
                }
            ]

    except Exception as e:
        logger.error(f"Failed to generate topic suggestions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Topic suggestion failed: {str(e)}"
        )

@app.post("/api/validate-topic")
async def validate_topic(request: TopicValidationRequest):
    try:
        logger.info(f"Validating topic: {request.topic}")

        # Generate prompt for topic validation
        prompt = f"""
        Analyze this blog post topic: "{request.topic}"

        Consider:
        1. Clarity and specificity
        2. Audience engagement potential
        3. Suitability for {request.style} style
        4. SEO potential

        Return a JSON object with:
        - isValid: boolean
        - feedback: string (constructive feedback or suggestions)
        """

        # Use OpenAI to validate using new API format
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a blog topic analysis expert."},
                {"role": "user", "content": prompt}
            ]
        )

        return completion.choices[0].message.content

    except Exception as e:
        logger.error(f"Failed to validate topic: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Topic validation failed: {str(e)}"
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
        try:
            collection.count()
            logger.info("Vector store connection successful")
        except Exception as e:
            raise ValueError(f"Vector store connection failed: {str(e)}")

        # Test OpenAI connection
        logger.info("Testing OpenAI connection...")
        try:
            # Test OpenAI connection using new API format
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

if __name__ == "__main__":
    logger.info("Starting vector service on port 5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")