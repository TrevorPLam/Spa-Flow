---
name: type-safety-validation
description: Ensuring end-to-end type safety using TypeScript strict mode, Zod validation schemas, and type guards
---

# Type Safety & Validation

This skill covers ensuring end-to-end type safety in the Spa-Flow repository using TypeScript strict mode, Zod validation schemas, and type guards.

## Key Concepts

### TypeScript Strict Mode
- Strict mode enabled across all packages
- Configuration in `tsconfig.base.json`
- No implicit any
- Strict null checks
- Strict function types
- No unused locals
- No unused parameters
- No implicit returns

### Type Guard Patterns
- Use type guards over `as` assertions
- Discriminated unions for variant types
- Type predicates for custom type guards
- Runtime type checking with Zod
- Type inference from Zod schemas

### Runtime Validation with Zod
- Zod schemas in `lib/api-zod/`
- Generated from OpenAPI spec
- Runtime validation for API requests/responses
- Type-safe form validation on frontend
- Schema composition and reuse

### Discriminated Unions
- Use discriminators for variant types
- Type-safe exhaustive matching
- Better than optional fields
- Clearer intent in code
- Compiler exhaustiveness checks

### Zod Schema Generation
- Generated from OpenAPI spec via Orval
- Located in `lib/api-zod/src/`
- Never edit by hand
- Regenerate after API changes
- Type inference from schemas

### Type-Safe Environment Variable Access
- Centralized in `artifacts/api-server/src/lib/env.ts`
- Zod validation at startup
- Fail-fast on invalid configuration
- Type-safe access throughout codebase
- Never use process.env directly

### Type-Safe API Client Generation
- Generated from OpenAPI spec via Orval
- Located in `lib/api-client-react/`
- Type-safe request/response
- React Query integration
- Never edit by hand
- Regenerate after API changes

### Type Inference from Zod Schemas
- Infer TypeScript types from Zod schemas
- `z.infer<typeof schema>` pattern
- Single source of truth
- Type safety across frontend/backend
- Consistent types throughout

### Type Checking Workflow
- Run typecheck on libs first: `cd lib/* && pnpm run typecheck`
- Then typecheck artifacts: `cd artifacts/* && pnpm run typecheck`
- Or run across workspace: `pnpm -r run typecheck`
- Type errors block CI
- Fix type errors before committing

### Common Type Assertion Anti-Patterns
- Avoid `as` assertions when possible
- Use type guards instead
- Use Zod validation for runtime checks
- Use discriminated unions for variants
- Type inference is preferred

## Key Files
- `lib/api-zod/src/` - Generated Zod schemas
- `lib/api-client-react/src/` - Generated type-safe client
- `artifacts/api-server/src/lib/env.ts` - Environment validation
- `tsconfig.base.json` - TypeScript strict configuration

## References
- `AGENTS.md` - Type checking commands
- TODO.md TASK-021 - Type assertion fix example

## Common Tasks

### Type Guard Example
```typescript
// BAD: Using 'as' assertion
const user = data as User;

// GOOD: Type guard
function isUser(data: unknown): data is User {
  return typeof data === 'object' && 
         'id' in data && 
         'name' in data;
}

if (isUser(data)) {
  // data is typed as User
}
```

### Discriminated Union
```typescript
type RentalSession = 
  | { status: 'active', clientId: string, expiresAt: Date }
  | { status: 'expired', clientId: string, expiredAt: Date }
  | { status: 'reserved', clientId: string, reservedUntil: Date };

function handleSession(session: RentalSession) {
  switch (session.status) {
    case 'active':
      // TypeScript knows expiresAt exists
      break;
    case 'expired':
      // TypeScript knows expiredAt exists
      break;
    case 'reserved':
      // TypeScript knows reservedUntil exists
      break;
  }
}
```

### Zod Validation
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const result = schema.parse(input); // Throws on invalid
const safe = schema.safeParse(input); // Returns result
```

### Type Inference from Zod
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof schema>; // { name: string, age: number }
```

### Environment Validation
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

const env = envSchema.parse(process.env);
```

## Best Practices
- Always enable strict mode
- Prefer type guards over assertions
- Use Zod for runtime validation
- Generate types from single source of truth
- Never edit generated files
- Fix type errors before committing
- Use discriminated unions for variants
