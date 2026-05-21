---
name: deployment-build
description: Building and deploying the application with esbuild, environment-specific configurations, and graceful shutdown handling
---

# Deployment & Build System

This skill covers building and deploying the Spa-Flow application with esbuild, environment-specific configurations, and graceful shutdown handling.

## Key Concepts

### esbuild Configuration for API Server
- esbuild for fast bundling
- Configuration in `artifacts/api-server/build.mjs`
- TypeScript compilation
- Node.js target
- Minification for production
- Source maps for debugging

### Vite Build Process for Frontend
- Vite 7.3.2 for frontend builds
- Configuration in `artifacts/spaflow/vite.config.ts`
- React 19 compilation
- Code splitting
- Asset optimization
- Minification for production

### Environment-Specific Builds
- `.env.development` for development
- `.env.production` for production
- `.env.staging` for staging
- `.env.test` for testing
- Environment-specific optimizations

### Graceful Shutdown Handling
- SIGTERM signal handling
- SIGINT signal handling
- Database pool closing
- Redis connection closing
- 10-second forced exit timeout
- In-flight request completion

### Database Pool Closing
- Close all connections on shutdown
- Wait for in-flight queries
- Graceful connection termination
- Prevent connection leaks
- Log shutdown process

### Redis Connection Closing
- Close Redis connection on shutdown
- Flush cache if needed
- Graceful disconnection
- Prevent connection leaks
- Log shutdown process

### 10-Second Forced Exit Timeout
- Forces exit after 10 seconds
- Prevents hanging shutdowns
- Logs timeout events
- Used as safety mechanism
- Configurable if needed

### Build Output Locations
- API server: `artifacts/api-server/dist/`
- Frontend: `artifacts/spaflow/dist/`
- Static assets in frontend dist
- Server bundle in API dist
- Source maps for debugging

### Sourcemap Generation
- Source maps for debugging
- Not included in production builds
- Separate .map files
- Stack trace mapping
- Development-only feature

### Production Deployment Considerations
- Use production environment variables
- Enable minification
- Disable source maps
- Configure appropriate timeouts
- Set up monitoring
- Configure log aggregation
- Set up health checks

## Key Files
- `artifacts/api-server/build.mjs` - esbuild configuration
- `artifacts/api-server/src/index.ts` - Graceful shutdown
- `artifacts/spaflow/vite.config.ts` - Vite build config

## References
- `ANALYSIS.md` - Build system details

## Common Tasks

### Building API Server
```bash
cd artifacts/api-server
pnpm run build
```

### Building Frontend
```bash
cd artifacts/spaflow
pnpm run build
```

### Building All Packages
```bash
pnpm -r run build
```

### Graceful Shutdown Implementation
```typescript
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await closeDatabasePool();
  await closeRedisConnection();
  setTimeout(() => {
    logger.error('Forced exit after timeout');
    process.exit(1);
  }, 10000);
  process.exit(0);
});
```

## Best Practices
- Always build before deployment
- Use environment-specific configs
- Implement graceful shutdown
- Monitor build times
- Use production optimizations
- Test shutdown process
