# 13. Complete Monorepo / Modular Folder Structure

## 1. Directory Tree Overview

CollegeQuery is structured as a clear, modular workspace containing the NestJS backend, Next.js frontend, shared schema definitions, documentation, and DevOps automation.

```
saas_college/
├── docs/
│   └── architecture/
│       ├── 01-system-architecture.md
│       ├── 02-backend-architecture.md
│       ├── 03-frontend-architecture.md
│       ├── 04-database-architecture.md
│       ├── 05-postgresql-er-diagram.md
│       ├── 06-mongodb-schema-design.md
│       ├── 07-multi-tenant-architecture.md
│       ├── 08-rbac-architecture.md
│       ├── 09-query-lifecycle.md
│       ├── 10-api-design.md
│       ├── 11-security-architecture.md
│       ├── 12-deployment-architecture.md
│       ├── 13-folder-structure.md
│       ├── 14-inter-service-communication.md
│       └── 15-implementation-roadmap.md
│
├── deploy/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── Dockerfile.worker
│   ├── nginx/
│   │   ├── conf.d/default.conf
│   │   └── nginx.conf
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── packages/
│   └── shared-types/
│       ├── src/
│       │   ├── enums/
│       │   ├── dtos/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── backend/                          # NestJS Application
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # PostgreSQL Prisma Schema
│   │   │   ├── migrations/
│   │   │   └── seeds/                    # Seed Default Roles, Permissions, Plans
│   │   │
│   │   ├── src/
│   │   │   ├── common/                   # Core Cross-Cutting Concerns
│   │   │   │   ├── constants/
│   │   │   │   ├── decorators/           # @CurrentUser, @CurrentTenant, @RequirePermissions
│   │   │   │   ├── filters/              # GlobalExceptionFilter
│   │   │   │   ├── guards/               # JwtAuthGuard, TenantGuard, DynamicPermissionGuard
│   │   │   │   ├── interceptors/         # TransformResponseInterceptor, LoggingInterceptor
│   │   │   │   ├── middleware/           # TenantResolutionMiddleware, CorrelationIdMiddleware
│   │   │   │   └── pipes/                # StandardValidationPipe
│   │   │   │
│   │   │   ├── core/                     # Global Infrastructure Modules
│   │   │   │   ├── config/               # App, Database, Redis, S3 Configurations
│   │   │   │   ├── database/             # PrismaService, PrismaExtension, MongooseConfig
│   │   │   │   ├── redis/                # RedisModule, CacheService, PubSubService
│   │   │   │   └── storage/              # S3StorageService (Presigned URLs)
│   │   │   │
│   │   │   ├── modules/                  # 31 Domain Feature Modules
│   │   │   │   ├── auth/                 # Login, Refresh, Password Reset
│   │   │   │   ├── users/                # User CRUD, Profiles
│   │   │   │   ├── tenants/              # Tenant Provisioning, Onboarding
│   │   │   │   ├── tenant-config/        # Theme, Branding, Subdomains
│   │   │   │   ├── roles/                # Roles Management
│   │   │   │   ├── permissions/          # Granular Permissions Catalog
│   │   │   │   ├── colleges/             # College & Campus Entities
│   │   │   │   ├── departments/          # Department Management, HODs
│   │   │   │   ├── courses/              # Degree Programs & Semesters
│   │   │   │   ├── academic-sessions/    # Academic Years
│   │   │   │   ├── students/             # Student Profiles & Batch Enrollments
│   │   │   │   ├── faculty/              # Faculty Directory & Workload
│   │   │   │   ├── employees/            # Non-Teaching Staff
│   │   │   │   ├── query-categories/     # Categories & Routing Rules
│   │   │   │   ├── queries/              # Query Tickets & Lifecycle Engine
│   │   │   │   ├── query-assignments/    # Manual & Auto-Routing Engine
│   │   │   │   ├── query-escalations/    # SLA Escalation Monitor
│   │   │   │   ├── conversations/        # Mongoose Chat & Activity Stream
│   │   │   │   ├── messaging/            # Socket.IO Gateway & Rooms
│   │   │   │   ├── attachments/          # S3 Metadata & Attachment Linking
│   │   │   │   ├── notifications/        # In-App Notifications
│   │   │   │   ├── email/                # BullMQ Transactional Mail Queue
│   │   │   │   ├── knowledge-base/       # Articles & Categorization
│   │   │   │   ├── faqs/                 # Frequently Asked Questions
│   │   │   │   ├── sla/                  # SLA Policies, Timers, Calendars
│   │   │   │   ├── feedback/             # Post-Resolution CSAT Ratings
│   │   │   │   ├── analytics/            # Performance & Resolution Metrics
│   │   │   │   ├── reports/              # Async CSV/PDF Generators
│   │   │   │   ├── subscriptions/        # SaaS Plan Tiers & Quotas
│   │   │   │   ├── billing/              # Invoices & Webhooks
│   │   │   │   ├── payments/             # Payment Gateway Adapters
│   │   │   │   ├── audit-logs/           # Immutable Action Trails
│   │   │   │   └── system-admin/         # Super Admin Cross-Tenant Management
│   │   │   │
│   │   │   ├── app.module.ts             # Root Module Assembly
│   │   │   └── main.ts                   # Bootstrap Application Server
│   │   │
│   │   ├── test/                         # E2E & Integration Tests
│   │   │   ├── tenant-isolation.e2e-spec.ts
│   │   │   ├── auth.e2e-spec.ts
│   │   │   └── query-lifecycle.e2e-spec.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                         # Next.js Application
│       ├── public/                       # Static Assets & Icons
│       ├── src/
│       │   ├── app/                      # Next.js App Router
│       │   │   ├── (auth)/               # Login, Forgot Password, Reset
│       │   │   ├── (super-admin)/        # SaaS Super Admin Dashboard
│       │   │   ├── (tenant)/             # Tenant Scoped Dashboard
│       │   │   │   ├── [tenantSlug]/
│       │   │   │   │   ├── dashboard/
│       │   │   │   │   ├── queries/
│       │   │   │   │   │   ├── [id]/      # Live Chat & Query Details
│       │   │   │   │   │   └── create/
│       │   │   │   │   ├── knowledge-base/
│       │   │   │   │   ├── analytics/
│       │   │   │   │   └── settings/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx              # Landing / Tenant Redirector
│       │   ├── components/               # Reusable UI Components
│       │   │   ├── common/               # Buttons, Tables, Cards, Modals
│       │   │   ├── chat/                 # ChatTimeline, MessageBubble, Composer
│       │   │   └── layout/               # Header, Sidebar, NotificationDropdown
│       │   ├── hooks/                    # useAuth, useSocket, useQueryDetails
│       │   ├── lib/                      # Axios Instance, Socket Client, Formatters
│       │   ├── styles/                   # Bootstrap SCSS Overrides & Variables
│       │   └── types/                    # Frontend Specific View Models
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                          # Monorepo Workspace Root (npm / pnpm)
└── README.md
```
