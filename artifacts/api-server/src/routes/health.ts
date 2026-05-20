import { Router, type IRouter } from "express";
import { LivenessProbeResponse, ReadinessProbeResponse, healthCheckStatus } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getTwilioCredentials, getTwilioAuthHeader, getEnv } from "../lib/env";
import { getRedisClient } from "../lib/cache";
import { healthLimiter } from "../middleware/rateLimit";

const router: IRouter = Router();

// Helper function to check database connectivity
async function checkDatabase(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    // Simple query to check database connection
    await pool.query('SELECT 1');
    const latency = Date.now() - startTime;
    return { status: "healthy", latency_ms: latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error({ error }, "Database health check failed");
    return { 
      status: "unhealthy", 
      message: error instanceof Error ? error.message : "Unknown database error",
      latency_ms: latency 
    };
  }
}

// Helper function to check Square API connectivity
async function checkSquare(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    const env = getEnv();
    const accessToken = env.SQUARE_ACCESS_TOKEN;
    const environment = env.SQUARE_ENVIRONMENT;
    const apiVersion = env.SQUARE_API_VERSION;
    
    if (!accessToken) {
      // If not configured, mark as degraded (not required for basic operation)
      return { 
        status: "degraded", 
        message: "Square not configured",
        latency_ms: Date.now() - startTime 
      };
    }

    const baseUrl = environment === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    // Simple ping to Square API
    const response = await fetch(`${baseUrl}/v2/locations`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Square-Version": apiVersion,
      },
    });

    if (response.ok) {
      return { status: "healthy", latency_ms: Date.now() - startTime };
    } else {
      return { 
        status: "unhealthy", 
        message: `Square API returned ${response.status}`,
        latency_ms: Date.now() - startTime 
      };
    }
  } catch (error) {
    logger.error({ error }, "Square health check failed");
    return { 
      status: "unhealthy", 
      message: error instanceof Error ? error.message : "Unknown Square error",
      latency_ms: Date.now() - startTime 
    };
  }
}

// Helper function to check Twilio API connectivity
async function checkTwilio(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    const { accountSid, authToken } = getTwilioCredentials();
    
    if (!accountSid || !authToken) {
      // If not configured, mark as degraded (not required for basic operation)
      return { 
        status: "degraded", 
        message: "Twilio not configured",
        latency_ms: Date.now() - startTime 
      };
    }

    const authHeader = getTwilioAuthHeader();
    if (!authHeader) {
      return { 
        status: "degraded", 
        message: "Twilio credentials invalid",
        latency_ms: Date.now() - startTime 
      };
    }

    // Simple ping to Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (response.ok) {
      return { status: "healthy", latency_ms: Date.now() - startTime };
    } else {
      return { 
        status: "unhealthy", 
        message: `Twilio API returned ${response.status}`,
        latency_ms: Date.now() - startTime 
      };
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown error" }, "Twilio health check failed");
    return { 
      status: "unhealthy", 
      message: error instanceof Error ? error.message : "Unknown Twilio error",
      latency_ms: Date.now() - startTime 
    };
  }
}

// Helper function to check Redis connectivity
async function checkRedis(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    const client = getRedisClient();

    // Simple PING command to check Redis connection
    const result = await client.ping();

    if (result === 'PONG') {
      return { status: "healthy", latency_ms: Date.now() - startTime };
    } else {
      return {
        status: "unhealthy",
        message: "Redis ping failed",
        latency_ms: Date.now() - startTime
      };
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown error" }, "Redis health check failed");
    return {
      status: "degraded",
      message: error instanceof Error ? error.message : "Unknown Redis error",
      latency_ms: Date.now() - startTime
    };
  }
}

// Helper function to check JWT secret configuration
async function checkJwtSecret(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    const env = getEnv();
    const jwtSecret = env.JWT_SECRET;

    if (!jwtSecret) {
      return {
        status: "unhealthy",
        message: "JWT_SECRET is not set",
        latency_ms: Date.now() - startTime
      };
    }

    // JWT_SECRET should be at least 32 characters (32 bytes when hex-encoded)
    if (jwtSecret.length < 32) {
      return {
        status: "unhealthy",
        message: `JWT_SECRET is too short (${jwtSecret.length} characters, minimum 32 required)`,
        latency_ms: Date.now() - startTime
      };
    }

    return { status: "healthy", latency_ms: Date.now() - startTime };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown error" }, "JWT secret health check failed");
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Unknown JWT secret error",
      latency_ms: Date.now() - startTime
    };
  }
}

// Helper function to check encryption key configuration
async function checkEncryptionKey(): Promise<{ status: HealthCheckStatus; message?: string; latency_ms: number }> {
  const startTime = Date.now();
  try {
    const env = getEnv();
    const encryptionKey = env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return {
        status: "unhealthy",
        message: "ENCRYPTION_KEY is not set",
        latency_ms: Date.now() - startTime
      };
    }

    // ENCRYPTION_KEY should be valid base64 and at least 32 bytes when decoded
    try {
      const decoded = Buffer.from(encryptionKey, 'base64');
      if (decoded.length < 32) {
        return {
          status: "unhealthy",
          message: `ENCRYPTION_KEY is too short (${decoded.length} bytes when decoded, minimum 32 bytes required)`,
          latency_ms: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: "ENCRYPTION_KEY is not valid base64",
        latency_ms: Date.now() - startTime
      };
    }

    return { status: "healthy", latency_ms: Date.now() - startTime };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown error" }, "Encryption key health check failed");
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Unknown encryption key error",
      latency_ms: Date.now() - startTime
    };
  }
}

// Liveness probe - simple check if application is running
// Should be fast (<100ms) and avoid I/O operations that could fail
router.get("/healthz/live", healthLimiter, (_req, res) => {
  const uptime = process.uptime();
  const data: LivenessResponse = {
    status: "ok",
    uptime: Math.floor(uptime),
    timestamp: new Date(),
  };
  res.json(data);
});

// Readiness probe - checks if dependencies are available
// Should check database, external services, auth configuration
router.get("/healthz/ready", healthLimiter, async (_req, res) => {
  const [database, square, twilio, redis, jwtSecret, encryptionKey] = await Promise.all([
    checkDatabase(),
    checkSquare(),
    checkTwilio(),
    checkRedis(),
    checkJwtSecret(),
    checkEncryptionKey(),
  ]);

  // Determine overall readiness
  // If database, JWT secret, or encryption key is unhealthy, we're not ready
  // If external services are degraded but core dependencies are healthy, we're still ready
  const isReady = database.status === "healthy" && jwtSecret.status === "healthy" && encryptionKey.status === "healthy";

  const data: ReadinessResponse = {
    status: isReady ? "ready" : "not_ready",
    checks: {
      database,
      square,
      twilio,
      redis,
      jwt_secret: jwtSecret,
      encryption_key: encryptionKey,
    },
  };

  if (isReady) {
    res.json(data);
  } else {
    res.status(503).json(data);
  }
});

export default router;
