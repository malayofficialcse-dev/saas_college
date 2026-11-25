// ==============================================================================
// CollegeQuery SaaS — Root Application Module (app.module.ts)
// ==============================================================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import configuration from './core/config/configuration.js';
import { validateEnvironment } from './core/config/env.validation.js';
import { DatabaseModule } from './core/database/database.module.js';
import { RedisModule } from './core/redis/redis.module.js';
import { HealthModule } from './core/health/health.module.js';
import { LoggingModule } from './common/logger/logging.module.js';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware.js';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware.js';

// Domain Modules
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { TenantConfigModule } from './modules/tenant-config/tenant-config.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { CollegesModule } from './modules/colleges/colleges.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { AcademicSessionsModule } from './modules/academic-sessions/academic-sessions.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { FacultyModule } from './modules/faculty/faculty.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { QueryCategoriesModule } from './modules/query-categories/query-categories.module.js';
import { QueriesModule } from './modules/queries/queries.module.js';
import { QueryAssignmentsModule } from './modules/query-assignments/query-assignments.module.js';
import { QueryEscalationsModule } from './modules/query-escalations/query-escalations.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module.js';
import { FaqsModule } from './modules/faqs/faqs.module.js';
import { SlaModule } from './modules/sla/sla.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { SystemAdminModule } from './modules/system-admin/system-admin.module.js';

@Module({
  imports: [
    // 1. Global Configuration with validated environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),

    // 2. Global Event Emitter
    EventEmitterModule.forRoot(),

    // 3. Rate Limiting Throttler
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // 4. Persistence & Core Infrastructure Modules
    DatabaseModule, // PostgreSQL via Prisma with multi-tenant scoping
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('mongodb.uri') ||
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/collegequery_chat',
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    LoggingModule,

    // 5. Feature Domain Modules
    AuthModule,
    UsersModule,
    TenantsModule,
    TenantConfigModule,
    RolesModule,
    PermissionsModule,
    CollegesModule,
    DepartmentsModule,
    CoursesModule,
    AcademicSessionsModule,
    StudentsModule,
    FacultyModule,
    EmployeesModule,
    QueryCategoriesModule,
    QueriesModule,
    QueryAssignmentsModule,
    QueryEscalationsModule,
    ConversationsModule,
    MessagingModule,
    AttachmentsModule,
    NotificationsModule,
    EmailModule,
    KnowledgeBaseModule,
    FaqsModule,
    SlaModule,
    FeedbackModule,
    AnalyticsModule,
    ReportsModule,
    SubscriptionsModule,
    BillingModule,
    PaymentsModule,
    AuditLogsModule,
    SystemAdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, TenantResolutionMiddleware)
      .forRoutes('*');
  }
}
