# AI Agent Platform

An advanced AI Agent creation and application platform that empowers developers to design, develop, and deploy intelligent workflow-driven AI agents using cutting-edge technologies.

## Features

- 🤖 **AI Agent Management**: Create, configure, and monitor multiple AI agents
- 📝 **Automated Content Generation**: Generate blog posts and content using AI
- 🔍 **Smart Research**: Integrated web research capabilities using DuckDuckGo
- 💾 **Vector Database**: Efficient storage and retrieval of research data using ChromaDB
- 📊 **Real-time Monitoring**: Track agent status and performance
- 🔄 **Workflow Automation**: Automated research and content generation pipelines

## Tech Stack

### Frontend
- React with TypeScript
- TailwindCSS with shadcn/ui components
- React Query for data fetching
- Wouter for routing

### Backend
- Express.js server
- FastAPI vector service
- PostgreSQL database (via Drizzle ORM)
- ChromaDB vector database
- LangChain for AI operations

### AI Integration
- OpenAI API for content generation
- DuckDuckGo Search API for web research
- Vector embeddings for efficient data retrieval

## Getting Started

### Prerequisites

1. Node.js and npm installed
2. Python 3.8+ installed
3. PostgreSQL database
4. OpenAI API key

### Environment Variables

Create a `.env` file with the following:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
OPENAI_API_KEY=your_openai_api_key
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install fastapi langchain-community langchain pydantic requests uvicorn duckduckgo-search chromadb
```

3. Set up the database:
```bash
npm run db:push
```

### Development

Start the development server:
```bash
npm run dev
```

This will start:
- Express server on port 5000
- Vector service on port 5001
- React development server

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   └── lib/          # Utility functions
├── server/                # Backend Express server
│   ├── routes.ts         # API routes
│   └── vector_service.py # FastAPI vector service
├── db/                   # Database configuration
│   └── schema.ts        # Drizzle schema definitions
```

## API Documentation

### Agents API

- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/:id/posts` - Get agent's blog posts
- `POST /api/agents/:id/research` - Start research task

### Vector Service API

- `POST /api/research` - Conduct research and generate content
- `GET /health` - Health check endpoint

## Development Guidelines

1. **Frontend Development**
   - Use shadcn components for UI elements
   - Implement proper loading states
   - Use React Query for data fetching
   - Follow the established routing pattern

2. **Backend Development**
   - Prefix all API routes with `/api`
   - Use Drizzle for database operations
   - Implement proper error handling
   - Maintain vector service health checks

3. **Database Operations**
   - Use Drizzle migrations for schema changes
   - Define clear relationships between models
   - Implement proper indexing for performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
