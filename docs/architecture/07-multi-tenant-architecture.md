# 07. Multi-Tenant Architecture & Data Isolation

## 1. Multi-Tenant Model: Shared Database, Shared Schema

CollegeQuery implements a **Shared Database, Shared Schema** multi-tenant model.
- Highly cost-effective and operationally streamlined for colleges.
- Every tenant-owned relational table and MongoDB document embeds an indexed `tenantId: UUID`.
- Combined with software-level tenant context enforcement and database-level Row-Level Security (RLS).

---

## 2. Multi-Tenant Request Lifecycle Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client (Browser / App)
    participant Nginx as Nginx / Edge
    participant TenantMid as TenantResolutionMiddleware
    participant AuthGuard as JwtAuthGuard
    participant TenantGuard as TenantEnforcementGuard
    participant Context as AsyncLocalStorage (TenantContext)
    participant Service as Business Service
    participant Prisma as TenantAware Prisma Extension
    participant DB as PostgreSQL (with RLS)

    Client->>Nginx: HTTP Request (Host: acme.collegequery.com or x-tenant-id)
    Nginx->>TenantMid: Forward HTTP Request with Host Header
    TenantMid->>TenantMid: Resolve Tenant from Subdomain or Header
    TenantMid->>AuthGuard: Pass request
    AuthGuard->>AuthGuard: Verify JWT (extract user.tenantId, user.roles)
    AuthGuard->>TenantGuard: Validate Tenant Membership
    
    alt Tenant Mismatch & Not Super Admin
        TenantGuard-->>Client: 403 Forbidden ("Tenant access unauthorized")
    else Tenant Validated
        TenantGuard->>Context: Run within AsyncLocalStorage.run({ tenantId, user })
        Context->>Service: Execute Domain Controller/Service
        Service->>Prisma: prisma.query.findMany({ where: { status: 'OPEN' } })
        Note over Prisma: Prisma Extension auto-injects tenantId into query where clause
        Prisma->>DB: SET LOCAL app.current_tenant_id = 'acme-uuid'; SELECT ...
        DB-->>Prisma: Scoped Rows Returned
        Prisma-->>Service: Domain Entities
        Service-->>Client: 200 OK (Isolated Tenant Data)
    end
```

---

## 3. Tenant Context & AsyncLocalStorage

To eliminate manual passing of `tenantId` across nested service layers, CollegeQuery uses Node.js `AsyncLocalStorage`:

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextPayload {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  isSuperAdmin: boolean;
}

export const tenantAsyncStorage = new AsyncLocalStorage<TenantContextPayload>();

export class TenantContext {
  static get(): TenantContextPayload {
    const store = tenantAsyncStorage.getStore();
    if (!store) {
      throw new Error('Tenant context is missing in current execution thread');
    }
    return store;
  }

  static getTenantId(): string {
    return this.get().tenantId;
  }
}
```

---

## 4. Tenant-Aware Prisma Client (Automatic Scoping)

Using Prisma Client Extensions (`$extends`), every database operation is automatically filtered and stamped with `tenantId`:

```typescript
export function createTenantPrismaClient(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenant = tenantAsyncStorage.getStore();

          // Skip tenant scoping for global tables (Tenants, Plans, SystemPermissions)
          if (!tenant || GLOBAL_MODELS.includes(model)) {
            return query(args);
          }

          // Automatically enforce tenantId filter on queries
          if (['findFirst', 'findMany', 'count', 'update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
            args.where = { ...args.where, tenantId: tenant.tenantId };
          }

          // Automatically stamp tenantId on inserts
          if (['create'].includes(operation)) {
            args.data = { ...args.data, tenantId: tenant.tenantId };
          }

          return query(args);
        },
      },
    },
  });
}
```

---

## 5. Defense-in-Depth: PostgreSQL Row-Level Security (RLS)

As an ultimate safeguard against code-level bugs or SQL injections, PostgreSQL Row-Level Security is enabled on all tenant tables:

```sql
-- Enable RLS on queries table
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries FORCE ROW LEVEL SECURITY;

-- Create policy matching session variable
CREATE POLICY tenant_isolation_policy ON queries
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## 6. Super Admin Cross-Tenant Access Rules

1. SaaS Super Admins can only view cross-tenant data by explicitly declaring an **Impersonation Header**:
   - `x-act-as-tenant-id: <uuid>`
2. When the header is passed:
   - The user must possess the `platform:tenant:impersonate` system permission.
   - Every single read/write is logged in `audit_logs` with `action: 'SUPER_ADMIN_IMPERSONATION'`.
   - Without this header, Super Admins operate strictly in the global management plane.
