├── agents/                # AI agent modules
│   ├── ARCHITECTURE.md   # Architecture documentation
│   ├── TEMPLATE.md       # Agent template guide
│   └── [agent-name]/     # Individual agent directories
├── client/               # Frontend React application
│   └── src/
│       ├── components/   # React components
│       ├── pages/       # Page components
│       └── lib/         # Utility functions
├── server/              # Backend Express server
│   ├── routes.ts       # API routes
│   └── vector_service.py # FastAPI vector service
└── db/                 # Database configuration
    └── schema.ts      # Drizzle schema definitions