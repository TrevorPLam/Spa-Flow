---
trigger: glob
globs: artifacts/spaflow/src/**/*.tsx
---

# React 19 Best Practices (2026)

## Current State
- Spa-Flow uses React 19.1.0
- Uses TanStack Query for state management
- Uses Radix UI components
- Uses React Hook Form for forms

## 2026 Best Practices
- React 19 introduces new hooks that simplify state management
- Actions simplify form handling and async workflows
- Server Components pattern for better performance
- use() hook for async data fetching

## New React 19 Hooks

### useFormStatus (Form Actions)
```typescript
// ✅ Good: React 19 form actions
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

function MyForm() {
  async function handleSubmit(formData) {
    await updateUser(formData);
  }
  return (
    <form action={handleSubmit}>
      <SubmitButton />
    </form>
  );
}
```

### use() (Async Data)
```typescript
// ✅ Good: use() hook for async data
import { use } from 'react';

function UserProfile({ userId }) {
  const user = use(fetchUser(userId));
  return <div>{user.name}</div>;
}
```

## State Management Strategy

### When to Use useState
- Local component state (form inputs, UI toggles)
- Small, simple state that doesn't need to be shared
- State that doesn't require complex updates

### When to Use TanStack Query
- Server state (API data, cacheable data)
- Data that needs to be refreshed/stale
- Data that needs to be shared across components
- Complex caching and invalidation logic

### When to Use Context
- Global app state (theme, auth, user preferences)
- State that needs to be accessed by many components
- State that doesn't change frequently

## Component Patterns

### Server Components (If Using Next.js)
```typescript
// ✅ Good: Server Component for data fetching
async function UserList() {
  const users = await fetchUsers();
  return <UserTable users={users} />;
}
```

### Client Components
```typescript
// ✅ Good: Client Component for interactivity
'use client';
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

## Performance Best Practices
- **✅ Always Do**: Use React.memo for expensive components
- **✅ Always Do**: Use useMemo for expensive computations
- **✅ Always Do**: Use useCallback for stable function references
- **✅ Always Do**: Lazy load routes with React.lazy
- **✅ Always Do**: Use code splitting for large bundles
- **❌ Never Do**: Optimize prematurely (measure first)

## Type Safety
- **✅ Always Do**: Use TypeScript strict mode
- **✅ Always Do**: Use type guards over `as` assertions
- **✅ Always Do**: Define prop types explicitly
- **❌ Never Do**: Use `any` type
- **❌ Never Do**: Use `as` without validation

## Testing
- **✅ Always Do**: Test components with React Testing Library
- **✅ Always Do**: Test user behavior, not implementation details
- **✅ Always Do**: Mock API calls with MSW
- **❌ Never Do**: Test internal state (test behavior instead)

## Migration to React 19
If upgrading from React 18:
- **⚠️ Ask First**: Major version upgrade requires careful testing
- Breaking changes:
  - Removed: ReactDOM.render (use createRoot)
  - Changed: Automatic batching (now in all cases)
  - New: Actions API for forms
  - New: use() hook for async data

## References
- React 19 Documentation (2026)
- "React 19 New Hooks — Complete Tutorial (2026 Guide)" - DEV Community
- "The Best State Management Strategies in React 19" - Medium
