import { db } from '@workspace/db';
import { usersTable, clientsTable, lockersTable, roomsTable, membershipsTable } from '@workspace/db/schema';
import { SEED_USERS, SEED_CLIENTS, SEED_LOCKERS, SEED_ROOMS, getSeedMemberships } from './seed-data';

/**
 * Seed test data into the database
 * This function is idempotent - it can be run multiple times safely
 * Uses transactions to ensure atomicity
 */
export async function seedTestData(): Promise<void> {
  console.log('Seeding test data...');

  await db.transaction(async (tx) => {
    // Seed users (3 users: 1 manager, 2 staff)
    for (const user of SEED_USERS) {
      await tx.insert(usersTable).values(user).onConflictDoNothing();
    }
    console.log(`Seeded ${SEED_USERS.length} users`);

    // Seed clients (5 clients)
    const insertedClients = [];
    for (const client of SEED_CLIENTS) {
      const result = await tx.insert(clientsTable).values(client).onConflictDoNothing().returning();
      if (result.length > 0) {
        insertedClients.push(result[0]);
      }
    }
    console.log(`Seeded ${SEED_CLIENTS.length} clients`);

    // Seed lockers (3 lockers)
    for (const locker of SEED_LOCKERS) {
      await tx.insert(lockersTable).values(locker).onConflictDoNothing();
    }
    console.log(`Seeded ${SEED_LOCKERS.length} lockers`);

    // Seed rooms (2 rooms)
    for (const room of SEED_ROOMS) {
      await tx.insert(roomsTable).values(room).onConflictDoNothing();
    }
    console.log(`Seeded ${SEED_ROOMS.length} rooms`);

    // Seed memberships (2 memberships) - depends on clients being seeded first
    // Use the actual client IDs from inserted clients
    if (insertedClients.length >= 3) {
      const clientIds = insertedClients.map(c => c.id);
      const memberships = getSeedMemberships(clientIds);
      for (const membership of memberships) {
        await tx.insert(membershipsTable).values(membership).onConflictDoNothing();
      }
      console.log(`Seeded ${memberships.length} memberships`);
    }
  });

  console.log('Test data seeding complete!');
}

/**
 * Clean up seeded test data from the database
 * This function deletes seeded data in reverse dependency order
 * to respect foreign key constraints
 */
export async function cleanupTestData(): Promise<void> {
  console.log('Cleaning up test data...');

  await db.transaction(async (tx) => {
    // Delete in reverse dependency order
    await tx.delete(membershipsTable);
    await tx.delete(roomsTable);
    await tx.delete(lockersTable);
    await tx.delete(clientsTable);
    await tx.delete(usersTable);
  });

  console.log('Test data cleanup complete!');
}

/**
 * Seed test data for standalone execution (e.g., local development)
 * This function can be run directly via npm script
 */
async function main(): Promise<void> {
  try {
    await seedTestData();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
