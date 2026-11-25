// ==============================================================================
// CollegeQuery SaaS — Central App Configuration
// ==============================================================================

export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  database: {
    url: process.env.DATABASE_URL,
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/collegequery_chat',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    bucket: process.env.AWS_S3_BUCKET || 'collegequery-attachments',
    endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  },
});
