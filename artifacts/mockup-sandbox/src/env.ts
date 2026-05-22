import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

// Load environment-specific .env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(projectRoot, envFile) });

// Mockup-sandbox environment schema for validation
const mockupEnvSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive('PORT must be a positive integer')),
  BASE_PATH: z.string().min(1, 'BASE_PATH cannot be empty'),
});

export type MockupEnv = z.infer<typeof mockupEnvSchema>;

let validatedMockupEnv: MockupEnv | null = null;

export function validateMockupEnv(): MockupEnv {
  if (validatedMockupEnv) {
    return validatedMockupEnv;
  }

  const result = mockupEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Mockup-sandbox environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nMockup-sandbox will not start without valid environment variables.');
    throw new Error('Mockup-sandbox environment validation failed');
  }

  console.log('✅ Mockup-sandbox environment validation passed');
  validatedMockupEnv = result.data;
  return validatedMockupEnv;
}

export function getMockupEnv(): MockupEnv {
  if (!validatedMockupEnv) {
    return validateMockupEnv();
  }
  return validatedMockupEnv;
}

// Reset cached environment for test isolation
export function resetMockupEnv(): void {
  validatedMockupEnv = null;
}
