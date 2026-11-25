# 10. REST API Specification & Endpoint Design

## 1. API Standards & Conventions

- **Base Path**: `/api/v1`
- **Specification**: OpenAPI 3.0 / Swagger UI exposed at `/api/docs`.
- **Content-Type**: `application/json` (multipart/form-data used exclusively for direct file uploads).
- **Pagination**: Zero-indexed or 1-indexed page/limit pattern:
  `GET /api/v1/queries?page=1&limit=20&sortBy=createdAt&sortOrder=desc&status=OPEN`
- **Response Envelope**: Standard JSend envelope with `success`, `data`, `meta`, and `error` structures.

---

## 2. Core API Endpoints

### 2.1 Authentication & Profile (`/api/v1/auth`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Email/password login; issues Access & Refresh Tokens | Public (Rate-limited) |
| `POST` | `/auth/refresh-token` | Exchange valid refresh token for a new token pair | Public (Cookie-based) |
| `POST` | `/auth/logout` | Revoke active refresh token in database | Authenticated |
| `GET` | `/auth/me` | Fetch active user profile, roles, and tenant context | Authenticated |
| `POST` | `/auth/forgot-password` | Request password reset email | Public |
| `POST` | `/auth/reset-password` | Set new password with verified OTP/token | Public |

### 2.2 Tenants & Colleges (`/api/v1/tenants`, `/api/v1/colleges`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/tenants` | Provision a new tenant college | `platform:tenants:manage` |
| `GET` | `/tenants` | List all colleges on SaaS platform | `platform:tenants:manage` |
| `GET` | `/tenants/:id` | Get specific tenant configuration | `tenant:settings:view` |
| `PATCH`| `/tenants/:id/settings`| Update college theme, logo, SLA config | `tenant:settings:edit` |
| `GET` | `/colleges/campuses` | List campuses for current college tenant | Authenticated |

### 2.3 Academic Structures (`/api/v1/departments`, `/api/v1/courses`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/departments` | List all college departments | Authenticated |
| `POST` | `/departments` | Create new department & assign HOD | `department:manage` |
| `GET` | `/courses` | List academic programs & semester counts | Authenticated |
| `POST` | `/courses` | Add degree course / program | `course:manage` |
| `GET` | `/academic-sessions` | List academic sessions (active flagged) | Authenticated |

### 2.4 Query Management (`/api/v1/queries`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/queries` | Filtered list of queries (Role/Tenant scoped) | `query:view:own` or `query:view:assigned` |
| `POST` | `/queries` | Create new query ticket | `query:create` |
| `GET` | `/queries/:id` | Get complete ticket details & metadata | Scoped to ticket access |
| `PATCH`| `/queries/:id/status` | Transition query status (e.g. IN_PROGRESS) | `query:reply:public` |
| `PATCH`| `/queries/:id/assign` | Manually assign/reassign to staff | `query:assign` |
| `PATCH`| `/queries/:id/escalate`| Manually escalate ticket to next tier | `query:escalate` |
| `PATCH`| `/queries/:id/resolve` | Mark query as resolved with summary | `query:resolve` |
| `POST` | `/queries/:id/feedback`| Submit student feedback & CSAT rating | Ticket Owner (Student) |

### 2.5 Conversation & Messages (`/api/v1/queries/:queryId/messages`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `GET` | `.../messages` | Paginated message stream from MongoDB | Ticket Participant |
| `POST` | `.../messages` | Send public reply or internal note | `query:reply:public` / `query:reply:internal` |
| `PATCH`| `.../messages/read` | Mark all unread messages as read | Ticket Participant |

### 2.6 Attachments & File Uploads (`/api/v1/attachments`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/attachments/presigned-url`| Generate signed S3 PUT URL for direct upload | Authenticated |
| `POST` | `/attachments/confirm` | Confirm upload completion and create DB record | Authenticated |
| `GET` | `/attachments/:id/download` | Generate signed S3 GET URL | Ticket Participant |

### 2.7 Analytics & SLA Reports (`/api/v1/analytics`, `/api/v1/reports`)
| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/overview` | Resolution rates, SLA breaches, ticket volume | `sla:view_metrics` |
| `GET` | `/analytics/faculty-workload`| Active ticket counts per faculty member | `department:manage` |
| `POST`| `/reports/export` | Trigger async generation of CSV / PDF report | `reports:export` |
