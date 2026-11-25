# 04. Database Architecture & Polyglot Persistence Strategy

## 1. High-Level Polyglot Architecture

CollegeQuery separates concerns between **strictly transactional operational records** and **high-velocity conversational records**:

```mermaid
flowchart TD
    subgraph ClientOps["Client Actions"]
        CreateTicket["1. Create / Update Query Ticket"]
        SendMsg["2. Post Message / Chat in Query"]
    end

    subgraph AppService["NestJS Application Logic"]
        TicketTxCoordinator["Ticket Service (ACID Transaction Manager)"]
        ChatCoordinator["Conversation Service (Dual-Write Orchestrator)"]
    end

    subgraph RelationalDB["PostgreSQL (Prisma ORM) - Source of Truth"]
        direction TB
        PGTenant["tenants"]
        PGUser["users"]
        PGRole["roles & permissions"]
        PGTicket["queries (status, priority, assignment, SLA)"]
        PGHistory["query_status_history"]
        PGAssignment["query_assignments"]
        PGAudit["audit_logs"]
    end

    subgraph DocumentDB["MongoDB (Mongoose ODM) - Conversational Source"]
        direction TB
        MGConv["conversations (queryId, tenantId, channelType)"]
        MGMessages["messages (senderId, text, attachments, readReceipts)"]
        MGEvents["activity_events (system timeline records)"]
    end

    CreateTicket --> TicketTxCoordinator
    SendMsg --> ChatCoordinator

    TicketTxCoordinator -->|Prisma $transaction| PGTicket
    TicketTxCoordinator -->|Prisma $transaction| PGHistory
    TicketTxCoordinator -->|Create Conversation Root| MGConv

    ChatCoordinator -->|Append Document| MGMessages
    ChatCoordinator -->|Update lastMessageAt / messageCount| MGConv
    ChatCoordinator -.->|Increment totalMessages / updatedAt| PGTicket
```

---

## 2. Source of Truth Demarcation

| Domain Entity | Primary Store | Storage Format | Justification |
| :--- | :--- | :--- | :--- |
| **Tenants, Subscriptions, Plans** | PostgreSQL | Relational | Strict relational integrity, billing compliance, financial ACID transactions. |
| **Users, Roles, Permissions** | PostgreSQL | Relational | Foreign key integrity with tenant boundaries; rapid role checks via index joins. |
| **Colleges, Depts, Courses, Students, Faculty** | PostgreSQL | Relational | Hierarchical integrity: student belongs to course, course to department, department to college. |
| **Query Tickets & Metadata** | PostgreSQL | Relational | Status machine, SLA timestamps, indexed filtering by status, priority, and assigned faculty. |
| **Query Assignments & SLA Status** | PostgreSQL | Relational | Historical auditing, relational metrics, timestamp precision for breach calculations. |
| **Conversation Threads & Messages**| **MongoDB** | JSON Document | Variable length text, rich text formatting, nested read receipts, dynamic media payloads. |
| **System Timeline Events** | **MongoDB** | JSON Document | Append-only event stream of fine-grained activity without burdening PostgreSQL table sizes. |
| **File / Media Content** | AWS S3 / MinIO | Object Blob | Scalable binary object storage; URLs stored in PostgreSQL and MongoDB. |

---

## 3. Cross-Database Identification & Integrity Strategy

Relational and document records are tied together using immutable UUIDv7 / UUIDv4 identifiers:

1. **`tenantId` (UUID)**: Present on **every** PostgreSQL table and **every** MongoDB collection. MongoDB collections have compound indexes starting with `tenantId`.
2. **`queryId` (UUID)**: The primary key of the PostgreSQL `queries` table is stored as an indexed field `queryId` in the MongoDB `conversations`, `messages`, and `activity_events` collections.
3. **`conversationId` (ObjectId / UUID string)**: Stored as `conversationRefId` in the PostgreSQL `queries` table to allow direct point-lookup navigation.
4. **`senderId` / `userId` (UUID)**: The PostgreSQL `users.id` is stamped onto all MongoDB message records.

---

## 4. Dual-Write Consistency & Failure-Handling Strategy

When an operation requires coordination across PostgreSQL and MongoDB (for example: creating a new query ticket and initializing its conversation thread):

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant QueryService as Query Service
    participant PG as PostgreSQL (Prisma)
    participant Outbox as PG Outbox Table
    participant Mongo as MongoDB (Mongoose)
    participant Worker as Outbox Relayer (Worker)

    Client->>QueryService: POST /api/v1/queries (Create Query)
    QueryService->>PG: Begin Prisma Transaction
    QueryService->>PG: INSERT queries (status=OPEN, ...)
    QueryService->>PG: INSERT query_status_history
    QueryService->>Outbox: INSERT outbox_events (eventType='QUERY_CREATED', payload)
    QueryService->>PG: Commit Prisma Transaction
    QueryService-->>Client: 201 Created (Query Ticket Created)

    par Asynchronous Mongo Ingestion
        Worker->>Outbox: Poll / Listen for pending events
        Worker->>Mongo: db.conversations.insertOne({ queryId, tenantId, ... })
        Worker->>Mongo: db.activity_events.insertOne({ type: 'TICKET_OPENED', ... })
        Worker->>Outbox: Mark event as PROCESSED
    end
```

### Failure Handling Guarantees:
- **Transactional Outbox Pattern**: PostgreSQL transaction atomically writes the query record and an `outbox_events` record. If the database crashes, neither is committed.
- **Idempotency in MongoDB**: MongoDB collections enforce a unique index on `{ queryId: 1, type: 1 }` for conversation roots. Duplicate outbox events re-deliver safely without creating duplicate chat threads.
- **Reconciliation Job**: A lightweight cron job runs every 15 minutes comparing newly created PostgreSQL queries with MongoDB conversations, re-dispatching any unlinked conversation documents.
