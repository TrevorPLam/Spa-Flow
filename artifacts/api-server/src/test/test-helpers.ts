import request from 'supertest';
import app from '../app';
import { signToken } from '../lib/auth';
import { db } from '@workspace/db';
import { clientsTable, lockersTable, roomsTable, usersTable } from '@workspace/db/schema';

export { cleanDatabase } from '../../../../lib/test-utils/src';

// Test helpers for API testing
export async function createAuthenticatedRequest(role: 'STAFF' | 'MANAGER' = 'STAFF') {
  const payload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    role,
    name: 'Test User',
  };
  
  const token = await signToken(payload);
  
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createTestClientInDb(clientData?: Partial<typeof clientsTable.$inferInsert>) {
  const client: typeof clientsTable.$inferInsert = {
    email: clientData?.email || `test-${Date.now()}@example.com`,
    phone: clientData?.phone || '555-0100',
    memberId: clientData?.memberId || `MEM${Date.now()}`,
    name: clientData?.name || 'Test Client',
    membershipStatus: clientData?.membershipStatus || 'none',
    dobEncrypted: clientData?.dobEncrypted ?? null,
    addressEncrypted: clientData?.addressEncrypted ?? null,
  };
  
  const [result] = await db.insert(clientsTable).values(client).returning();
  return result;
}

export async function createTestLockerInDb(lockerData?: Partial<typeof lockersTable.$inferInsert>) {
  const locker = {
    name: `L${Date.now()}`,
    status: 'available' as const,
    ...lockerData,
  };
  
  const [result] = await db.insert(lockersTable).values(locker).returning();
  return result;
}

export async function createTestRoomInDb(roomData?: Partial<typeof roomsTable.$inferInsert>) {
  const room: typeof roomsTable.$inferInsert = {
    name: roomData?.name || `R${Date.now()}`,
    status: roomData?.status || 'available',
    clientId: roomData?.clientId ?? null,
    sessionId: roomData?.sessionId ?? null,
    startTime: roomData?.startTime ?? null,
    expiresAt: roomData?.expiresAt ?? null,
  };
  
  const [result] = await db.insert(roomsTable).values(room).returning();
  return result;
}

export async function createTestUserInDb(userData?: Partial<typeof usersTable.$inferInsert>) {
  const user: typeof usersTable.$inferInsert = {
    email: userData?.email || `user-${Date.now()}@example.com`,
    passwordHash: userData?.passwordHash || '$2a$10$test',
    role: userData?.role || 'STAFF',
    name: userData?.name || 'Test User',
  };
  
  const [result] = await db.insert(usersTable).values(user).returning();
  return result;
}

export const api = request(app);
