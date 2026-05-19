import { db, lockersTable, roomsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Seed lockers L1-L167
  const lockerValues = Array.from({ length: 167 }, (_, i) => ({
    name: `L${i + 1}`,
    status: "available" as const,
  }));

  await db.execute(sql`
    INSERT INTO lockers (name, status)
    SELECT unnest(${lockerValues.map(l => l.name)}::text[]), 'available'::resource_status
    ON CONFLICT (name) DO NOTHING
  `);
  console.log("Lockers seeded (L1-L167)");

  // Seed rooms R1-R38
  const roomValues = Array.from({ length: 38 }, (_, i) => ({
    name: `R${i + 1}`,
    status: "available" as const,
  }));

  await db.execute(sql`
    INSERT INTO rooms (name, status)
    SELECT unnest(${roomValues.map(r => r.name)}::text[]), 'available'::resource_status
    ON CONFLICT (name) DO NOTHING
  `);
  console.log("Rooms seeded (R1-R38)");

  // Seed default admin user
  const adminPassword = process.env.ADMIN_PASSWORD ?? "SpaFlow2024!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await db.execute(sql`
    INSERT INTO users (email, name, password_hash, role)
    VALUES ('admin@spaflow.com', 'Admin', ${adminHash}, 'MANAGER')
    ON CONFLICT (email) DO NOTHING
  `);
  console.log(`Admin user created: admin@spaflow.com / ${adminPassword}`);

  // Seed a staff user
  const staffPassword = "Staff2024!";
  const staffHash = await bcrypt.hash(staffPassword, 12);
  await db.execute(sql`
    INSERT INTO users (email, name, password_hash, role)
    VALUES ('staff@spaflow.com', 'Staff Member', ${staffHash}, 'STAFF')
    ON CONFLICT (email) DO NOTHING
  `);
  console.log(`Staff user created: staff@spaflow.com / ${staffPassword}`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
