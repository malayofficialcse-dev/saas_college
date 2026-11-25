# 03. Frontend Architecture — CollegeQuery SaaS

## 1. Frontend Technology Stack & Rationale

- **Framework**: Next.js 14+ (App Router, Server Components + Client Islands).
- **Language**: TypeScript (strict mode enabled).
- **Styling**: Bootstrap 5 + SCSS Custom Modules + Bootstrap Icons.
- **Server State & Data Fetching**: TanStack Query (React Query v5) for automated caching, deduplication, optimistic updates, and background revalidation.
- **HTTP Client**: Axios with centralized request/response interceptors for token refresh and tenant injection.
- **Real-Time Client**: Socket.IO Client with automatic reconnection, heartbeat, and room subscription management.
- **Client State**: Zustand for UI states (sidebar toggle, active modals, chat draft states).
- **Forms & Validation**: React Hook Form + Zod / Standard Schema for type-safe form validation.

---

## 2. Frontend Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser["User Browser Runtime"]
        subgraph SubdomainRouting["Tenant Resolution & Edge Routing"]
            NextMiddleware["Next.js Middleware (Subdomain / Path Extraction)"]
        end

        subgraph Layouts["Layouts & Route Groups"]
            RootLayout["Root Layout (Theme, TanStack Query Provider, Auth Provider)"]
            AuthLayout["(auth) Layout (Login, Reset Password, 2FA)"]
            SuperAdminLayout["(super-admin) Layout (Tenant Management, Billing, Metrics)"]
            TenantPortalLayout["(tenant) Layout (Header, Sidebar, Notification Center, Socket Provider)"]
        end

        subgraph CoreProviders["Context & Store Layer"]
            AuthCtx["Auth Context (User, Roles, Permissions, Current Tenant)"]
            SocketCtx["Socket Context (Socket.IO Connection, Rooms, Event Listeners)"]
            QueryClientProvider["TanStack Query Client (Server Cache, Hydration)"]
            UIStore["Zustand UI Store (Toasts, Modals, Navigation State)"]
        end

        subgraph ViewPages["Feature Pages & Views"]
            Dashboard["Role-Based Dashboard (Student / Faculty / Admin)"]
            QueryDesk["Query Ticket Center (Kanban / Table / Filter Views)"]
            QueryDetail["Live Query Chat & Resolution Hub (Messages, Internal Notes, Timeline)"]
            KBPortal["Knowledge Base & FAQ Search"]
            SettingsView["Tenant Settings, Roles & Department Mapping"]
        end

        subgraph DataLayer["Client Data & API Integration"]
            AxiosInstance["Axios API Client (Interceptor, Refresh Queue, Tenant Header)"]
            SocketManager["Socket.IO Event Handlers (New Message, Status Change, Typing)"]
        end
    end

    subgraph BackendAPI["CollegeQuery Backend"]
        RESTEndpoints["NestJS REST Endpoints (/api/v1)"]
        SocketServer["NestJS Socket.IO Server (/socket.io)"]
    end

    Browser --> NextMiddleware
    NextMiddleware --> Layouts
    Layouts --> CoreProviders
    CoreProviders --> ViewPages
    ViewPages --> AxiosInstance
    ViewPages --> SocketManager
    AxiosInstance -->|HTTP/JSON| RESTEndpoints
    SocketManager -->|WSS Events| SocketServer
```

---

## 3. Multi-Tenant Subdomain Routing Strategy

Tenants access the portal using two supported URL topologies:
1. **Subdomain-based (Preferred for production)**:
   - Super Admin: `admin.collegequery.com`
   - College A (Acme Engineering): `acme.collegequery.com`
   - College B (St. Jude University): `stjude.collegequery.com`
2. **Path-based (Development fallback)**:
   - `collegequery.com/tenants/:tenantSlug`

### Next.js Edge Middleware Workflow:
```typescript
// Conceptual Middleware Execution:
// 1. Extract hostname from req.headers.get('host')
// 2. Parse subdomain: e.g. "acme" from "acme.collegequery.com"
// 3. Rewrite request internally to /(tenant)/[tenantSlug]/...
// 4. Attach 'x-tenant-slug' header to the forwarded request
```

---

## 4. Real-Time Conversation Component Hierarchy

The query conversation interface is designed for low latency, optimistic messaging, and instant delivery indicators:

```mermaid
flowchart TD
    QueryDetailContainer["QueryDetailContainer (Fetches Query & Conversation Metadata)"]
    QueryDetailContainer --> TicketHeader["TicketHeader (Status, Priority, SLA Countdown, Actions)"]
    QueryDetailContainer --> MainBody["Main Split View"]

    MainBody --> LeftPane["ConversationPane (Flex Column)"]
    MainBody --> RightPane["ContextSidebar (Student Info, Department, Assignment History, SLA)"]

    LeftPane --> MessageTimeline["MessageTimeline (Virtual Scroll / Infinite TanStack Query)"]
    MessageTimeline --> ActivityEventItem["ActivityEventItem (System Audit, Status Change, Reassignment)"]
    MessageTimeline --> ChatBubble["ChatBubble (Incoming / Outgoing, Markdown, Attachments, Read Receipts)"]
    LeftPane --> TypingIndicator["TypingIndicatorBar ('Prof. Sharma is typing...')"]
    LeftPane --> MessageInputBox["MessageComposer (Tabs: Public Reply vs Internal Note, File Dropzone)"]
```

---

## 5. Security & Authentication Flow in Next.js

1. **Token Storage**:
   - `accessToken`: Maintained strictly in memory or short-lived secure memory store to prevent XSS exfiltration.
   - `refreshToken`: Stored in a secure `HttpOnly`, `SameSite=Strict`, `Secure` cookie set directly by the NestJS backend.
2. **Silent Refresh Interceptor**:
   - Axios response interceptor intercepts `401 Unauthorized`.
   - Queues pending requests while issuing a single refresh request to `/api/v1/auth/refresh-token`.
   - On refresh success, replays all queued requests with the new token.
   - On refresh failure, clears state and redirects the user to `/auth/login` with redirect parameters.
3. **Role & Permission Directives**:
   - Custom `<Can I="query:reassign" a="Query">` wrapper component conditionally renders administrative actions without exposing forbidden buttons or forms to unauthorized roles.
