# 11. Security Architecture & Threat Mitigation

## 1. Authentication & Refresh Token Rotation Flow

CollegeQuery uses short-lived Access Tokens (15 minutes) paired with cryptographically secure, rotating Refresh Tokens (7 days) stored in PostgreSQL with token reuse detection.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Web / Mobile Client
    participant API as NestJS AuthController
    participant Service as AuthService
    participant DB as PostgreSQL (refresh_tokens)
    participant Redis as Redis (Blacklist / Throttler)

    Client->>API: POST /api/v1/auth/login (Email, Password, TenantId)
    API->>Redis: Check Rate Limit (Max 5 attempts / min)
    API->>Service: Authenticate Credentials
    Service->>Service: Verify Password with Argon2id
    Service->>DB: Invalidate existing expired tokens
    Service->>DB: INSERT new Refresh Token Hash (Family ID, Hash, Expiry)
    Service->>Client: Return Access Token (JSON) + Set-Cookie Refresh Token (HttpOnly, SameSite=Strict)

    Note over Client,API: During Session (Access Token Expires)

    Client->>API: GET /api/v1/queries (Header: Bearer ExpiredToken)
    API-->>Client: 401 Unauthorized (Token Expired)

    Client->>API: POST /api/v1/auth/refresh-token (Cookie: refreshToken)
    API->>Service: Validate Refresh Token
    Service->>DB: Lookup Token Hash
    
    alt Token Reuse Detected (Old Token Re-presented)
        Service->>DB: REVOKE ENTIRE TOKEN FAMILY (Compromise Alarm)
        Service-->>Client: 401 Unauthorized ("Session revoked due to reuse detection")
    else Valid Active Refresh Token
        Service->>DB: Mark Current Token as REVOKED / ROTATED
        Service->>DB: INSERT New Refresh Token
        Service-->>Client: New Access Token + New Refresh Cookie
    end
```

---

## 2. Password Hashing Specification (Argon2id)

Passes OWASP recommendations for password storage using **Argon2id**:
- **Type**: `argon2id` (resistant against side-channel and GPU cracking attacks)
- **Memory Cost (`m`)**: 65,536 KiB (64 MiB)
- **Time Cost (`t`)**: 3 iterations
- **Parallelism (`p`)**: 4 threads
- **Salt**: 16 cryptographically secure random bytes generated per hash.

---

## 3. Defense-in-Depth Layered Security Matrix

```mermaid
flowchart TD
    Edge["1. Edge & Transport: Cloudflare WAF + TLS 1.3 + Strict HTTPS HSTS"] --> Headers["2. HTTP Headers: Helmet (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)"]
    Headers --> RateLimit["3. Traffic Control: Redis RateLimiter (@nestjs/throttler)"]
    RateLimit --> Origin["4. Origin Security: Strict CORS Whitelist (Tenant subdomains only)"]
    Origin --> TenantGuard["5. Multi-Tenancy: TenantResolutionGuard + AsyncLocalStorage Isolation"]
    TenantGuard --> AuthZ["6. Authorization: JwtAuthGuard + DynamicPermissionGuard (RBAC)"]
    AuthZ --> InputVal["7. Validation: StandardSchema / Class-Validator with whitelist: true"]
    InputVal --> DBLayer["8. Data Tier: Parameterized SQL (Prisma) + PostgreSQL RLS + NoSQL Sanitization"]
    DBLayer --> ObjectStore["9. Storage: S3 Presigned PUT with strict Content-Type & Size caps"]
```

---

## 4. Secure File Upload Pipeline

To prevent malicious executable files from reaching the server filesystem or executing in browsers:
1. **Presigned URL Architecture**: File binaries are uploaded **directly from client browser to S3**, bypassing the NestJS API application memory and disk.
2. **Strict MIME Whitelisting**:
   - Allowed: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`.
   - Disallowed: All executables (`.exe`, `.sh`, `.bat`, `.js`, `.html`, `.svg`).
3. **File Size Capping**: S3 Presigned PUT enforces `content-length-range` max 10MB per attachment.
4. **S3 Bucket Lockdown**:
   - S3 bucket has public access blocked completely.
   - All client downloads must go through signed GET URLs with 15-minute expiration and `Content-Disposition: attachment; filename="safe_name.ext"`.
