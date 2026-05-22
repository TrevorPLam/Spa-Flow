import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { normalizePhone, normalizeEmail } from "../artifacts/api-server/src/services/data-quality";

/**
 * Data cleanup script
 * Fixes common data issues in the client database
 * Requires confirmation before making changes
 */

interface CleanupIssue {
  clientId: number;
  field: string;
  currentValue: string | null;
  proposedValue: string | null;
  reason: string;
}

/**
 * Normalizes phone number format
 * Converts to standard format: (XXX) XXX-XXXX
 */
function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = normalizePhone(phone);
  if (digits.length < 10) return phone; // Don't format invalid numbers
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle international numbers (just return normalized digits)
  return digits;
}

/**
 * Trims whitespace from email and converts to lowercase
 */
function formatEmail(email: string | null): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Trims whitespace from name
 */
function formatName(name: string | null): string | null {
  if (!name) return null;
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Scans for data cleanup issues
 */
async function scanForIssues(): Promise<CleanupIssue[]> {
  const clients = await db.select().from(clientsTable);
  const issues: CleanupIssue[] = [];

  for (const client of clients) {
    // Check phone format
    if (client.phone) {
      const formatted = formatPhone(client.phone);
      if (formatted !== client.phone) {
        issues.push({
          clientId: client.id,
          field: "phone",
          currentValue: client.phone,
          proposedValue: formatted,
          reason: "Phone number format normalization",
        });
      }
    }

    // Check email format
    if (client.email) {
      const formatted = formatEmail(client.email);
      if (formatted !== client.email) {
        issues.push({
          clientId: client.id,
          field: "email",
          currentValue: client.email,
          proposedValue: formatted,
          reason: "Email normalization (lowercase, trim)",
        });
      }
    }

    // Check name format
    if (client.name) {
      const formatted = formatName(client.name);
      if (formatted !== client.name) {
        issues.push({
          clientId: client.id,
          field: "name",
          currentValue: client.name,
          proposedValue: formatted,
          reason: "Name whitespace cleanup",
        });
      }
    }
  }

  return issues;
}

/**
 * Applies a cleanup fix
 */
async function applyFix(issue: CleanupIssue): Promise<void> {
  const updateData: Record<string, string> = {};
  
  switch (issue.field) {
    case "phone":
      updateData.phone = issue.proposedValue!;
      break;
    case "email":
      updateData.email = issue.proposedValue!;
      break;
    case "name":
      updateData.name = issue.proposedValue!;
      break;
  }

  await db
    .update(clientsTable)
    .set(updateData)
    .where(eq(clientsTable.id, issue.clientId));
}

/**
 * Main execution
 */
async function main() {
  console.log("🔍 Scanning for data cleanup issues...\n");

  const issues = await scanForIssues();

  if (issues.length === 0) {
    console.log("✅ No data cleanup issues found.");
    process.exit(0);
  }

  console.log(`Found ${issues.length} issues:\n`);

  // Group by field type
  const byField = new Map<string, CleanupIssue[]>();
  for (const issue of issues) {
    if (!byField.has(issue.field)) {
      byField.set(issue.field, []);
    }
    byField.get(issue.field)!.push(issue);
  }

  // Display issues grouped by field
  for (const [field, fieldIssues] of byField.entries()) {
    console.log(`\n${field.toUpperCase()} issues (${fieldIssues.length}):`);
    for (const issue of fieldIssues.slice(0, 10)) { // Show first 10 of each type
      console.log(`  Client ${issue.clientId}:`);
      console.log(`    Current: "${issue.currentValue}"`);
      console.log(`    Proposed: "${issue.proposedValue}"`);
      console.log(`    Reason: ${issue.reason}`);
    }
    if (fieldIssues.length > 10) {
      console.log(`  ... and ${fieldIssues.length - 10} more`);
    }
  }

  console.log(`\n⚠️  Total issues: ${issues.length}`);
  console.log("\n⚠️  This will modify client data. Make sure you have a backup!");
  
  // In a real script, we would prompt for confirmation here
  // For automation, we'll just report the issues
  console.log("\n💡 To apply fixes, modify this script to call applyFix() for each issue.");
  
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
