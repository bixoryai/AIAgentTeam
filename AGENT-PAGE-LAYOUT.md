# AI Agent Page Layout Guidelines

This document outlines the standardized UI/UX layout for AI agent pages in our platform. Following these guidelines ensures consistency across different agent types and makes it easier to develop and maintain new agents.

## Core Architecture

The agent page UI follows a modular three-section design pattern, each with specific responsibilities and interfaces.

### 1. Agent Info Section (AgentInfoSection.tsx)

This section provides essential information about the agent:
- Agent metadata (version, last updated)
- Capabilities and supported features
- Registration status and controls
- Configuration options
- Current status display

Implementation requires:
```typescript
interface AgentMetadata {
  version: string;
  lastUpdated: string;
  capabilities: string[];
  configurationOptions: Record<string, any>;
}

interface AgentInfoSectionProps {
  name: string;
  description: string;
  metadata: AgentMetadata;
  status: string;
  isRegistered: boolean;
  onRegister: () => void;
}
```

### 2. User Interactive Section (UserInteractiveSection.tsx)

This section handles user interactions and content generation:
- Input controls and action buttons
- Template management system
- Topic suggestion functionality
- Content generation controls
- Quick actions panel

Implementation requires:
```typescript
interface UserInteractiveSectionProps {
  onAction: (action: string, params: any) => void;
  supportedActions: string[];
  templates?: {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[];
  favorites?: {
    id: string;
    name: string;
    type: string;
  }[];
  agentId: number;
}
```

### 3. Agent Output Section (AgentOutputSection.tsx)

This section manages the display and handling of agent outputs:
- Content display area
- Filtering and sorting controls
- Export options
- Format selection
- Output actions (download, share, etc.)

Implementation requires:
```typescript
interface AgentOutputSectionProps {
  outputs: any[];
  onOutputAction: (action: string, outputId: string) => void;
  supportedFormats: string[];
  filterOptions?: {
    key: string;
    label: string;
    options: string[];
  }[];
  sortOptions?: {
    key: string;
    label: string;
  }[];
}
```

## Creating New Agents

### Step 1: Interface Implementation
1. Create a new agent directory under `/agents`
2. Implement the required interfaces from `types.ts`
3. Define agent-specific types and interfaces

### Step 2: Component Integration
1. Use the existing UI components as building blocks
2. Customize the layout while maintaining the three-section structure
3. Add agent-specific features within the standardized framework

### Step 3: Template System Integration
1. Define agent-specific templates
2. Implement template parameters
3. Add custom template validation
4. Use the existing template management dialog

### Step 4: Analytics Integration
1. Implement performance tracking
2. Define agent-specific metrics
3. Use the standard analytics visualization components

## Best Practices

### UI/UX Consistency
- Maintain the three-section layout
- Use consistent button placement and styling
- Follow established interaction patterns
- Use standard icons and visual cues

### Component Reuse
- Leverage existing UI components
- Share common functionality through hooks
- Use standard dialog components
- Implement shared utility functions

### Template Management
- Use descriptive template names
- Provide clear parameter descriptions
- Include example values
- Implement proper validation

### Analytics Integration
- Track relevant metrics
- Use standard chart components
- Provide meaningful insights
- Maintain consistent reporting

## Technical Requirements

### Dependencies
- React with TypeScript
- shadcn/ui components
- TanStack Query for data fetching
- Proper type definitions

### State Management
- Use React Query for server state
- Implement proper loading states
- Handle errors consistently
- Maintain proper cache invalidation

### Error Handling
- Implement proper error boundaries
- Show meaningful error messages
- Provide recovery options
- Log errors appropriately

## Future Considerations

### Extensibility
- Design for future feature additions
- Allow for custom section implementations
- Support plugin architecture
- Maintain backwards compatibility

### Performance
- Implement proper code splitting
- Optimize rendering performance
- Use efficient data structures
- Cache appropriately

### Accessibility
- Follow WCAG guidelines
- Implement proper ARIA labels
- Ensure keyboard navigation
- Support screen readers

## Conclusion

This standardized agent page layout provides a robust foundation for building new AI agents. By following these guidelines, developers can create consistent, maintainable, and user-friendly agent interfaces while leveraging existing components and functionality.
