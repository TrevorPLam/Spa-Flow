#!/usr/bin/env tsx
/**
 * PostgreSQL Query Performance Analysis Script
 * 
 * This script analyzes slow queries using pg_stat_statements extension,
 * identifies missing indexes, and suggests optimizations.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm run query-analysis
 * 
 * Prerequisites:
 *   - pg_stat_statements extension must be enabled in PostgreSQL
 *   - Database connection via DATABASE_URL environment variable
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from '../lib/db/src/env';

interface QueryStats {
  queryid: string;
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
}

interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

async function main() {
  console.log('=== PostgreSQL Query Performance Analysis ===\n');

  const config = getDatabaseConfig();
  const client = postgres(config.url);
  const db = drizzle(client);

  try {
    // Check if pg_stat_statements is enabled
    const extensionCheck = await client`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      )
    `;
    
    if (!extensionCheck[0].exists) {
      console.error('❌ pg_stat_statements extension is not enabled.');
      console.error('Run: CREATE EXTENSION pg_stat_statements;');
      process.exit(1);
    }

    console.log('✅ pg_stat_statements extension is enabled\n');

    // 1. Identify slow-running queries (total execution time > 1 second)
    console.log('=== SLOW RUNNING QUERIES (total_time > 1s) ===');
    const slowQueries = await client<QueryStats[]>`
      SELECT 
        queryid,
        LEFT(query, 100) as query,
        calls,
        total_time,
        mean_time,
        rows,
        shared_blks_hit,
        shared_blks_read
      FROM pg_stat_statements
      WHERE total_time > 1000
      ORDER BY total_time DESC
      LIMIT 20
    `;

    if (slowQueries.length === 0) {
      console.log('No slow queries found (total_time > 1s)\n');
    } else {
      console.log('Query | Calls | Total Time (ms) | Mean Time (ms) | Rows | Cache Hit Rate');
      console.log('---|---|---|---|---|---');
      
      for (const q of slowQueries) {
        const cacheHitRate = q.shared_blks_hit + q.shared_blks_read > 0
          ? ((q.shared_blks_hit / (q.shared_blks_hit + q.shared_blks_read)) * 100).toFixed(1)
          : 'N/A';
        
        console.log(
          `${q.query} | ${q.calls} | ${q.total_time.toFixed(2)} | ${q.mean_time.toFixed(2)} | ${q.rows} | ${cacheHitRate}%`
        );
      }
      console.log();
    }

    // 2. Identify frequently called queries with high mean time
    console.log('=== FREQUENTLY CALLED SLOW QUERIES (calls > 100, mean_time > 10ms) ===');
    const frequentSlowQueries = await client<QueryStats[]>`
      SELECT 
        queryid,
        LEFT(query, 100) as query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE calls > 100 AND mean_time > 10
      ORDER BY mean_time DESC
      LIMIT 20
    `;

    if (frequentSlowQueries.length === 0) {
      console.log('No frequently called slow queries found\n');
    } else {
      console.log('Query | Calls | Mean Time (ms) | Total Time (ms)');
      console.log('---|---|---|---');
      
      for (const q of frequentSlowQueries) {
        console.log(
          `${q.query} | ${q.calls} | ${q.mean_time.toFixed(2)} | ${q.total_time.toFixed(2)}`
        );
      }
      console.log();
    }

    // 3. Identify queries with low cache hit rate (< 80%)
    console.log('=== QUERIES WITH LOW CACHE HIT RATE (< 80%) ===');
    const lowCacheQueries = await client<QueryStats[]>`
      SELECT 
        queryid,
        LEFT(query, 100) as query,
        calls,
        total_time,
        shared_blks_hit,
        shared_blks_read,
        CASE 
          WHEN (shared_blks_hit + shared_blks_read) > 0 
          THEN (shared_blks_hit::float / (shared_blks_hit + shared_blks_read)) * 100 
          ELSE 100 
        END as cache_hit_rate
      FROM pg_stat_statements
      WHERE (shared_blks_hit + shared_blks_read) > 0
        AND (shared_blks_hit::float / (shared_blks_hit + shared_blks_read)) < 0.8
      ORDER BY cache_hit_rate ASC
      LIMIT 20
    `;

    if (lowCacheQueries.length === 0) {
      console.log('No queries with low cache hit rate found\n');
    } else {
      console.log('Query | Calls | Cache Hit Rate | Total Time (ms)');
      console.log('---|---|---|---');
      
      for (const q of lowCacheQueries) {
        const cacheHitRate = ((q.shared_blks_hit / (q.shared_blks_hit + q.shared_blks_read)) * 100).toFixed(1);
        console.log(
          `${q.query} | ${q.calls} | ${cacheHitRate}% | ${q.total_time.toFixed(2)}`
        );
      }
      console.log();
    }

    // 4. Analyze table sizes
    console.log('=== TABLE SIZES ===');
    const tableSizes = await client`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 20
    `;

    console.log('Schema | Table | Size');
    console.log('---|---|---');
    for (const table of tableSizes) {
      console.log(`${table.schemaname} | ${table.tablename} | ${table.size}`);
    }
    console.log();

    // 5. Identify missing indexes (heuristic based on query patterns)
    console.log('=== POTENTIAL INDEX SUGGESTIONS ===');
    const suggestions: IndexSuggestion[] = [];

    // Check for common patterns in slow queries
    for (const q of [...slowQueries, ...frequentSlowQueries]) {
      const query = q.query.toLowerCase();
      
      // WHERE clause on single column without index
      if (query.includes('where') && !query.includes('where (')) {
        const whereMatch = query.match(/where\s+(\w+)\s*=/);
        if (whereMatch) {
          const column = whereMatch[1];
          const tableMatch = query.match(/from\s+(\w+)/);
          if (tableMatch) {
            suggestions.push({
              table: tableMatch[1],
              columns: [column],
              reason: 'Frequent WHERE clause filter',
              impact: q.mean_time > 50 ? 'high' : 'medium',
            });
          }
        }
      }

      // ORDER BY without index
      if (query.includes('order by')) {
        const orderMatch = query.match(/order by\s+(\w+)/);
        if (orderMatch) {
          const column = orderMatch[1];
          const tableMatch = query.match(/from\s+(\w+)/);
          if (tableMatch) {
            suggestions.push({
              table: tableMatch[1],
              columns: [column],
              reason: 'Frequent ORDER BY operation',
              impact: 'medium',
            });
          }
        }
      }

      // JOIN without index on foreign key
      if (query.includes('join')) {
        const joinMatch = query.match(/join\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=/);
        if (joinMatch) {
          suggestions.push({
            table: joinMatch[1],
            columns: [joinMatch[3]],
            reason: 'JOIN condition on foreign key',
            impact: 'high',
          });
        }
      }
    }

    // Deduplicate suggestions
    const uniqueSuggestions = new Map<string, IndexSuggestion>();
    for (const suggestion of suggestions) {
      const key = `${suggestion.table}:${suggestion.columns.join(',')}`;
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, suggestion);
      }
    }

    if (uniqueSuggestions.size === 0) {
      console.log('No obvious index suggestions from query analysis\n');
    } else {
      console.log('Table | Columns | Reason | Impact');
      console.log('---|---|---|---');
      
      for (const suggestion of uniqueSuggestions.values()) {
        console.log(
          `${suggestion.table} | ${suggestion.columns.join(', ')} | ${suggestion.reason} | ${suggestion.impact}`
        );
      }
      console.log();
    }

    // 6. Check existing indexes
    console.log('=== EXISTING INDEXES ===');
    const existingIndexes = await client`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    console.log('Schema | Table | Index | Definition');
    console.log('---|---|---|---');
    for (const idx of existingIndexes) {
      console.log(`${idx.schemaname} | ${idx.tablename} | ${idx.indexname} | ${idx.indexdef}`);
    }
    console.log();

    // 7. Summary and recommendations
    console.log('=== SUMMARY AND RECOMMENDATIONS ===');
    console.log(`Total slow queries (>1s): ${slowQueries.length}`);
    console.log(`Total frequent slow queries: ${frequentSlowQueries.length}`);
    console.log(`Total low cache hit queries: ${lowCacheQueries.length}`);
    console.log(`Potential index suggestions: ${uniqueSuggestions.size}`);
    console.log();

    if (slowQueries.length > 0) {
      console.log('⚠️  Action Required:');
      console.log('   - Review slow queries and optimize them');
      console.log('   - Consider adding suggested indexes');
      console.log('   - Review query patterns for N+1 problems');
    } else if (frequentSlowQueries.length > 0) {
      console.log('⚠️  Action Required:');
      console.log('   - Optimize frequently called queries');
      console.log('   - Consider query caching for hot paths');
    } else {
      console.log('✅ No critical performance issues detected');
    }

  } catch (error) {
    console.error('Error during query analysis:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
