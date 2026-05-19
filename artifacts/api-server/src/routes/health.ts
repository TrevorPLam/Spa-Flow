import { Router, type IRouter } from "express";
import { LivenessResponse, ReadinessResponse, HealthCheckStatus } from "@workspace/api-zod";
import { db, pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getTwilioCredentials, getTwilioAuthHeader } from "../lib/env";

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
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = process.env.SQUARE_ENVIRONMENT ?? "sandbox";
    
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
        "Square-Version": "2024-01-18",
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

// Liveness probe - simple check if application is running
// Should be fast (<100ms) and avoid I/O operations that could fail
router.get("/healthz/live", (_req, res) => {
  const uptime = process.uptime();
  const data: LivenessResponse = {
    status: "ok",
    uptime: Math.floor(uptime),
    timestamp: new Date(),
  };
  res.json(data);
});

// Readiness probe - checks if dependencies are available
// Should check database, external services
router.get("/healthz/ready", async (_req, res) => {
  const [database, square, twilio] = await Promise.all([
    checkDatabase(),
    checkSquare(),
    checkTwilio(),
  ]);

  // Determine overall readiness
  // If database is unhealthy, we're not ready
  // If external services are degraded but database is healthy, we're still ready
  const isReady = database.status === "healthy";

  const data: ReadinessResponse = {
    status: isReady ? "ready" : "not_ready",
    checks: {
      database,
      square,
      twilio,
    },
  };

  if (isReady) {
    res.json(data);
  } else {
    res.status(503).json(data);
  }
});

export default router;
