export function getEnvConfig() {
  return {
    garminCnUsername: process.env.GARMIN_CN_USERNAME || process.env.GARMIN_USERNAME || '',
    garminCnPassword: process.env.GARMIN_CN_PASSWORD || process.env.GARMIN_PASSWORD || '',
    garminGlobalUsername: process.env.GARMIN_GLOBAL_USERNAME || '',
    garminGlobalPassword: process.env.GARMIN_GLOBAL_PASSWORD || '',
    
    // Upstash Redis / Vercel KV for Serverless State Persistence
    kvUrl: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    kvToken: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',

    // Cron & Admin Protection
    cronSecret: process.env.CRON_SECRET || '',
    adminPassword: process.env.FITSYNC_ADMIN_PASSWORD || '',
  };
}

export function hasServerCredentials() {
  const cfg = getEnvConfig();
  return {
    hasCn: Boolean(cfg.garminCnUsername && cfg.garminCnPassword),
    hasGlobal: Boolean(cfg.garminGlobalUsername && cfg.garminGlobalPassword),
    hasKv: Boolean(cfg.kvUrl && cfg.kvToken),
    hasCronSecret: Boolean(cfg.cronSecret),
    hasAdminPassword: Boolean(cfg.adminPassword),
  };
}
