# API Changelog

## Version 1.0.0 - 2026-05-19

### Breaking Changes

#### API Versioning
- **All API endpoints have been moved from `/api` to `/api/v1`**
  - This change implements proper API versioning following REST best practices
  - Clients must update their base URL from `/api` to `/api/v1`
  - Example: `/api/clients` → `/api/v1/clients`

#### Frontend Impact
- The React frontend API client will need to be regenerated using the updated OpenAPI specification
- Run the orval generation command to update the client:
  ```bash
  cd lib/api-spec
  pnpm run generate
  ```

### New Features

#### OpenAPI Documentation
- Interactive API documentation is now available at `/api-docs`
- Swagger UI provides a browsable interface to test all API endpoints
- Documentation is automatically generated from the OpenAPI specification

### Migration Guide

#### For API Consumers
1. Update your API base URL from `/api` to `/api/v1`
2. No changes to request/response schemas
3. No changes to authentication or authorization

#### For Frontend Developers
1. Regenerate the API client:
   ```bash
   cd lib/api-spec
   pnpm run generate
   ```
2. Restart the frontend development server
3. Test all API calls to ensure they work with the new versioned endpoints

### Rationale
API versioning is a best practice for managing breaking changes and maintaining backward compatibility. By implementing versioning now, we establish a clear pattern for future API evolution without disrupting existing clients.
