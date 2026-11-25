# 05. PostgreSQL Relational Entity-Relationship Diagram

## 1. Overview

The PostgreSQL database (managed via Prisma ORM) enforces ACID consistency, strict foreign keys, multi-tenant scoping (`tenant_id`), cascading deletions, and composite uniqueness.

---

## 2. PostgreSQL ER Diagram (Mermaid)

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "has"
    TENANTS ||--o{ COLLEGES : "operates"
    TENANTS ||--o{ ROLES : "defines"
    TENANTS ||--o{ QUERY_CATEGORIES : "configures"
    TENANTS ||--o{ QUERIES : "owns"
    TENANTS ||--o{ SUBSCRIPTIONS : "subscribes"
    TENANTS ||--o{ AUDIT_LOGS : "logs"

    COLLEGES ||--o{ DEPARTMENTS : "contains"
    DEPARTMENTS ||--o{ COURSES : "offers"
    DEPARTMENTS ||--o{ FACULTY : "employs"
    DEPARTMENTS ||--o{ QUERY_CATEGORIES : "handles"
    COURSES ||--o{ STUDENTS : "enrolls"
    ACADEMIC_SESSIONS ||--o{ STUDENTS : "enrolled_in"

    USERS ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ USER_ROLES : "grants"
    ROLES ||--o{ ROLE_PERMISSIONS : "includes"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "mapped_to"

    USERS ||--o| STUDENTS : "profile_for"
    USERS ||--o| FACULTY : "profile_for"
    USERS ||--o| EMPLOYEES : "profile_for"
    USERS ||--o{ REFRESH_TOKENS : "holds"

    STUDENTS ||--o{ QUERIES : "creates"
    QUERY_CATEGORIES ||--o{ QUERIES : "classifies"
    QUERIES ||--o{ QUERY_ASSIGNMENTS : "assigned_via"
    FACULTY ||--o{ QUERY_ASSIGNMENTS : "assigned_to"
    QUERIES ||--o{ QUERY_STATUS_HISTORY : "tracks"
    QUERIES ||--o{ QUERY_ESCALATIONS : "escalated_via"
    QUERIES ||--o{ ATTACHMENTS : "contains"
    QUERIES ||--o| QUERY_FEEDBACK : "receives"

    PLANS ||--o{ SUBSCRIPTIONS : "tiered_as"
    SUBSCRIPTIONS ||--o{ INVOICES : "billed_as"
    INVOICES ||--o{ PAYMENTS : "paid_by"

    TENANTS {
        uuid id PK
        string slug UK
        string name
        string status
        string domain
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        string first_name
        string last_name
        string phone
        string user_type
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        uuid id PK
        uuid tenant_id FK
        string name
        string code
        string description
        boolean is_system_role
        timestamp created_at
    }

    PERMISSIONS {
        uuid id PK
        string code UK
        string module
        string action
        string description
    }

    ROLE_PERMISSIONS {
        uuid role_id PK,FK
        uuid permission_id PK,FK
    }

    USER_ROLES {
        uuid user_id PK,FK
        uuid role_id PK,FK
    }

    COLLEGES {
        uuid id PK
        uuid tenant_id FK
        string code
        string name
        string address
        string phone
        string email
        string website
        timestamp created_at
    }

    DEPARTMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid college_id FK
        string code
        string name
        uuid hod_user_id FK
        timestamp created_at
    }

    COURSES {
        uuid id PK
        uuid tenant_id FK
        uuid department_id FK
        string code
        string name
        int duration_semesters
    }

    ACADEMIC_SESSIONS {
        uuid id PK
        uuid tenant_id FK
        string name
        date start_date
        date end_date
        boolean is_active
    }

    STUDENTS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK,UK
        uuid department_id FK
        uuid course_id FK
        uuid academic_session_id FK
        string enrollment_number
        string roll_number
        int current_semester
    }

    FACULTY {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK,UK
        uuid department_id FK
        string employee_code
        string designation
        int max_active_queries
    }

    EMPLOYEES {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK,UK
        uuid department_id FK
        string employee_code
        string staff_category
    }

    QUERY_CATEGORIES {
        uuid id PK
        uuid tenant_id FK
        uuid department_id FK
        string name
        string slug
        string default_priority
        int default_sla_hours
        boolean is_active
    }

    QUERIES {
        uuid id PK
        uuid tenant_id FK
        string ticket_number UK
        uuid student_id FK
        uuid department_id FK
        uuid category_id FK
        string title
        text description
        string priority
        string status
        string conversation_ref_id
        timestamp sla_deadline
        boolean is_escalated
        int escalation_level
        timestamp created_at
        timestamp updated_at
    }

    QUERY_ASSIGNMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid query_id FK
        uuid assigned_to_user_id FK
        uuid assigned_by_user_id FK
        string assignment_type
        string reason
        timestamp assigned_at
        timestamp unassigned_at
    }

    QUERY_STATUS_HISTORY {
        uuid id PK
        uuid tenant_id FK
        uuid query_id FK
        string previous_status
        string new_status
        uuid changed_by_user_id FK
        string remarks
        timestamp changed_at
    }

    QUERY_ESCALATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid query_id FK
        int from_level
        int to_level
        string trigger_reason
        uuid escalated_to_user_id FK
        timestamp escalated_at
    }

    QUERY_FEEDBACK {
        uuid id PK
        uuid tenant_id FK
        uuid query_id FK,UK
        int rating
        text feedback_text
        timestamp submitted_at
    }

    ATTACHMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid query_id FK
        string file_name
        string file_key
        string file_type
        int file_size_bytes
        string storage_provider
        uuid uploaded_by_user_id FK
        timestamp created_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid tenant_id FK
        uuid plan_id FK
        string status
        timestamp current_period_start
        timestamp current_period_end
    }

    PLANS {
        uuid id PK
        string name
        string tier
        decimal price_monthly
        int student_limit
        int faculty_limit
        jsonb features
    }

    INVOICES {
        uuid id PK
        uuid tenant_id FK
        uuid subscription_id FK
        decimal amount
        string currency
        string status
        timestamp due_date
    }

    PAYMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid invoice_id FK
        string payment_gateway
        string gateway_tx_id
        decimal amount
        string status
        timestamp paid_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string action
        string entity_name
        string entity_id
        jsonb old_values
        jsonb new_values
        string ip_address
        string user_agent
        timestamp created_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean is_revoked
        timestamp created_at
    }
```
