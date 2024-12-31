# AI Agent Development Platform

An advanced AI Agent development platform that provides a comprehensive, modular approach to creating intelligent workflow management solutions. The platform enables developers to build, manage, and optimize AI agents through a structured, reproducible ecosystem.

## Features

- 🤖 **Modular Agent Architecture**: Build isolated, self-contained AI agents with standardized structures
- 🔄 **Workflow Automation**: Automated research and content generation pipelines
- 📝 **Content Generation**: Smart content creation with research capabilities
- 🔍 **Vector Search**: Efficient content storage and retrieval using ChromaDB
- 📊 **Analytics Dashboard**: Real-time monitoring of agent performance
- 🎯 **Customizable Agents**: Configure agent behavior, style, and objectives

## Architecture

Our platform follows a modular architecture where each AI agent is developed as an independent module:

```
agents/
└── [agent-name]/
    ├── config/         # Agent configuration
    ├── handlers/       # Business logic
    ├── types/         # TypeScript definitions
    ├── services/      # External integrations
    └── tests/         # Agent-specific tests
```

For detailed architectural guidelines, see [ARCHITECTURE.md](ARCHITECTURE.md).
For agent development template, see [TEMPLATE.md](TEMPLATE.md).

## Tech Stack

### Frontend
- React/TypeScript for responsive interfaces
- TailwindCSS with shadcn/ui components
- React Query for data management
- Wouter for routing
- Recharts for analytics visualization

### Backend
- Express.js server
- FastAPI vector service
- PostgreSQL for data persistence
- ChromaDB for vector storage
- LangChain for AI operations

### AI Integration
- OpenAI API for content generation
- DuckDuckGo Search API for research
- Vector embeddings for efficient retrieval

## Getting Started

### Prerequisites

1. Node.js (v18+)
2. Python 3.11
3. PostgreSQL database
4. OpenAI API key

### Environment Setup

Required environment variables:
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
OPENAI_API_KEY=your_openai_api_key
```

### Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Push database schema:
```bash
npm run db:push
```

### Development

Start the development server:
```bash
npm run dev
```

This will start:
- Express server (port 5000)
- Vector service (port 5001)
- Frontend development server

## API Documentation

### Agent Management

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/toggle` - Toggle agent status

### Content Management

- `GET /api/agents/:id/posts` - Get agent's blog posts
- `POST /api/research` - Initiate research and content generation

## Development Guidelines

### Creating New Agents

1. Use the template in [TEMPLATE.md](TEMPLATE.md)
2. Follow the modular structure
3. Implement required interfaces
4. Add comprehensive tests
5. Document agent capabilities

### Best Practices

1. **Isolation**: Keep agent code self-contained
2. **Configuration**: Use TypeScript for type-safe configs
3. **Error Handling**: Implement proper error tracking
4. **Testing**: Write unit and integration tests
5. **Documentation**: Maintain clear documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the architectural guidelines
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the MIT License.
