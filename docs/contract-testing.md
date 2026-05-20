# Contract Testing Strategy

## Overview

SpaFlow uses OpenAPI-based contract testing to ensure API responses match the documented specification. This approach was chosen over Pact consumer-driven contracts because:

1. **Architecture Fit**: SpaFlow is a monolithic application with a single API server and frontend, not a microservices architecture with multiple independent consumer teams.
2. **Simplicity**: OpenAPI-based validation has lower complexity and maintenance overhead compared to Pact.
3. **Existing Investment**: The project already has a comprehensive OpenAPI specification (`lib/api-spec/openapi.yaml`).
4. **Provider-Driven**: The API spec defines the contract, which aligns with the single provider (API server) model.

## Implementation

### Tools Used

- **@apidevtools/swagger-parser**: Validates and parses the OpenAPI specification
- **ajv**: JSON schema validator for validating API responses against OpenAPI schemas
- **ajv-formats**: Additional format validators for AJV (date-time, email, etc.)

### Contract Validation Helper

The contract validation helper is located at `artifacts/api-server/src/test/contract-validator.ts` and provides:

- `validateResponse(path, method, statusCode, responseBody)`: Validates API responses against OpenAPI spec
- `validateRequestBody(path, method, requestBody)`: Validates API request bodies against OpenAPI spec

### Test Integration

Contract validation is integrated into existing API test files:

- `artifacts/api-server/src/routes/clients.test.ts`: Contract validation for clients API endpoints
- `artifacts/api-server/src/routes/checkin.test.ts`: Contract validation for check-in API endpoints

Each test file includes a "Contract Validation" describe block that:
1. Validates request bodies against the OpenAPI schema
2. Validates successful responses against the OpenAPI schema
3. Reports detailed validation errors if contracts are violated

## CI/CD Integration

A dedicated `contract-tests` job runs in the CI pipeline (`.github/workflows/ci.yml`):

```yaml
contract-tests:
  name: Contract Tests
  runs-on: ubuntu-latest
  needs: typecheck
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install
    - name: Run Contract Tests
      run: cd artifacts/api-server && pnpm run test -- src/routes/clients.test.ts src/routes/checkin.test.ts
```

This job:
- Runs after typecheck completes
- Runs contract tests for critical API endpoints
- Fails the build if contract violations are detected

## Contract Versioning Strategy

Since SpaFlow uses OpenAPI-based contract testing:

1. **Breaking Changes**: Any change to the OpenAPI spec that breaks existing consumers should:
   - Increment the API version in the spec
   - Update the implementation to match
   - Run contract tests to verify compliance

2. **Non-Breaking Changes**: Adding optional fields or new endpoints:
   - Update the OpenAPI spec
   - Update implementation
   - Contract tests will validate new responses

3. **Backwards Compatibility**: Maintain backwards compatibility by:
   - Never removing required fields without version increment
   - Adding new fields as optional when possible
   - Using schema `oneOf` for polymorphic responses

## Adding Contract Tests to New Endpoints

When adding new API endpoints:

1. Define the endpoint in `lib/api-spec/openapi.yaml`
2. Add standard integration tests in the appropriate route test file
3. Add contract validation tests:

```typescript
describe('Contract Validation', () => {
  it('should validate POST /api/endpoint request against OpenAPI spec', async () => {
    const requestData = { /* valid request data */ };
    const validation = await validateRequestBody('/api/endpoint', 'post', requestData);
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Contract validation errors:', validation.errors);
    }
  });

  it('should validate POST /api/endpoint response against OpenAPI spec', async () => {
    const response = await api.post('/api/endpoint').send(requestData);
    expect(response.status).toBe(200);
    
    const validation = await validateResponse('/api/endpoint', 'post', 200, response.body);
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Contract validation errors:', validation.errors);
    }
  });
});
```

## Handling Contract Violations

If contract tests fail:

1. **Check the error message**: The validation helper provides detailed error messages indicating which field violated the schema
2. **Update the spec or implementation**: Either fix the implementation to match the spec, or update the spec to match the implementation
3. **Consider versioning**: If the change is breaking, increment the API version
4. **Re-run tests**: Verify the fix resolves the contract violation

## Benefits of This Approach

- **Early Detection**: Contract violations are caught in CI before deployment
- **Documentation Accuracy**: Ensures the OpenAPI spec remains accurate
- **Type Safety**: Validates that responses match the documented schema
- **Low Overhead**: No additional infrastructure (like Pact Broker) required
- **Developer Friendly**: Easy to add new contract tests using the helper functions

## Future Considerations

If SpaFlow evolves into a microservices architecture with multiple independent consumer teams, consider migrating to Pact consumer-driven contracts for:
- Better coordination between multiple consumer teams
- Consumer-driven contract definitions
- Pact Broker for contract management
- can-i-deploy tooling for deployment safety

For the current monolithic architecture, OpenAPI-based contract testing provides the right balance of assurance and simplicity.
