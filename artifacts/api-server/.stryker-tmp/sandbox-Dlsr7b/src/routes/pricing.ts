// @ts-nocheck
import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType, type ProductType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { CalculatePriceBody } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { withCache, buildCacheKey } from "../lib/cache";

const router = Router();

router.post("/pricing/calculate", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, resourceType, membershipType } = parsed.data;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const dob = maybeDecrypt(client.dobEncrypted, client.dobDek);

  // If buying membership as part of this transaction, treat as member
  const effectiveMembershipStatus = membershipType ?? client.membershipStatus;
  const customerType: CustomerType = effectiveMembershipStatus !== "none" ? "MEMBER" : "NON_MEMBER";
  const clientAge = dob ? calculateAge(dob) : 25;
  const hasBirthdayToday = dob ? isBirthdayToday(dob) : false;

  // Create cache key based on pricing parameters
  const now = new Date();
  const cacheKey = buildCacheKey(
    'pricing',
    resourceType.toUpperCase(),
    customerType,
    clientAge.toString(),
    hasBirthdayToday.toString(),
    Math.floor(now.getTime() / 3600000).toString() // Hour granularity for time-based pricing
  );

  // Cache pricing calculation with 1-hour TTL
  const pricingResult = await withCache(
    cacheKey,
    3600, // 1 hour TTL
    async () => {
      const result = calculatePrice({
        customerType,
        productType: resourceType.toUpperCase() as ProductType,
        startTime: now,
        clientAge,
        hasBirthdayToday,
      });
      const { tax, total } = computeTotal(result.subtotal);
      return { ...result, tax, total };
    }
  );

  res.json(pricingResult);
});

export default router;
