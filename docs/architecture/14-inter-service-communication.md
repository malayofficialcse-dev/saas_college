# 14. Inter-Service & Database Communication Flow

## 1. Overview & Communication Matrix

Within the CollegeQuery modular monolith, communication between bounded contexts and data stores is designed to prevent tight coupling while preserving high performance and transaction safety.

---

## 2. Database Communication Flow Diagram

```mermaid
flowchart TD
    subgraph AppProcess["NestJS Application Process (Modular Monolith)"]
        direction TB
        HttpCtrl["HTTP Controllers (REST API)"]
        WSGateway["Socket.IO Gateways (WebSockets)"]
        EventBus["EventEmitter2 (In-Memory Domain Events)"]
        QueueProducer["BullMQ Queue Producer"]

        subgraph ServiceDomain["Domain Services"]
            AuthSvc["AuthService"]
            QuerySvc["QueryService"]
            ChatSvc["ConversationService"]
            EscalationSvc["EscalationService"]
        end
    end

    subgraph DataPlane["Polyglot Data Plane"]
        direction TB
        PrismaClient["Prisma Client ($transaction & Tenant Scope)"]
        MongooseClient["Mongoose ODM (Connection Pool)"]
        RedisClient["IORedis Client (Cache / PubSub / Queues)"]
    end

    subgraph PhysicalStores["Physical Storage & Broker Layer"]
        PGPrimary[("PostgreSQL 16 Primary")]
        PGReplica[("PostgreSQL Read-Replica")]
        MongoCluster[("MongoDB Replica Set 7.0")]
        RedisCluster[("Redis 7.2 Cache & Broker")]
    end

    HttpCtrl --> ServiceDomain
    WSGateway --> ServiceDomain

    ServiceDomain --> EventBus
    ServiceDomain --> QueueProducer

    AuthSvc --> PrismaClient
    QuerySvc --> PrismaClient
    QuerySvc --> EventBus
    ChatSvc --> MongooseClient
    EscalationSvc --> PrismaClient

    EventBus -.->|Internal Notification| WSGateway
    QueueProducer --> RedisClient

    PrismaClient -->|ACID Writes & Reads| PGPrimary
    PrismaClient -.->|Analytical Reads| PGReplica
    MongooseClient -->|High Throughput Chat CRUD| MongoCluster
    RedisClient -->|Rate Limits, Pub/Sub, Queues| RedisCluster
```

---

## 3. Communication Patterns

### 3.1 In-Process Domain Events (`@nestjs/event-emitter`)
When an action in one module triggers side-effects in another without requiring immediate transactional consistency (e.g., ticket creation triggers notification and email dispatch):
```typescript
// QueryService:
this.eventEmitter.emit(
  'query.created',
  new QueryCreatedEvent(tenantId, query.id, studentId, departmentId),
);

// NotificationModule:
@OnEvent('query.created', { async: true })
async handleQueryCreated(event: QueryCreatedEvent) {
  await this.notificationService.notifyDepartmentStaff(event);
}
```

### 3.2 Asynchronous Background Queues (BullMQ + Redis)
Time-consuming or external I/O bound tasks are offloaded to Redis queues processed by worker processes:
- **Email Delivery Queue**: Transactional email dispatch with exponential backoff retries.
- **SLA Monitor Queue**: Recurring job checking ticket deadlines and escalating overdue tickets.
- **Export Queue**: Asynchronous generation of bulky CSV/PDF compliance reports.

### 3.3 Real-Time Fan-Out (Redis Pub/Sub)
Socket.IO gateways in a multi-instance deployment use `@socket.io/redis-adapter`. When instance 1 emits an event to a room, the Redis adapter broadcasts the payload to all sibling instances so connected clients on instance 2 receive it seamlessly.
