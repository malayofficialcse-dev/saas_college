// ==============================================================================
// CollegeQuery SaaS — Environment Configuration Validation
// Enforces type-safe and validated configuration at application bootstrap
// ==============================================================================

import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  DATABASE_URL: string =
    'postgresql://postgres:postgres@localhost:5432/collegequery?schema=public';

  @IsString()
  @IsOptional()
  MONGODB_URI: string = 'mongodb://localhost:27017/collegequery_chat';

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string = 'dev_jwt_access_secret_for_collegequery_super_secure';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'dev_jwt_refresh_secret_for_collegequery_super_secure';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  AWS_REGION: string = 'us-east-1';

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID: string = 'minioadmin';

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY: string = 'minioadmin';

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET: string = 'collegequery-attachments';

  @IsString()
  @IsOptional()
  AWS_S3_ENDPOINT: string = 'http://localhost:9000';

  @IsString()
  @IsOptional()
  AWS_S3_FORCE_PATH_STYLE: string = 'true';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `❌ Environment validation error:\n${errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
