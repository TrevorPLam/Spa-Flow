---
trigger: glob
globs: **/*.ts,**/*.tsx
---

# TypeScript Strict Mode Best Practices (2026)

## Current State
- Spa-Flow uses TypeScript 5.9.3 with strict mode enabled
- All packages use strict TypeScript configuration

## 2026 Best Practices
- **Critical**: Non-strict TypeScript is considered a liability in 2026
- Strict mode catches entire categories of bugs at compile time
- Migration cost is always lower than cost of bugs shipped without it
- Enterprise standard requires strict mode for production code

## Required Compiler Options
### Core Strict Options
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true
}
```

### Type Safety Enforcement
- **✅ Always Do**: Enable strict mode in all TypeScript projects
- **✅ Always Do**: Use type guards over `as` assertions
- **✅ Always Do**: Add runtime validation for critical paths (Zod)
- **✅ Always Do**: Use `noUncheckedIndexedAccess` to prevent undefined access
- **❌ Never Do**: Use `as` without validation
- **❌ Never Do**: Disable strict mode for convenience
- **❌ Never Do**: Use `@ts-ignore` (use `@ts-expect-error` with justification)

## Type Safety Patterns

### Type Guards (Preferred)
```typescript
// ✅ Good: Type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// ❌ Bad: Type assertion
const user = obj as User;
```

### Runtime Validation
```typescript
// ✅ Good: Zod validation
const userSchema = z.object({
  id: z.string(),
  name: z.string()
});
const user = userSchema.parse(data);

// ❌ Bad: Type assertion without validation
const user = data as User;
```

### Indexed Access
```typescript
// ✅ Good: Handle undefined
const item = array[index];
if (!item) {
  throw new Error('Item not found');
}

// ❌ Bad: Assume exists (noUncheckedIndexedAccess prevents this)
const item = array[index]; // TypeScript error
```

## Configuration Validation
- **✅ Always Do**: Verify `tsconfig.json` has strict mode enabled
- **✅ Always Do**: Run `pnpm run typecheck` before committing
- **✅ Always Do**: Fix all type errors (no partial fixes)
- **❌ Never Do**: Commit with type errors
- **❌ Never Do**: Use `// @ts-ignore` to bypass errors

## Migration to Strict Mode
If a package is not using strict mode:
- **⚠️ Ask First**: Enabling strict mode on existing codebase
- Migration strategy:
  1. Enable strict mode in tsconfig.json
  2. Fix errors incrementally (file by file)
  3. Use `exactOptionalPropertyTypes` last (most restrictive)
  4. Never disable strict mode once enabled

## References
- "TypeScript Strict Mode: The Complete 2026 Guide" - CodingDunia
- "TypeScript Best Practices 2026: Complete Guide" - HashtagCoders
- "How to Enable and Use TypeScript Strict Mode Effectively" - OneUptime
