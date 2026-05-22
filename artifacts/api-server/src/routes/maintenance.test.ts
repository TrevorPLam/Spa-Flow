import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { db, lockersTable, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { cleanDatabase, createAuthenticatedRequest, createTestLockerInDb, createTestRoomInDb, createTestUserInDb } from "../test/test-helpers";
import app from "../app";

describe("Maintenance Routes", () => {
  let managerHeaders: Record<string, string>;
  let staffHeaders: Record<string, string>;
  let testLockerId: number;
  let testRoomId: number;

  beforeAll(async () => {
    await cleanDatabase();

    await createTestUserInDb({ role: "MANAGER" });
    await createTestUserInDb({ role: "STAFF" });
    managerHeaders = await createAuthenticatedRequest("MANAGER");
    staffHeaders = await createAuthenticatedRequest("STAFF");

    const locker = await createTestLockerInDb();
    testLockerId = locker.id;
    const room = await createTestRoomInDb();
    testRoomId = room.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  beforeEach(async () => {
    // Reset resources to available state
    await db.update(lockersTable).set({ status: "available", maintenanceNotes: null }).where(eq(lockersTable.id, testLockerId));
    await db.update(roomsTable).set({ status: "available", maintenanceNotes: null }).where(eq(roomsTable.id, testRoomId));
  });

  describe("POST /maintenance/:resourceType/:id", () => {
    it("should set a locker to maintenance with manager role", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "Broken lock mechanism" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("maintenance");
      expect(response.body.maintenanceNotes).toBe("Broken lock mechanism");

      const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, testLockerId));
      expect(locker.status).toBe("maintenance");
      expect(locker.maintenanceNotes).toBe("Broken lock mechanism");
    });

    it("should set a room to maintenance with manager role", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/room/${testRoomId}`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "Plumbing repair needed" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("maintenance");
      expect(response.body.maintenanceNotes).toBe("Plumbing repair needed");

      const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, testRoomId));
      expect(room.status).toBe("maintenance");
      expect(room.maintenanceNotes).toBe("Plumbing repair needed");
    });

    it("should reject maintenance request without notes", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Maintenance notes are required");
    });

    it("should reject maintenance request from staff", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(staffHeaders)
        .send({ maintenanceNotes: "Test maintenance" });

      expect(response.status).toBe(403);
    });

    it("should reject setting occupied locker to maintenance", async () => {
      await db.update(lockersTable).set({ status: "occupied" }).where(eq(lockersTable.id, testLockerId));

      const response = await request(app)
        .post(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "Test maintenance" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Cannot set locker to maintenance while it is occupied");
    });

    it("should reject invalid resource type", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/invalid/${testLockerId}`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "Test maintenance" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid resource type");
    });

    it("should reject non-existent resource", async () => {
      const response = await request(app)
        .post(`/api/v1/maintenance/locker/99999`)
        .set(managerHeaders)
        .send({ maintenanceNotes: "Test maintenance" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("not found");
    });
  });

  describe("DELETE /maintenance/:resourceType/:id", () => {
    it("should remove a locker from maintenance with manager role", async () => {
      await db.update(lockersTable).set({ status: "maintenance", maintenanceNotes: "Test" }).where(eq(lockersTable.id, testLockerId));

      const response = await request(app)
        .delete(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("available");
      expect(response.body.maintenanceNotes).toBeNull();

      const [locker] = await db.select().from(lockersTable).where(eq(lockersTable.id, testLockerId));
      expect(locker.status).toBe("available");
      expect(locker.maintenanceNotes).toBeNull();
    });

    it("should remove a room from maintenance with manager role", async () => {
      await db.update(roomsTable).set({ status: "maintenance", maintenanceNotes: "Test" }).where(eq(roomsTable.id, testRoomId));

      const response = await request(app)
        .delete(`/api/v1/maintenance/room/${testRoomId}`)
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("available");
      expect(response.body.maintenanceNotes).toBeNull();

      const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, testRoomId));
      expect(room.status).toBe("available");
      expect(room.maintenanceNotes).toBeNull();
    });

    it("should reject removal request from staff", async () => {
      const response = await request(app)
        .delete(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(staffHeaders);

      expect(response.status).toBe(403);
    });

    it("should reject removing resource not in maintenance", async () => {
      const response = await request(app)
        .delete(`/api/v1/maintenance/locker/${testLockerId}`)
        .set(managerHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("not in maintenance");
    });
  });

  describe("GET /maintenance", () => {
    it("should get all resources in maintenance with manager role", async () => {
      await db.update(lockersTable).set({ status: "maintenance", maintenanceNotes: "Locker issue" }).where(eq(lockersTable.id, testLockerId));
      await db.update(roomsTable).set({ status: "maintenance", maintenanceNotes: "Room issue" }).where(eq(roomsTable.id, testRoomId));

      const response = await request(app)
        .get("/api/v1/maintenance")
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.lockers).toHaveLength(1);
      expect(response.body.lockers[0].id).toBe(testLockerId);
      expect(response.body.lockers[0].maintenanceNotes).toBe("Locker issue");
      expect(response.body.rooms).toHaveLength(1);
      expect(response.body.rooms[0].id).toBe(testRoomId);
      expect(response.body.rooms[0].maintenanceNotes).toBe("Room issue");
    });

    it("should return empty arrays when no resources in maintenance", async () => {
      const response = await request(app)
        .get("/api/v1/maintenance")
        .set(managerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.lockers).toHaveLength(0);
      expect(response.body.rooms).toHaveLength(0);
    });

    it("should reject request from staff", async () => {
      const response = await request(app)
        .get("/api/v1/maintenance")
        .set(staffHeaders);

      expect(response.status).toBe(403);
    });
  });
});
