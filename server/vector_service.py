import chromadb
import os
from openai import OpenAI
import json
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatOpenAI
from langchain.agents import AgentExecutor, Tool, create_react_agent
from langchain.memory import ConversationBufferMemory
from langchain.tools.base import ToolException
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import uvicorn
import logging
from docx import Document
from io import BytesIO
import markdown
from typing import List, Optional
import asyncio
from datetime import datetime

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

    logger.info("Initializing LangChain components...")
    # Initialize search tool with enhanced capabilities
    search_tool = DuckDuckGoSearchAPIWrapper()

    # Initialize LLM with memory
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        api_key=openai_api_key,
    )

    # Create memory for context retention
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )

    # Define enhanced tools
    tools = [
        Tool(
            name="web_search",
            func=search_tool.run,
            description="Search the internet for current information about a topic",
            return_direct=True,
        ),
        Tool(
            name="fact_check",
            func=lambda x: validate_facts(x, llm),
            description="Validate facts and claims in the content",
        ),
        Tool(
            name="content_quality",
            func=lambda x: assess_content_quality(x, llm),
            description="Assess and improve content quality",
        ),
    ]

    # Create agent with tools
    agent = create_react_agent(
        llm=llm,
        tools=tools,
        prompt=PromptTemplate.from_template(
            """You are an expert research agent.
            Available tools: {tools}
            Previous steps: {agent_scratchpad}
            Tool names: {tool_names}

            Task: {input}

            Think step by step about how to approach this.
            Always use tools when available and return ONLY researched information."""
        )
    )
    agent_executor = AgentExecutor.from_agent_and_tools(
        agent=agent,
        tools=tools,
        memory=memory,
        max_iterations=5,
        verbose=True
    )

    logger.info("LangChain components initialized successfully")

except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# Helper functions for tools
async def validate_facts(content: str, llm) -> str:
    try:
        prompt = PromptTemplate(
            template="Verify the following content for factual accuracy:\n{content}\n\nProvide a verification report:",
            input_variables=["content"]
        )
        chain = LLMChain(llm=llm, prompt=prompt)
        return await chain.arun(content=content)
    except Exception as e:
        raise ToolException(f"Fact validation failed: {str(e)}")

async def assess_content_quality(content: str, llm) -> str:
    try:
        prompt = PromptTemplate(
            template="Assess the quality of this content and suggest improvements:\n{content}",
            input_variables=["content"]
        )
        chain = LLMChain(llm=llm, prompt=prompt)
        return await chain.arun(content=content)
    except Exception as e:
        raise ToolException(f"Quality assessment failed: {str(e)}")

# Enhanced research prompt with better structure
research_prompt = PromptTemplate(
    input_variables=["topic", "word_count", "research_data", "instructions"],
    template="""
    Write a comprehensive blog post about {topic} with approximately {word_count} words.

    Research Data:
    {research_data}

    Special Instructions:
    {instructions}

    Requirements:
    1. Ensure factual accuracy and cite sources where appropriate
    2. Structure content with clear headings (use markdown)
    3. Include relevant statistics and data
    4. Balance depth with readability
    5. Maintain SEO-friendly formatting
    6. Add compelling introduction and conclusion
    7. Include key takeaways or actionable insights

    Format the content in clean markdown.
    """
)

@app.post("/api/research")
async def conduct_research(request: ResearchRequest):
    try:
        logger.info(f"Starting research for topic: {request.topic}")

        # Step 1: Use agent for comprehensive research
        research_result = await agent_executor.arun(
            f"Research the latest information about {request.topic}. "
            f"Focus on recent developments, statistics, and expert insights."
        )
        logger.info("Initial research completed")

        # Step 2: Store in vector database with metadata
        doc_id = os.urandom(16).hex()
        collection.add(
            documents=[research_result],
            metadatas=[{
                "topic": request.topic,
                "timestamp": datetime.now().isoformat(),
                "type": "research"
            }],
            ids=[doc_id]
        )
        logger.info(f"Research data stored with ID: {doc_id}")

        # Step 3: Generate and validate content
        blog_chain = LLMChain(llm=llm, prompt=research_prompt)
        blog_post = await blog_chain.arun({
            "topic": request.topic,
            "word_count": request.word_count,
            "research_data": research_result,
            "instructions": request.instructions
        })
        logger.info("Initial content generated")

        # Step 4: Quality assessment and fact checking
        quality_report = await assess_content_quality(blog_post, llm)
        fact_check = await validate_facts(blog_post, llm)
        logger.info("Content validated and quality checked")

        return {
            "content": blog_post,
            "vector_id": doc_id,
            "research_data": research_result,
            "metadata": {
                "quality_report": quality_report,
                "fact_check": fact_check
            }
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

if __name__ == "__main__":
    logger.info("Starting vector service on port 5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")