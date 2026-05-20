import { db, lockersTable, roomsTable, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Validate required environment variables
  const adminPassword = process.env.ADMIN_PASSWORD;
  const staffPassword = process.env.STAFF_PASSWORD;

  if (!adminPassword) {
    console.error("ERROR: ADMIN_PASSWORD environment variable is required");
    console.error("Please set ADMIN_PASSWORD in your .env file before running the seed script");
    process.exit(1);
  }

  if (!staffPassword) {
    console.error("ERROR: STAFF_PASSWORD environment variable is required");
    console.error("Please set STAFF_PASSWORD in your .env file before running the seed script");
    process.exit(1);
  }

  // Seed lockers L1-L167
  const lockerValues = Array.from({ length: 167 }, (_, i) => ({
    name: `L${i + 1}`,
    status: "available" as const,
  }));

  for (const locker of lockerValues) {
    await db.insert(lockersTable).values(locker).onConflictDoNothing();
  }
  console.log("Lockers seeded (L1-L167)");

  // Seed rooms R1-R38
  const roomValues = Array.from({ length: 38 }, (_, i) => ({
    name: `R${i + 1}`,
    status: "available" as const,
  }));

  for (const room of roomValues) {
    await db.insert(roomsTable).values(room).onConflictDoNothing();
  }
  console.log("Rooms seeded (R1-R38)");

  // Seed default admin user
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await db.insert(usersTable).values({
    email: 'admin@spaflow.com',
    name: 'Admin',
    passwordHash: adminHash,
    role: 'MANAGER'
  }).onConflictDoNothing();
  console.log(`Admin user created: admin@spaflow.com`);

  // Seed a staff user
  const staffHash = await bcrypt.hash(staffPassword, 12);
  await db.insert(usersTable).values({
    email: 'staff@spaflow.com',
    name: 'Staff Member',
    passwordHash: staffHash,
    role: 'STAFF'
  }).onConflictDoNothing();
  console.log(`Staff user created: staff@spaflow.com`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
