import { db } from '@workspace/db';
import { clientsTable, membershipsTable, transactionsTable, rentalSessionsTable, lockersTable, roomsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './lib/logger';

async function testCascadeBehavior() {
  logger.info('=== Testing Foreign Key Cascade Behavior ===\n');

  // Clean up any existing test data from previous runs
  logger.info('Cleaning up any existing test data...');
  await db.delete(lockersTable).where(eq(lockersTable.name, 'L999'));
  await db.delete(roomsTable).where(eq(roomsTable.name, 'R999'));
  logger.info('✓ Cleaned up existing test data\n');

  // Test 1: Create client with dependent records and verify CASCADE
  logger.info('Test 1: Client deletion should CASCADE to dependent records');
  logger.info('--------------------------------------------------------');

  try {
    // Create test client
    const [client] = await db.insert(clientsTable).values({
      name: 'Cascade Test Client',
      email: 'cascade@test.com',
      membershipStatus: 'none',
    }).returning();

    logger.info(`✓ Created test client with ID: ${client.id}`);

    // Create dependent records
    const [membership] = await db.insert(membershipsTable).values({
      clientId: client.id,
      type: 'one_time',
    }).returning();
    logger.info(`✓ Created membership with ID: ${membership.id}`);

    const [transaction] = await db.insert(transactionsTable).values({
      clientId: client.id,
      amount: '100.00',
      tax: '8.88',
      total: '108.88',
      type: 'membership',
    }).returning();
    logger.info(`✓ Created transaction with ID: ${transaction.id}`);

    const [session] = await db.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: 'locker',
      resourceId: 1,
      resourceName: 'L1',
      status: 'active',
    }).returning();
    logger.info(`✓ Created rental session with ID: ${session.id}`);

    // Verify dependent records exist
    const beforeDelete = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
    logger.info(`✓ Client exists before deletion: ${beforeDelete.length > 0}`);

    // Delete client - should cascade
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    logger.info(`✓ Deleted client with ID: ${client.id}`);

    // Verify cascade worked - dependent records should be deleted
    const afterDeleteClient = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
    const afterDeleteMembership = await db.select().from(membershipsTable).where(eq(membershipsTable.id, membership.id));
    const afterDeleteTransaction = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transaction.id));
    const afterDeleteSession = await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));

    logger.info(`✓ Client deleted: ${afterDeleteClient.length === 0}`);
    logger.info(`✓ Membership cascaded: ${afterDeleteMembership.length === 0}`);
    logger.info(`✓ Transaction cascaded: ${afterDeleteTransaction.length === 0}`);
    logger.info(`✓ Rental session cascaded: ${afterDeleteSession.length === 0}`);

    if (afterDeleteClient.length === 0 &&
        afterDeleteMembership.length === 0 &&
        afterDeleteTransaction.length === 0 &&
        afterDeleteSession.length === 0) {
      logger.success('✅ Test 1 PASSED: CASCADE works correctly\n');
    } else {
      logger.error('❌ Test 1 FAILED: CASCADE did not work as expected\n');
    }
  } catch (error) {
    logger.error('❌ Test 1 ERROR:', error);
    logger.info('');
  }

  // Test 2: Verify RESTRICT on resources with active sessions
  logger.info('Test 2: Client deletion should RESTRICT when locker is assigned');
  logger.info('---------------------------------------------------------------');

  try {
    // Create test client
    const [client] = await db.insert(clientsTable).values({
      name: 'Restrict Test Client',
      email: 'restrict@test.com',
      membershipStatus: 'none',
    }).returning();

    // Create active session
    const [session] = await db.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: 'locker',
      resourceId: 999,
      resourceName: 'L999',
      status: 'active',
    }).returning();

    // Assign locker to session
    await db.insert(lockersTable).values({
      name: 'L999',
      status: 'occupied',
      clientId: client.id,
      sessionId: session.id,
    });

    logger.info(`✓ Created client with ID: ${client.id}`);
    logger.info(`✓ Created active session with ID: ${session.id}`);
    logger.info(`✓ Assigned locker L999 to session`);

    // Try to delete client - should fail due to RESTRICT on lockers.clientId
    try {
      await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
      logger.error('❌ Test 2 FAILED: Client deletion should have been RESTRICTED\n');
    } catch (error: any) {
      if (error.code === '23503' || error.cause?.code === '23503') {
        logger.info('✓ Client deletion correctly RESTRICTED due to active locker assignment');
        logger.success('✅ Test 2 PASSED: RESTRICT works correctly\n');
      } else {
        logger.error('❌ Test 2 FAILED: Wrong error type:', error.message);
        logger.info('');
      }
    }

    // Cleanup - must delete in correct order due to RESTRICT constraints
    await db.delete(lockersTable).where(eq(lockersTable.name, 'L999'));
    await db.delete(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    logger.info('✓ Cleaned up test data');
  } catch (error) {
    logger.error('❌ Test 2 ERROR:', error);
    logger.info('');
  }

  // Test 3: Verify RESTRICT on rooms with active sessions
  logger.info('Test 3: Client deletion should RESTRICT when room is assigned');
  logger.info('------------------------------------------------------------');

  try {
    // Create test client
    const [client] = await db.insert(clientsTable).values({
      name: 'Room Restrict Test Client',
      email: 'roomrestrict@test.com',
      membershipStatus: 'none',
    }).returning();

    // Create active session
    const [session] = await db.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: 'room',
      resourceId: 999,
      resourceName: 'R999',
      status: 'active',
    }).returning();

    // Assign room to session
    await db.insert(roomsTable).values({
      name: 'R999',
      status: 'occupied',
      clientId: client.id,
      sessionId: session.id,
    });

    logger.info(`✓ Created client with ID: ${client.id}`);
    logger.info(`✓ Created active session with ID: ${session.id}`);
    logger.info(`✓ Assigned room R999 to session`);

    // Try to delete client - should fail due to RESTRICT on rooms.clientId
    try {
      await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
      logger.error('❌ Test 3 FAILED: Client deletion should have been RESTRICTED\n');
    } catch (error: any) {
      if (error.code === '23503' || error.cause?.code === '23503') {
        logger.info('✓ Client deletion correctly RESTRICTED due to active room assignment');
        logger.success('✅ Test 3 PASSED: RESTRICT works correctly on rooms\n');
      } else {
        logger.error('❌ Test 3 FAILED: Wrong error type:', error.message);
        logger.info('');
      }
    }

    // Cleanup - must delete in correct order due to RESTRICT constraints
    await db.delete(roomsTable).where(eq(roomsTable.name, 'R999'));
    await db.delete(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    logger.info('✓ Cleaned up test data');
  } catch (error) {
    logger.error('❌ Test 3 ERROR:', error);
    logger.info('');
  }

  logger.info('=== Cascade Testing Complete ===');
}

testCascadeBehavior().catch(err => logger.error('Test cascade behavior failed:', err));
