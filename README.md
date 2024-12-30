# AI Content Creation Platform

A powerful AI-powered content creation platform that automates research and blog writing processes through intelligent workflow management. The application leverages cutting-edge AI technologies to streamline content generation with robust research capabilities.

## Features

- 🤖 AI Agent Dashboard with card-style interface
- 📝 Automated blog post generation using RAG (Retrieval Augmented Generation)
- 🔍 Web research capabilities using DuckDuckGo
- 📊 Vector database storage for efficient information retrieval
- 💾 PostgreSQL database for persistent storage
- 🎨 Modern, responsive UI with shadcn/ui components

## Tech Stack

### Frontend
- React + TypeScript
- TailwindCSS for styling
- shadcn/ui component library
- Tanstack React Query for data fetching
- Wouter for routing

### Backend
- Express.js server
- FastAPI Python service for AI operations
- PostgreSQL database
- ChromaDB vector database
- LangChain for AI orchestration

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL database
- OpenAI API key

## Environment Variables

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
OPENAI_API_KEY=your_openai_api_key
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
├── server/                # Backend Express.js server
│   ├── routes.ts         # API routes
│   └── vector_service.py # Python AI service
├── db/                    # Database configuration
│   ├── schema.ts         # Drizzle ORM schema
│   └── index.ts          # Database connection
```

## API Endpoints

### Agents

- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/:id/posts` - Get agent's blog posts
- `POST /api/agents/:id/research` - Start research and content generation

### Vector Service (Internal)

- `POST /api/research` - Conduct research and generate content
- `GET /health` - Health check endpoint

## Database Schema

### Tables

- `agents` - AI agent information
- `blog_posts` - Generated blog content
- `research_data` - Research data with vector embeddings

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install chromadb fastapi langchain-community duckduckgo-search uvicorn pydantic
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Architecture

The application follows a hybrid architecture:
- Express.js server handles the main API and serves the React frontend
- Python FastAPI service manages AI operations and vector database
- Inter-service communication via HTTP
- PostgreSQL for structured data
- ChromaDB for vector embeddings and similarity search

## AI Agent Workflow

1. User submits research topic and parameters
2. Agent conducts web research using DuckDuckGo
3. Research data is stored in ChromaDB with vector embeddings
4. LangChain processes research data and generates blog content
5. Generated content is stored in PostgreSQL and displayed to user

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test thoroughly before submitting changes

## License

MIT License
