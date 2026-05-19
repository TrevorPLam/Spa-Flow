import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { calculatePrice, computeTotal, calculateAge, isBirthdayToday, type CustomerType, type ProductType } from "../lib/pricing";
import { maybeDecrypt } from "../lib/encryption";
import { CalculatePriceBody } from "@workspace/api-zod";

const router = Router();

router.post("/pricing/calculate", requireAuth, async (req, res): Promise<void> => {
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

  const { subtotal, appliedRules } = calculatePrice({
    customerType,
    productType: resourceType.toUpperCase() as ProductType,
    startTime: new Date(),
    clientAge,
    hasBirthdayToday,
  });
  const { tax, total } = computeTotal(subtotal);

  res.json({ subtotal, tax, total, appliedRules });
});

export default router;
