# 12. Deployment, Containerization & CI/CD Architecture

## 1. Cloud Deployment Architecture Diagram

```mermaid
flowchart TD
    subgraph InternetTraffic["Public Internet"]
        DNS["Route 53 / Cloudflare DNS (*.collegequery.com)"]
        WAF["Cloudflare Web Application Firewall & SSL Termination"]
    end

    subgraph HostServer["Production Docker Host / Kubernetes Cluster"]
        NginxLB["Nginx Reverse Proxy & Static Asset Server (Port 80 / 443)"]

        subgraph ContainerCluster["Docker Compose App Network"]
            NextFrontend["Next.js Web Frontend (Port 3000)"]
            NestAPI1["NestJS API Container Node 1 (Port 4000)"]
            NestAPI2["NestJS API Container Node 2 (Port 4001)"]
            WorkerContainer["NestJS Background Job Worker (BullMQ Consumer)"]
        end

        subgraph InfrastructureServices["Stateful Managed Data Services"]
            RedisContainer[("Redis 7.2 (Pub/Sub & Cache)")]
            PostgresDB[("PostgreSQL 16 High-Availability Cluster")]
            MongoDBReplica[("MongoDB 7.0 Replica Set")]
        end
    end

    subgraph ExternalCloud["Cloud Managed Storage & Services"]
        S3Bucket["AWS S3 / Cloudflare R2 (Encrypted Object Storage)"]
        SESEmail["Amazon SES (Transactional Email Delivery)"]
    end

    InternetTraffic --> DNS
    DNS --> WAF
    WAF --> NginxLB

    NginxLB -->|Proxy to Frontend| NextFrontend
    NginxLB -->|Round-Robin API & WSS| NestAPI1
    NginxLB -->|Round-Robin API & WSS| NestAPI2

    NestAPI1 <--> RedisContainer
    NestAPI2 <--> RedisContainer
    WorkerContainer <--> RedisContainer

    NestAPI1 --> PostgresDB
    NestAPI2 --> PostgresDB
    WorkerContainer --> PostgresDB

    NestAPI1 --> MongoDBReplica
    NestAPI2 --> MongoDBReplica

    NestAPI1 --> S3Bucket
    WorkerContainer --> SESEmail
```

---

## 2. Docker & Containerization Strategy

Multi-stage production Dockerfiles are created for both the NestJS API and Next.js frontend to minimize image sizes (Alpine base), eliminate development dependencies, and run under non-root system users.

### Docker Compose Architecture (`docker-compose.prod.yml`):
- `nginx`: Ingress reverse proxy with HTTP/2 and WebSocket upgrade support.
- `api`: Replicated NestJS service instances running in cluster mode.
- `worker`: Standalone instance dedicated to processing queue jobs (emails, reports, SLA checks).
- `web`: Next.js standalone output image.
- `redis`: In-memory data store with AOF persistence.
- `postgres`: PostgreSQL 16 Alpine with initialized RLS extensions.
- `mongo`: MongoDB 7.0 with replica set enabled for change streams.

---

## 3. GitHub Actions CI/CD Pipeline

```mermaid
flowchart LR
    Push["1. Git Push (main / release)"] --> Lint["2. Lint & Format Check (ESLint / Oxlint / Prettier)"]
    Lint --> TypeCheck["3. TypeScript Typecheck (tsc --noEmit)"]
    TypeCheck --> UnitTests["4. Automated Unit Tests (Vitest)"]
    UnitTests --> E2ETests["5. Multi-Tenant E2E Tests (Vitest + Testcontainers)"]
    E2ETests --> DockerBuild["6. Build & Push Multi-Arch Docker Images (GHCR)"]
    DockerBuild --> Deploy["7. Zero-Downtime Deployment via SSH / Rolling Restart"]
```
