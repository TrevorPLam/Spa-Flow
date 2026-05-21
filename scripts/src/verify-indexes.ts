import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { logger } from './lib/logger';

async function verifyIndexes() {
  logger.info('Verifying database indexes...\n');

  // Query to get all indexes in the database
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  const indexes = result.rows as Array<{
    schemaname: string;
    tablename: string;
    indexname: string;
    indexdef: string;
  }>;

  // Expected indexes based on DATA-003
  const expectedIndexes = [
    'idx_clients_email',
    'idx_clients_phone',
    'idx_clients_member_id',
    'idx_clients_created_at',
    'idx_transactions_client_created',
    'idx_transactions_created_at',
    'idx_transactions_client_id',
    'idx_rental_sessions_client_status',
    'idx_rental_sessions_resource',
    'idx_rental_sessions_client_id',
    'idx_rental_sessions_status',
    'idx_waitlist_status_position',
    'idx_waitlist_client_id',
    'idx_waitlist_status',
  ];

  const foundIndexes = indexes.map(i => i.indexname);
  const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));

  logger.info('Expected indexes:');
  expectedIndexes.forEach(idx => {
    const found = foundIndexes.includes(idx);
    logger.info(`  ${found ? '✓' : '✗'} ${idx}`);
  });

  logger.info('\nAll indexes in database:');
  indexes.forEach(idx => {
    logger.info(`  ${idx.tablename}.${idx.indexname}`);
  });

  if (missingIndexes.length > 0) {
    logger.error('\nMissing indexes:', missingIndexes);
    process.exit(1);
  } else {
    logger.success('\nAll expected indexes are present!');
  }
}

verifyIndexes().catch(err => logger.error('Verify indexes failed:', err));
