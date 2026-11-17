export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const { reportProductionStorage, validateProductionConfig } = await import('./src/server/production.js');
  validateProductionConfig();
  reportProductionStorage();
}
