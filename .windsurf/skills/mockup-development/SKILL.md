---
name: mockup-development
description: Using the mockup-sandbox for isolated UI component development and experimentation
---

# Mockup & Component Development

This skill covers using the mockup-sandbox in the Spa-Flow repository for isolated UI component development and experimentation.

## Key Concepts

### Mockup-Sandbox Purpose and Usage
- Isolated environment for UI development
- Fast iteration without full app context
- Component experimentation
- UI pattern exploration
- Proof-of-concept development

### Isolated Component Testing
- Test components in isolation
- No app dependencies
- Mock data for testing
- Focus on component logic
- Faster development cycle

### Fast-Glob for File Watching
- Fast file watching for hot reload
- Efficient pattern matching
- Supports glob patterns
- Watches source files
- Triggers rebuild on change

### Chokidar for Hot Reload
- Chokidar for file system watching
- Hot module replacement
- Instant feedback on changes
- Preserves component state
- Efficient rebuilds

### Vite Preview Configuration
- Vite for development server
- Preview mode for production-like build
- Fast HMR
- ESBuild for bundling
- Development optimization

### Component Iteration Workflow
- Create component in mockup-sandbox
- Test with mock data
- Iterate quickly
- Move to main app when ready
- Delete mockup files

### UI Pattern Experimentation
- Try new UI patterns
- Test different layouts
- Experiment with animations
- Test component variations
- Gather feedback before integration

## Key Files
- `artifacts/mockup-sandbox/` - Mockup sandbox
- `artifacts/mockup-sandbox/vite.config.ts` - Vite config

## References
- `README.md` - Mockup-sandbox in package graph

## Common Tasks

### Starting Mockup Sandbox
```bash
cd artifacts/mockup-sandbox
pnpm run dev
```

### Creating a Mockup Component
```typescript
// Create in artifacts/mockup-sandbox/src/
export function MockupComponent() {
  return (
    <div>
      {/* Component code */}
    </div>
  );
}
```

### Testing with Mock Data
```typescript
const mockData = {
  name: 'Test Client',
  email: 'test@example.com',
};

<MockupComponent data={mockData} />
```

### Moving Component to Main App
1. Copy component to `artifacts/spaflow/src/components/`
2. Add proper imports
3. Replace mock data with real API calls
4. Add tests
5. Delete from mockup-sandbox

## Best Practices
- Use mockup-sandbox for experimentation
- Keep mockups temporary
- Move tested components to main app
- Clean up mockup files
- Document component decisions
