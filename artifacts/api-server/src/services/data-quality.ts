import { db, clientsTable, rentalSessionsTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { writeAuditLog } from "../lib/audit";
import { logger } from "../lib/logger";

/**
 * Confidence score for duplicate detection (0-1)
 * Higher score = more likely to be a duplicate
 */
export interface DuplicateCandidate {
  /** Primary client ID */
  primaryId: number;
  /** Potential duplicate client ID */
  duplicateId: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the match */
  reason: string;
  /** Matching fields */
  matchingFields: string[];
}

/**
 * Data validation result
 */
export interface ValidationResult {
  /** Field name */
  field: string;
  /** Whether the field is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Current value */
  value: string | null;
}

/**
 * Data anomaly detection result
 */
export interface AnomalyResult {
  /** Client ID */
  clientId: number;
  /** Type of anomaly */
  type: string;
  /** Description of the anomaly */
  description: string;
  /** Severity (low, medium, high) */
  severity: "low" | "medium" | "high";
}

/**
 * Client merge result
 */
export interface MergeResult {
  /** Primary client ID (survivor) */
  primaryId: number;
  /** Duplicate client ID (to be archived) */
  duplicateId: number;
  /** Number of rental sessions merged */
  sessionsMerged: number;
  /** Number of transactions merged */
  transactionsMerged: number;
  /** Whether the merge was successful */
  success: boolean;
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching of names and other text fields
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits required to transform a into b
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score
 */
function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - distance / maxLength;
}

/**
 * Normalizes phone number for comparison
 * Removes all non-digit characters
 *
 * @param phone - Phone number string
 * @returns Normalized phone number (digits only)
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Normalizes email for comparison
 * Converts to lowercase and trims whitespace
 *
 * @param email - Email string
 * @returns Normalized email
 */
function normalizeEmail(email: string | null): string {
  if (!email) return "";
  return email.toLowerCase().trim();
}

/**
 * Detects potential duplicate clients
 * Uses fuzzy matching on name, phone, and email
 *
 * @param limit - Maximum number of candidates to return
 * @param minConfidence - Minimum confidence score (0-1)
 * @returns Array of duplicate candidates
 */
export async function detectDuplicates(
  limit: number = 100,
  minConfidence: number = 0.7
): Promise<DuplicateCandidate[]> {
  const clients = await db.select().from(clientsTable);
  const candidates: DuplicateCandidate[] = [];

  // Compare each client with every other client
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const clientA = clients[i];
      const clientB = clients[j];
      
      const matchingFields: string[] = [];
      let confidence = 0;
      let reason = "";

      // Check phone number match (exact or normalized)
      const phoneA = normalizePhone(clientA.phone);
      const phoneB = normalizePhone(clientB.phone);
      if (phoneA && phoneB && phoneA === phoneB) {
        matchingFields.push("phone");
        confidence += 0.5;
        reason = "Phone number match";
      }

      // Check email match (exact or normalized)
      const emailA = normalizeEmail(clientA.email);
      const emailB = normalizeEmail(clientB.email);
      if (emailA && emailB && emailA === emailB) {
        matchingFields.push("email");
        confidence += 0.5;
        reason = "Email match";
      }

      // Check name similarity (fuzzy)
      if (clientA.name && clientB.name) {
        const nameSimilarity = similarityScore(clientA.name, clientB.name);
        if (nameSimilarity >= 0.8) {
          matchingFields.push("name");
          confidence += nameSimilarity * 0.3;
          if (!reason) reason = `Name similarity: ${(nameSimilarity * 100).toFixed(0)}%`;
        }
      }

      // Check member ID match
      if (clientA.memberId && clientB.memberId && clientA.memberId === clientB.memberId) {
        matchingFields.push("memberId");
        confidence += 0.4;
        reason = "Member ID match";
      }

      // Cap confidence at 1.0
      confidence = Math.min(confidence, 1.0);

      // Only include if confidence meets threshold
      if (confidence >= minConfidence && matchingFields.length > 0) {
        candidates.push({
          primaryId: clientA.id,
          duplicateId: clientB.id,
          confidence,
          reason,
          matchingFields,
        });
      }
    }
  }

  // Sort by confidence (highest first) and limit results
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates.slice(0, limit);
}

/**
 * Validates a client's data
 * Checks phone format, email format, DOB validity, address completeness
 *
 * @param client - Client object
 * @returns Array of validation results
 */
export function validateClientData(client: {
  phone?: string | null;
  email?: string | null;
  dobEncrypted?: string | null;
  addressEncrypted?: string | null;
}): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Validate phone format
  if (client.phone) {
    const phoneDigits = normalizePhone(client.phone);
    if (phoneDigits.length < 10) {
      results.push({
        field: "phone",
        valid: false,
        error: "Phone number must have at least 10 digits",
        value: client.phone,
      });
    } else {
      results.push({
        field: "phone",
        valid: true,
        value: client.phone,
      });
    }
  } else {
    results.push({
      field: "phone",
      valid: true,
      value: null,
    });
  }

  // Validate email format
  if (client.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      results.push({
        field: "email",
        valid: false,
        error: "Invalid email format",
        value: client.email,
      });
    } else {
      results.push({
        field: "email",
        valid: true,
        value: client.email,
      });
    }
  } else {
    results.push({
      field: "email",
      valid: true,
      value: null,
    });
  }

  // Note: DOB and address are encrypted, so we can't validate their format
  // without decryption. This would require manager authorization.

  return results;
}

/**
 * Detects data anomalies in the client database
 * Checks for missing data, unusual patterns, etc.
 *
 * @returns Array of anomaly results
 */
export async function detectAnomalies(): Promise<AnomalyResult[]> {
  const clients = await db.select().from(clientsTable);
  const anomalies: AnomalyResult[] = [];

  for (const client of clients) {
    // Check for clients with no contact information
    if (!client.phone && !client.email) {
      anomalies.push({
        clientId: client.id,
        type: "missing_contact",
        description: "Client has no phone or email",
        severity: "medium",
      });
    }

    // Check for clients with membership but no member ID
    if (client.membershipStatus !== "none" && !client.memberId) {
      anomalies.push({
        clientId: client.id,
        type: "missing_member_id",
        description: "Client has membership but no member ID",
        severity: "high",
      });
    }

    // Check for expired memberships
    if (
      client.membershipExpiresAt &&
      new Date(client.membershipExpiresAt) < new Date() &&
      client.membershipStatus !== "none"
    ) {
      anomalies.push({
        clientId: client.id,
        type: "expired_membership",
        description: "Client has expired membership status",
        severity: "low",
      });
    }

    // Check for duplicate member IDs (excluding null)
    if (client.memberId) {
      const duplicateCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(clientsTable)
        .where(eq(clientsTable.memberId, client.memberId));
      
      if (duplicateCount[0]?.count > 1) {
        anomalies.push({
          clientId: client.id,
          type: "duplicate_member_id",
          description: "Member ID is shared with another client",
          severity: "high",
        });
      }
    }
  }

  return anomalies;
}

/**
 * Merges a duplicate client into a primary client
 * Moves rental sessions and transactions from duplicate to primary
 * Archives the duplicate client
 *
 * @param primaryId - Primary client ID (survivor)
 * @param duplicateId - Duplicate client ID (to be archived)
 * @param userId - User ID performing the merge (for audit)
 * @returns Merge result
 */
export async function mergeClients(
  primaryId: number,
  duplicateId: number,
  userId: number
): Promise<MergeResult> {
  try {
    // Verify both clients exist
    const [primary, duplicate] = await Promise.all([
      db.select().from(clientsTable).where(eq(clientsTable.id, primaryId)).limit(1),
      db.select().from(clientsTable).where(eq(clientsTable.id, duplicateId)).limit(1),
    ]);

    if (!primary.length) {
      throw new Error(`Primary client ${primaryId} not found`);
    }
    if (!duplicate.length) {
      throw new Error(`Duplicate client ${duplicateId} not found`);
    }

    // Start a transaction to move rental sessions
    const sessionsUpdated = await db
      .update(rentalSessionsTable)
      .set({ clientId: primaryId })
      .where(eq(rentalSessionsTable.clientId, duplicateId))
      .returning();

    // Move transactions
    const transactionsUpdated = await db
      .update(transactionsTable)
      .set({ clientId: primaryId })
      .where(eq(transactionsTable.clientId, duplicateId))
      .returning();

    // Archive the duplicate client by adding a prefix to the name
    await db
      .update(clientsTable)
      .set({ 
        name: `[MERGED-${primaryId}] ${duplicate[0].name}`,
        notes: duplicate[0].notes 
          ? `MERGED into client ${primaryId} on ${new Date().toISOString()}. ${duplicate[0].notes}`
          : `MERGED into client ${primaryId} on ${new Date().toISOString()}`,
      })
      .where(eq(clientsTable.id, duplicateId));

    // Write audit log
    await writeAuditLog({
      userId,
      action: "MERGE_CLIENTS",
      resourceType: "CLIENT",
      resourceId: primaryId,
      description: `Merged client ${duplicateId} into client ${primaryId}. Moved ${sessionsUpdated.length} sessions and ${transactionsUpdated.length} transactions.`,
    });

    logger.info({
      primaryId,
      duplicateId,
      userId,
      sessionsMerged: sessionsUpdated.length,
      transactionsMerged: transactionsUpdated.length,
    }, "Client merge completed");

    return {
      primaryId,
      duplicateId,
      sessionsMerged: sessionsUpdated.length,
      transactionsMerged: transactionsUpdated.length,
      success: true,
    };
  } catch (error) {
    logger.error({ error, primaryId, duplicateId, userId }, "Client merge failed");
    
    await writeAuditLog({
      userId,
      action: "MERGE_CLIENTS_FAILED",
      resourceType: "CLIENT",
      resourceId: primaryId,
      description: `Failed to merge client ${duplicateId} into client ${primaryId}: ${error instanceof Error ? error.message : String(error)}`,
    });

    throw error;
  }
}

/**
 * Validates multiple clients in bulk
 *
 * @param clientIds - Array of client IDs to validate
 * @returns Map of client ID to validation results
 */
export async function bulkValidateClients(clientIds: number[]): Promise<Map<number, ValidationResult[]>> {
  const results = new Map<number, ValidationResult[]>();

  for (const clientId of clientIds) {
    const clients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    if (clients.length > 0) {
      const validation = validateClientData(clients[0]);
      results.set(clientId, validation);
    }
  }

  return results;
}
