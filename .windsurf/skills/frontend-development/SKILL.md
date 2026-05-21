---
name: frontend-development
description: Building React 19 SPA with Vite, Radix UI components, TanStack Query for state management, and TailwindCSS styling
---

# Frontend Development (React 19 & Vite)

This skill covers building the React 19 SPA frontend in the Spa-Flow repository using Vite, Radix UI, TanStack Query, and TailwindCSS.

## Key Concepts

### React 19 Patterns
- React 19.1.0 with React DOM 19.1.0
- Concurrent features for better performance
- Server Components support (future consideration)
- Automatic batching for state updates
- Improved error boundaries
- useTransition and useDeferredValue for smooth UI

### Vite Configuration
- Vite 7.3.2 for fast development and builds
- HMR (Hot Module Replacement) for instant updates
- ESBuild for fast bundling
- Configured in `artifacts/spaflow/vite.config.ts`
- Environment variables prefixed with `VITE_`
- Build optimization and code splitting

### Radix UI Components
- Comprehensive component library
- Unstyled, accessible primitives
- Customizable with TailwindCSS
- Used for dialogs, dropdowns, forms, etc.
- Keyboard navigation support
- Screen reader compatibility

### TanStack Query for Data Fetching
- TanStack Query 5.90.21 for server state
- Automatic caching and refetching
- Optimistic updates
- Pagination and infinite queries
- Type-safe API client integration
- Query invalidation strategies

### Wouter Routing
- Wouter 3.3.5 for client-side routing
- Lightweight alternative to React Router
- Hook-based API
- Route parameters
- Nested routes support

### TailwindCSS Styling
- TailwindCSS 4.1.14 for utility-first styling
- Responsive design with breakpoints
- Dark mode support
- Custom theme configuration
- JIT compiler for production
- Purging unused styles

### React Hook Form
- React Hook Form 7.55.0 for form handling
- Performance-optimized forms
- Zod schema validation integration
- Type-safe form values
- Controlled and uncontrolled components

### Framer Motion Animations
- Framer Motion 12.23.24 for animations
- Smooth transitions
- Gesture support
- Layout animations
- Scroll-linked animations

### Type-Safe API Client
- Auto-generated from OpenAPI spec
- Located in `lib/api-client-react/`
- Type-safe request/response
- React Query integration
- **Never edit by hand**

### Component Organization
- `artifacts/spaflow/src/pages/` - Page components
- `artifacts/spaflow/src/components/` - Reusable components
- `artifacts/spaflow/src/hooks/` - Custom React hooks
- `artifacts/spaflow/src/contexts/` - Context providers

### Environment Variable Usage
- Frontend env vars prefixed with `VITE_`
- Access via `import.meta.env.VITE_*`
- Defined in `.env` files
- Build-time substitution

## 2026 Best Practices

### React + Vite + TypeScript Setup
Based on 2026 best practices:

**Vitest Integration**
- Vitest for unit/integration tests
- React Testing Library for component tests
- JSDOM environment configuration
- Global setup for jest-dom matchers
- Mock API calls with Vitest

**TypeScript Configuration**
- Strict type checking enabled
- Proper DOM type definitions
- JSX configuration for React
- Module resolution for workspace
- Path aliases for clean imports

**Testing Patterns**
- Test user behavior, not implementation
- Use user-event for interactions
- Mock external dependencies
- Test hooks with renderHook
- Coverage threshold: 80%

### Performance Optimization
- Code splitting with lazy loading
- Dynamic imports for routes
- Image optimization
- Bundle size monitoring
- Tree shaking for unused code

### Accessibility
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Key Files
- `artifacts/spaflow/src/pages/` - Page components
- `artifacts/spaflow/src/components/` - Reusable components
- `artifacts/spaflow/src/hooks/` - Custom React hooks
- `artifacts/spaflow/vite.config.ts` - Vite configuration
- `artifacts/spaflow/src/contexts/AuthContext.tsx` - Auth context with JWT refresh

## References
- `AGENTS.md` - Frontend file placement rules
- `README.md` - Frontend technology stack

## Common Tasks

### Creating a New Page
1. Create component in `artifacts/spaflow/src/pages/`
2. Add route in main router
3. Use TanStack Query for data fetching
4. Add Radix UI components as needed
5. Style with TailwindCSS
6. Add tests with Vitest + RTL

### Adding a Reusable Component
1. Create in `artifacts/spaflow/src/components/`
2. Use TypeScript for props
3. Compose Radix UI primitives
4. Style with TailwindCSS
5. Export with proper types
6. Add tests

### Fetching Data
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['clients', search],
  queryFn: () => apiClient.getClients({ search }),
});
```

### Form Handling
```typescript
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

## Build Process
- Development: `pnpm run dev` (port 5173)
- Production build: `pnpm run build`
- Preview build: `pnpm run preview`
- Type check: `pnpm run typecheck`
