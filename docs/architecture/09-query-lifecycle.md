# 09. Query Lifecycle & Real-Time Communication Architecture

## 1. Query State Machine

A query ticket transitions through strictly validated lifecycle states:

```mermaid
stateDiagram-v2
    [*] --> OPEN: Student Submits Query
    OPEN --> ASSIGNED: Auto / Manual Assignment
    ASSIGNED --> IN_PROGRESS: Staff / Faculty First Reply
    IN_PROGRESS --> ESCALATED: SLA Breach or Manual Escalation
    ESCALATED --> IN_PROGRESS: HOD / Principal Intervenes
    IN_PROGRESS --> RESOLVED: Staff Proposes Resolution
    RESOLVED --> CLOSED: Student Confirms / Auto-close (72h)
    RESOLVED --> REOPENED: Student Rejects Resolution (within 48h)
    REOPENED --> IN_PROGRESS: Under Re-investigation
    CLOSED --> [*]
```

---

## 2. End-to-End Query Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Student as Student (Next.js)
    participant API as NestJS Query Engine
    participant DB as PostgreSQL (Prisma)
    participant Mongo as MongoDB (Mongoose)
    participant Redis as Redis (Pub/Sub)
    participant Socket as Socket.IO Gateway
    participant Staff as Assigned Faculty / Staff

    Student->>API: POST /api/v1/queries (Category, Title, Description, AttachmentIds)
    API->>DB: Calculate SLA deadline based on Category policy
    API->>DB: Identify Dept & Auto-assign to Faculty (Least-Loaded Algorithm)
    API->>DB: INSERT query (Status: ASSIGNED) + status_history
    API->>Mongo: INSERT conversation + INITIAL_MESSAGE
    API->>Redis: Publish 'query:assigned' event
    Redis->>Socket: Broadcast to room 'tenant:{id}:faculty:{id}'
    Socket-->>Staff: Real-time Alert ("New Query CQ-2026-00412 assigned")
    API-->>Student: 201 Created (Ticket Number CQ-2026-00412)

    Note over Student,Staff: Real-time Interactive Conversation Phase

    Staff->>API: POST /api/v1/queries/:id/messages (Public Reply)
    API->>Mongo: Append message to 'messages' collection
    API->>DB: UPDATE query (status: IN_PROGRESS, first_responded_at: NOW)
    API->>Redis: Publish 'chat:message' to room 'tenant:{id}:query:{id}'
    Redis->>Socket: Push message payload
    Socket-->>Student: Message Appears in Chat Window
    Student->>API: PATCH /api/v1/queries/:id/messages/read (Acknowledge)
    API->>Mongo: Update readBy receipt
    Socket-->>Staff: Show Blue Read Checkmark

    Note over Student,Staff: Resolution & Feedback Phase

    Staff->>API: PATCH /api/v1/queries/:id/resolve (Resolution Summary)
    API->>DB: UPDATE query status=RESOLVED, resolved_at=NOW
    Socket-->>Student: Real-time Notification ("Ticket Marked Resolved")
    
    Student->>API: POST /api/v1/queries/:id/feedback (Rating: 5/5, Remarks)
    API->>DB: INSERT query_feedback
    API->>DB: UPDATE query status=CLOSED
    Socket-->>Staff: Ticket Closed & Feedback Badge Shown
```

---

## 3. Real-Time Messaging Architecture (Socket.IO + Redis Adapter)

```mermaid
flowchart TD
    subgraph ClientBrowsers["Client Web Browsers"]
        StudentClient["Student Socket Client"]
        FacultyClient["Faculty Socket Client"]
        AdminClient["Admin Dashboard Socket Client"]
    end

    subgraph LoadBalancer["Load Balancing Layer"]
        NginxLB["Nginx Load Balancer (WebSocket Upgrade Enabled)"]
    end

    subgraph NestCluster["NestJS Socket.IO Gateways"]
        Node1["Gateway Instance 1 (@WebSocketGateway)"]
        Node2["Gateway Instance 2 (@WebSocketGateway)"]
    end

    subgraph RedisBroker["Distributed Redis Cluster"]
        RedisAdapter["Redis Pub/Sub Socket.IO Adapter (@socket.io/redis-adapter)"]
    end

    StudentClient <-->|WSS Connection| NginxLB
    FacultyClient <-->|WSS Connection| NginxLB
    AdminClient <-->|WSS Connection| NginxLB

    NginxLB <--> Node1
    NginxLB <--> Node2

    Node1 <--> RedisAdapter
    Node2 <--> RedisAdapter
```

### Socket Room Partitioning Strategy:
- **Tenant Scope**: `tenant:${tenantId}` (General college broadcasts).
- **User Scope**: `tenant:${tenantId}:user:${userId}` (Personal alerts, assignments).
- **Query Ticket Scope**: `tenant:${tenantId}:query:${queryId}` (Live chat stream, typing indicators).

### Socket Authentication Protocol:
1. Client connects with handshake auth:
   `io({ auth: { token: 'Bearer <JWT>' } })`
2. Gateway `canActivate` verifies JWT signature, extracts `tenantId`, `userId`, and `roles`.
3. Client is joined to authorized rooms only after tenant validation.
