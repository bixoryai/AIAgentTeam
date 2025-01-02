# AI Agent Page UI/UX Documentation

## Overview
The AI Agent page provides a comprehensive interface for managing and interacting with AI agents. The page is designed with a clean, modern layout that prioritizes usability and clear information hierarchy.

## Page Structure

### 1. Header Section
```jsx
<div className="flex items-center justify-between">
  {/* Agent Info & Controls */}
</div>
```
- Agent name and description
- Model selector (OpenAI/Anthropic)
- Generate Content button
- Status badge showing current agent state

### 2. Progress Section
```jsx
<GenerationProgress 
  status={agent.status}
  lastUpdateTime={agent.aiConfig?.lastUpdateTime}
/>
```
- Appears below header when content generation is active
- Shows current operation status (researching/generating)
- Progress bar with percentage complete
- Last update timestamp
- Status messages explaining current activity

### 3. Error Display
```jsx
<Card className="border-destructive">
  {/* Error details */}
</Card>
```
- Appears when agent encounters errors
- Shows error message and timestamp
- Styled with destructive border for visibility

### 4. Content Generation Dialog
Key component: `ContentGenerationDialog.tsx`
- Topic input field
- Word count selector
- Style and tone selectors
- Provider settings
- Generate button with loading state

### 5. Blog Posts Grid
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  {/* Blog post cards */}
</div>
```
- Responsive grid layout
- Post cards with metadata
- Download and delete options

## Components Breakdown

### 1. AgentView.tsx
Main container component that:
- Manages agent data fetching
- Handles UI state
- Coordinates child components
- Implements responsive layout

### 2. ContentGenerationDialog.tsx
Handles content generation workflow:
- Form validation with react-hook-form
- Provider selection
- Generation settings
- Progress feedback
- Error handling

### 3. GenerationProgress.tsx
Shows real-time generation status:
- Progress bar with stages
- Status messages
- Timestamps
- Loading animations

### 4. BlogPostCard.tsx
Displays individual posts with:
- Title and preview
- Metadata (word count, date)
- Action buttons
- Status indicators

## State Management

### 1. Agent State
```typescript
const { data: agent } = useQuery<Agent>({
  queryKey: [`/api/agents/${id}`],
  refetchInterval: (data) => {
    return ["researching", "generating", "initializing"].includes(data?.status) ? 1000 : false;
  }
});
```
- Managed through React Query
- Auto-updates during active operations
- Syncs with backend status

### 2. UI State
- Modal states (open/closed)
- Form states (valid/invalid)
- Loading states
- Error states

## Interaction Patterns

### 1. Content Generation Flow
1. User clicks "Generate Content" button
2. Dialog opens with form
3. User fills form and submits
4. Progress indicator appears
5. Status updates in real-time
6. Completion/error feedback shown

### 2. Post Management
- View post details
- Download posts
- Delete posts
- Filter and sort options

## Styling Guidelines

### 1. Theme Configuration
- Uses shadcn UI components
- Consistent color scheme
- Responsive design breakpoints
- Dark/light mode support

### 2. Layout
- Container with max width
- Responsive padding/margins
- Grid system for post layout
- Flexible spacing system

## Data Flow

### 1. Agent Data
```typescript
type Agent = {
  id: number;
  name: string;
  description: string;
  status: "ready" | "researching" | "generating" | "completed" | "error";
  aiConfig: AIConfig;
};
```
- Fetched on page load
- Updated during operations
- Cached with React Query

### 2. Blog Posts
```typescript
type BlogPost = {
  id: number;
  title: string;
  content: string;
  wordCount: number;
  metadata: PostMetadata;
};
```
- Loaded with agent data
- Updated after generation
- Cached separately

## Best Practices

### 1. Component Organization
- Separate concerns
- Reusable components
- Clear props interfaces
- Consistent naming

### 2. State Management
- Use React Query for remote data
- Local state for UI elements
- Proper error boundaries
- Loading states handled

### 3. Error Handling
- User-friendly error messages
- Proper error states
- Recovery options
- Clear feedback

### 4. Performance
- Proper query caching
- Optimized re-renders
- Lazy loading where needed
- Debounced operations

## Extending the UI

### Adding New Features
1. Create new component in `components/`
2. Update AgentView.tsx to include component
3. Add necessary state management
4. Implement error handling
5. Add loading states
6. Update types if needed

### Modifying Existing Features
1. Locate relevant component
2. Update component props if needed
3. Modify state management
4. Update UI elements
5. Test interactions
6. Verify error handling
