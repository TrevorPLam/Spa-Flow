---
name: code-generation
description: Using Orval to generate type-safe API client and Zod validation schemas from OpenAPI specification
---

# Code Generation

This skill covers using Orval to generate type-safe API client and Zod validation schemas from OpenAPI specification in the Spa-Flow repository.

## Key Concepts

### OpenAPI 3.1.0 as Single Source of Truth
- OpenAPI spec in `lib/api-spec/openapi.yaml`
- API version 1.0.0
- All endpoints documented here first
- Changes to spec drive code generation
- Never bypass the spec

### Orval Configuration
- Configuration in `lib/api-spec/orval.config.ts`
- Defines output locations
- Specifies React Query integration
- Configures Zod schema generation
- Customizes generated code

### Code Generation Workflow
1. Update `lib/api-spec/openapi.yaml`
2. Run `cd lib/api-spec && pnpm run codegen`
3. Generated Zod schemas in `lib/api-zod/`
4. Generated React Query client in `lib/api-client-react/`
5. Use generated code in application

### Generated Zod Schemas
- Located in `lib/api-zod/src/`
- Runtime validation schemas
- Type inference from schemas
- Request/response validation
- Never edit by hand

### Generated React Query Client
- Located in `lib/api-client-react/`
- Type-safe API client
- React Query hooks
- Auto-generated from OpenAPI
- Never edit by hand

### Never Edit Generated Files
- Generated files are overwritten on codegen
- Manual changes will be lost
- Make changes in OpenAPI spec instead
- Regenerate after spec changes
- Commit generated files to git

### Regenerating After API Changes
- Update OpenAPI spec first
- Run codegen
- Update dependent code
- Run tests
- Commit spec + generated code together

### Type Inference from Generated Schemas
- Use `z.infer<typeof schema>` for types
- Single source of truth
- Type safety across frontend/backend
- Consistent types throughout

### Customizing Generation
- Modify orval.config.ts for custom output
- Add custom transformers if needed
- Configure React Query options
- Customize Zod schema generation

## Key Files
- `lib/api-spec/openapi.yaml` - API specification
- `lib/api-spec/orval.config.ts` - Orval configuration
- `lib/api-zod/src/` - Generated Zod schemas
- `lib/api-client-react/src/` - Generated React client

## References
- `AGENTS.md` - API client regeneration workflow
- `docs/api-changelog.md` - API version history

## Common Tasks

### Running Code Generation
```bash
cd lib/api-spec
pnpm run codegen
```

### Adding a New Endpoint
1. Add endpoint to openapi.yaml
2. Document request/response schemas
3. Run codegen
4. Use generated hook in frontend
5. Add tests

### Modifying an Existing Endpoint
1. Update endpoint in openapi.yaml
2. Update schemas if needed
3. Run codegen
4. Update dependent code
5. Run tests

### Using Generated API Client
```typescript
import { apiClient } from '@spa-flow/api-client-react';

const { data, isLoading } = useQuery({
  queryKey: ['clients'],
  queryFn: () => apiClient.getClients(),
});
```

### Type Inference from Generated Schema
```typescript
import { ClientSchema } from '@spa-flow/api-zod';
import { z } from 'zod';

type Client = z.infer<typeof ClientSchema>;
```

## Best Practices
- Always update OpenAPI spec first
- Never edit generated files by hand
- Regenerate after spec changes
- Commit spec and generated code together
- Use generated types for type safety
