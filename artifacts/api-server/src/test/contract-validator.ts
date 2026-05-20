import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { resolve } from 'path';

let apiSpec: any = null;
let ajv: Ajv | null = null;

/**
 * Load and parse the OpenAPI specification
 */
async function loadApiSpec() {
  if (apiSpec) {
    return apiSpec;
  }

  const specPath = resolve(__dirname, '../../../lib/api-spec/openapi.yaml');
  apiSpec = await SwaggerParser.validate(specPath);
  return apiSpec;
}

/**
 * Initialize AJV validator with OpenAPI spec
 */
async function getValidator() {
  if (ajv) {
    return ajv;
  }

  const spec = await loadApiSpec();
  ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateFormats: true,
  });
  
  addFormats(ajv);

  // Add all schemas from the OpenAPI spec to AJV
  if (spec.components?.schemas) {
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
      ajv!.addSchema(schema as object, `#/components/schemas/${name}`);
    });
  }

  return ajv;
}

/**
 * Validate response against OpenAPI schema
 * @param path - API path (e.g., '/api/clients')
 * @param method - HTTP method (e.g., 'get')
 * @param statusCode - Response status code (e.g., 200)
 * @param responseBody - Response body to validate
 * @returns Validation result with errors if any
 */
export async function validateResponse(
  path: string,
  method: string,
  statusCode: number,
  responseBody: any
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const spec = await loadApiSpec();
    const validator = await getValidator();

    // Normalize path (remove /api/v1 prefix if present)
    const normalizedPath = path.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
    const openApiPath = `/api/v1${normalizedPath}`;

    // Find the path in the OpenAPI spec
    const pathItem = spec.paths[openApiPath];
    if (!pathItem) {
      return {
        valid: false,
        errors: [`Path ${openApiPath} not found in OpenAPI spec`],
      };
    }

    // Find the method in the path item
    const methodLower = method.toLowerCase();
    const operation = pathItem[methodLower];
    if (!operation) {
      return {
        valid: false,
        errors: [`Method ${method.toUpperCase()} not found for path ${openApiPath}`],
      };
    }

    // Find the response for the status code
    const response = operation.responses[statusCode.toString()];
    if (!response) {
      return {
        valid: false,
        errors: [`Status code ${statusCode} not found for ${method.toUpperCase()} ${openApiPath}`],
      };
    }

    // Get the schema from the response
    const schema = response.content?.['application/json']?.schema;
    if (!schema) {
      // No schema defined, consider it valid
      return { valid: true, errors: [] };
    }

    // Validate the response body against the schema
    const validate = validator.compile(schema);
    const valid = validate(responseBody);

    if (!valid && validate.errors) {
      const errors = validate.errors.map((err) => {
        return `${err.instancePath} ${err.message}: ${JSON.stringify(err.params)}`;
      });
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Validate request body against OpenAPI schema
 * @param path - API path (e.g., '/api/clients')
 * @param method - HTTP method (e.g., 'post')
 * @param requestBody - Request body to validate
 * @returns Validation result with errors if any
 */
export async function validateRequestBody(
  path: string,
  method: string,
  requestBody: any
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const spec = await loadApiSpec();
    await getValidator();

    // Normalize path
    const normalizedPath = path.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
    const openApiPath = `/api/v1${normalizedPath}`;

    // Find the path in the OpenAPI spec
    const pathItem = spec.paths[openApiPath];
    if (!pathItem) {
      return {
        valid: false,
        errors: [`Path ${openApiPath} not found in OpenAPI spec`],
      };
    }

    // Find the method in the path item
    const methodLower = method.toLowerCase();
    const operation = pathItem[methodLower];
    if (!operation) {
      return {
        valid: false,
        errors: [`Method ${methodLower} not found for path ${openApiPath}`],
      };
    }

    // Get the request body schema
    const requestBodySpec = operation.requestBody;
    if (!requestBodySpec) {
      // No request body expected, consider it valid
      return { valid: true, errors: [] };
    }

    const schema = requestBodySpec.content?.['application/json']?.schema;
    if (!schema) {
      // No schema defined, consider it valid
      return { valid: true, errors: [] };
    }

    // Validate the request body against the schema
    const validate = ajv!.compile(schema);
    const valid = validate(requestBody);

    if (!valid && validate.errors) {
      const errors = validate.errors.map((err) => {
        return `${err.instancePath} ${err.message}: ${JSON.stringify(err.params)}`;
      });
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
