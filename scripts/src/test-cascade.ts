import { db } from '@workspace/db';
import { clientsTable, membershipsTable, transactionsTable, rentalSessionsTable, lockersTable, roomsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

async function testCascadeBehavior() {
  console.log('=== Testing Foreign Key Cascade Behavior ===\n');

  // Clean up any existing test data from previous runs
  console.log('Cleaning up any existing test data...');
  await db.delete(lockersTable).where(eq(lockersTable.name, 'L999'));
  await db.delete(roomsTable).where(eq(roomsTable.name, 'R999'));
  console.log('✓ Cleaned up existing test data\n');

  // Test 1: Create client with dependent records and verify CASCADE
  console.log('Test 1: Client deletion should CASCADE to dependent records');
  console.log('--------------------------------------------------------');
  
  try {
    // Create test client
    const [client] = await db.insert(clientsTable).values({
      name: 'Cascade Test Client',
      email: 'cascade@test.com',
      membershipStatus: 'none',
    }).returning();
    
    console.log(`✓ Created test client with ID: ${client.id}`);

    // Create dependent records
    const [membership] = await db.insert(membershipsTable).values({
      clientId: client.id,
      type: 'one_time',
    }).returning();
    console.log(`✓ Created membership with ID: ${membership.id}`);

    const [transaction] = await db.insert(transactionsTable).values({
      clientId: client.id,
      amount: '100.00',
      tax: '8.88',
      total: '108.88',
      type: 'membership',
    }).returning();
    console.log(`✓ Created transaction with ID: ${transaction.id}`);

    const [session] = await db.insert(rentalSessionsTable).values({
      clientId: client.id,
      resourceType: 'locker',
      resourceId: 1,
      resourceName: 'L1',
      status: 'active',
    }).returning();
    console.log(`✓ Created rental session with ID: ${session.id}`);

    // Verify dependent records exist
    const beforeDelete = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
    console.log(`✓ Client exists before deletion: ${beforeDelete.length > 0}`);

    // Delete client - should cascade
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    console.log(`✓ Deleted client with ID: ${client.id}`);

    // Verify cascade worked - dependent records should be deleted
    const afterDeleteClient = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id));
    const afterDeleteMembership = await db.select().from(membershipsTable).where(eq(membershipsTable.id, membership.id));
    const afterDeleteTransaction = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transaction.id));
    const afterDeleteSession = await db.select().from(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));

    console.log(`✓ Client deleted: ${afterDeleteClient.length === 0}`);
    console.log(`✓ Membership cascaded: ${afterDeleteMembership.length === 0}`);
    console.log(`✓ Transaction cascaded: ${afterDeleteTransaction.length === 0}`);
    console.log(`✓ Rental session cascaded: ${afterDeleteSession.length === 0}`);

    if (afterDeleteClient.length === 0 && 
        afterDeleteMembership.length === 0 && 
        afterDeleteTransaction.length === 0 && 
        afterDeleteSession.length === 0) {
      console.log('✅ Test 1 PASSED: CASCADE works correctly\n');
    } else {
      console.log('❌ Test 1 FAILED: CASCADE did not work as expected\n');
    }
  } catch (error) {
    console.error('❌ Test 1 ERROR:', error);
    console.log('');
  }

  // Test 2: Verify RESTRICT on resources with active sessions
  console.log('Test 2: Client deletion should RESTRICT when locker is assigned');
  console.log('---------------------------------------------------------------');

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

    console.log(`✓ Created client with ID: ${client.id}`);
    console.log(`✓ Created active session with ID: ${session.id}`);
    console.log(`✓ Assigned locker L999 to session`);

    // Try to delete client - should fail due to RESTRICT on lockers.clientId
    try {
      await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
      console.log('❌ Test 2 FAILED: Client deletion should have been RESTRICTED\n');
    } catch (error: any) {
      if (error.code === '23503' || error.cause?.code === '23503') {
        console.log('✓ Client deletion correctly RESTRICTED due to active locker assignment');
        console.log('✅ Test 2 PASSED: RESTRICT works correctly\n');
      } else {
        console.log('❌ Test 2 FAILED: Wrong error type:', error.message);
        console.log('');
      }
    }

    // Cleanup - must delete in correct order due to RESTRICT constraints
    await db.delete(lockersTable).where(eq(lockersTable.name, 'L999'));
    await db.delete(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    console.log('✓ Cleaned up test data');
  } catch (error) {
    console.error('❌ Test 2 ERROR:', error);
    console.log('');
  }

  // Test 3: Verify RESTRICT on rooms with active sessions
  console.log('Test 3: Client deletion should RESTRICT when room is assigned');
  console.log('------------------------------------------------------------');

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

    console.log(`✓ Created client with ID: ${client.id}`);
    console.log(`✓ Created active session with ID: ${session.id}`);
    console.log(`✓ Assigned room R999 to session`);

    // Try to delete client - should fail due to RESTRICT on rooms.clientId
    try {
      await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
      console.log('❌ Test 3 FAILED: Client deletion should have been RESTRICTED\n');
    } catch (error: any) {
      if (error.code === '23503' || error.cause?.code === '23503') {
        console.log('✓ Client deletion correctly RESTRICTED due to active room assignment');
        console.log('✅ Test 3 PASSED: RESTRICT works correctly on rooms\n');
      } else {
        console.log('❌ Test 3 FAILED: Wrong error type:', error.message);
        console.log('');
      }
    }

    // Cleanup - must delete in correct order due to RESTRICT constraints
    await db.delete(roomsTable).where(eq(roomsTable.name, 'R999'));
    await db.delete(rentalSessionsTable).where(eq(rentalSessionsTable.id, session.id));
    await db.delete(clientsTable).where(eq(clientsTable.id, client.id));
    console.log('✓ Cleaned up test data');
  } catch (error) {
    console.error('❌ Test 3 ERROR:', error);
    console.log('');
  }

  console.log('=== Cascade Testing Complete ===');
}

testCascadeBehavior().catch(console.error);
