// ==============================================================================
// CollegeQuery SaaS — Seed Script (System Roles, Permissions, Plans)
// ==============================================================================

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SYSTEM_PERMISSIONS = [
  // Query Management
  { code: 'query:create', module: 'QUERIES', action: 'CREATE', description: 'Create a new query ticket' },
  { code: 'query:view:own', module: 'QUERIES', action: 'VIEW', description: 'View queries created by self' },
  { code: 'query:view:assigned', module: 'QUERIES', action: 'VIEW', description: 'View queries assigned to self' },
  { code: 'query:view:department', module: 'QUERIES', action: 'VIEW', description: 'View queries in department' },
  { code: 'query:view:all', module: 'QUERIES', action: 'VIEW', description: 'View all queries across college' },
  { code: 'query:reply:public', module: 'QUERIES', action: 'REPLY', description: 'Post public reply in query chat' },
  { code: 'query:reply:internal', module: 'QUERIES', action: 'REPLY', description: 'Post internal staff note' },
  { code: 'query:assign', module: 'QUERIES', action: 'ASSIGN', description: 'Assign query to faculty/staff' },
  { code: 'query:reassign', module: 'QUERIES', action: 'ASSIGN', description: 'Reassign query to another user/dept' },
  { code: 'query:escalate', module: 'QUERIES', action: 'ESCALATE', description: 'Manually escalate ticket' },
  { code: 'query:resolve', module: 'QUERIES', action: 'RESOLVE', description: 'Mark query as resolved' },
  { code: 'query:close', module: 'QUERIES', action: 'CLOSE', description: 'Permanently close ticket' },
  { code: 'query:reopen', module: 'QUERIES', action: 'REOPEN', description: 'Reopen resolved query' },

  // Academic Management
  { code: 'department:manage', module: 'ACADEMIC', action: 'MANAGE', description: 'Create/edit departments' },
  { code: 'course:manage', module: 'ACADEMIC', action: 'MANAGE', description: 'Create/edit courses' },
  { code: 'student:manage', module: 'ACADEMIC', action: 'MANAGE', description: 'Manage student directory' },
  { code: 'faculty:manage', module: 'ACADEMIC', action: 'MANAGE', description: 'Manage faculty directory' },
  { code: 'employee:manage', module: 'ACADEMIC', action: 'MANAGE', description: 'Manage employee directory' },

  // Settings & Configuration
  { code: 'tenant:settings:view', module: 'SETTINGS', action: 'VIEW', description: 'View college configuration' },
  { code: 'tenant:settings:edit', module: 'SETTINGS', action: 'EDIT', description: 'Modify college branding and settings' },
  { code: 'roles:manage', module: 'SETTINGS', action: 'MANAGE', description: 'Manage custom roles and permissions' },
  { code: 'sla:manage', module: 'SETTINGS', action: 'MANAGE', description: 'Configure SLA policies and working hours' },

  // Metrics & Reports
  { code: 'analytics:view', module: 'ANALYTICS', action: 'VIEW', description: 'View resolution metrics and charts' },
  { code: 'reports:export', module: 'REPORTS', action: 'EXPORT', description: 'Export compliance reports (CSV/PDF)' },

  // SaaS Platform Administration
  { code: 'platform:tenants:manage', module: 'PLATFORM', action: 'MANAGE', description: 'Provision/suspend college tenants' },
  { code: 'platform:plans:manage', module: 'PLATFORM', action: 'MANAGE', description: 'Manage SaaS subscription plans' },
  { code: 'platform:tenant:impersonate', module: 'PLATFORM', action: 'IMPERSONATE', description: 'Cross-tenant impersonation with audit' },
];

const SYSTEM_ROLES = [
  {
    code: 'SAAS_SUPER_ADMIN',
    name: 'SaaS Super Admin',
    description: 'Global administrator of the CollegeQuery platform',
    permissions: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'COLLEGE_ADMIN',
    name: 'College Administrator',
    description: 'Tenant administrator managing college settings, staff, and departments',
    permissions: [
      'query:view:all', 'query:assign', 'query:reassign', 'query:escalate', 'query:resolve', 'query:close', 'query:reply:internal',
      'department:manage', 'course:manage', 'student:manage', 'faculty:manage', 'employee:manage',
      'tenant:settings:view', 'tenant:settings:edit', 'roles:manage', 'sla:manage', 'analytics:view', 'reports:export',
    ],
  },
  {
    code: 'PRINCIPAL',
    name: 'College Principal',
    description: 'Executive academic authority with full query visibility and escalation oversight',
    permissions: [
      'query:view:all', 'query:reply:public', 'query:reply:internal', 'query:assign', 'query:reassign', 'query:escalate', 'query:resolve',
      'analytics:view', 'reports:export', 'tenant:settings:view',
    ],
  },
  {
    code: 'HOD',
    name: 'Head of Department',
    description: 'Departmental head overseeing faculty workload and query assignments',
    permissions: [
      'query:view:department', 'query:view:assigned', 'query:reply:public', 'query:reply:internal',
      'query:assign', 'query:reassign', 'query:escalate', 'query:resolve', 'analytics:view', 'reports:export',
    ],
  },
  {
    code: 'FACULTY',
    name: 'Faculty Member',
    description: 'Teaching staff resolving academic and subject inquiries',
    permissions: [
      'query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:escalate', 'query:resolve',
    ],
  },
  {
    code: 'STUDENT',
    name: 'Student',
    description: 'Primary inquiry creator across academic, fee, and administrative categories',
    permissions: [
      'query:create', 'query:view:own', 'query:reply:public', 'query:close', 'query:reopen',
    ],
  },
  {
    code: 'RECEPTION_STAFF',
    name: 'Reception Staff',
    description: 'Front-desk administrative staff handling general walk-in and basic queries',
    permissions: [
      'query:create', 'query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:resolve',
    ],
  },
  {
    code: 'ACCOUNTS_STAFF',
    name: 'Accounts Staff',
    description: 'Finance department staff handling fee dues, receipts, and refund queries',
    permissions: [
      'query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:resolve', 'query:escalate',
    ],
  },
  {
    code: 'EXAMINATION_STAFF',
    name: 'Examination Staff',
    description: 'Staff handling hall tickets, marks, results, and grade verification',
    permissions: [
      'query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:resolve', 'query:escalate',
    ],
  },
  {
    code: 'SUPPORT_STAFF',
    name: 'General Support Staff',
    description: 'Staff handling facilities, hostels, transport, and maintenance queries',
    permissions: [
      'query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:resolve',
    ],
  },
];

const SUBSCRIPTION_PLANS = [
  {
    name: 'Starter Campus',
    tier: 'STARTER',
    priceMonthly: 99.0,
    priceYearly: 990.0,
    studentLimit: 1000,
    facultyLimit: 50,
    featuresJson: {
      customDomain: false,
      smsAlerts: false,
      slaAutomation: true,
      dataRetentionDays: 90,
      supportTier: 'EMAIL_ONLY',
    },
  },
  {
    name: 'Campus Pro',
    tier: 'CAMPUS_PRO',
    priceMonthly: 299.0,
    priceYearly: 2990.0,
    studentLimit: 5000,
    facultyLimit: 250,
    featuresJson: {
      customDomain: true,
      smsAlerts: true,
      slaAutomation: true,
      dataRetentionDays: 365,
      supportTier: 'PRIORITY_CHAT',
    },
  },
  {
    name: 'Enterprise University',
    tier: 'ENTERPRISE',
    priceMonthly: 799.0,
    priceYearly: 7990.0,
    studentLimit: 25000,
    facultyLimit: 1500,
    featuresJson: {
      customDomain: true,
      smsAlerts: true,
      slaAutomation: true,
      dataRetentionDays: 1825,
      supportTier: 'DEDICATED_24_7',
    },
  },
];

async function main() {
  console.log('🌱 Starting CollegeQuery Database Seeding...');

  // 1. Seed Permissions
  console.log('Inserting atomic permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, module: perm.module, action: perm.action },
      create: perm,
    });
  }

  // 2. Seed System Roles & Map Permissions
  console.log('Inserting system roles & permission links...');
  for (const roleDef of SYSTEM_ROLES) {
    let role = await prisma.role.findFirst({
      where: { tenantId: null, code: roleDef.code },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: true,
          tenantId: null,
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { name: roleDef.name, description: roleDef.description },
      });
    }

    // Link permissions
    const permissionRecords = await prisma.permission.findMany({
      where: { code: { in: roleDef.permissions } },
    });

    for (const p of permissionRecords) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
  }

  // 3. Seed Subscription Plans
  console.log('Inserting subscription plans...');
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        studentLimit: plan.studentLimit,
        facultyLimit: plan.facultyLimit,
        featuresJson: plan.featuresJson,
      },
      create: {
        name: plan.name,
        tier: plan.tier,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        studentLimit: plan.studentLimit,
        facultyLimit: plan.facultyLimit,
        featuresJson: plan.featuresJson,
      },
    });
  }

  // 4. Seed SaaS Super Admin User
  console.log('Seeding SaaS Super Admin...');
  const adminEmail = 'superadmin@collegequery.com';
  const superAdminRole = await prisma.role.findFirst({ where: { code: 'SAAS_SUPER_ADMIN' } });

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, tenantId: null },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await argon2.hash('SuperAdmin@CollegeQuery2026!');
    const superAdminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'SaaS',
        lastName: 'SuperAdmin',
        userType: 'SAAS_SUPER_ADMIN',
        isSuperAdmin: true,
        tenantId: null,
      },
    });

    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
        },
      });
    }
    console.log(`Created Super Admin user: ${adminEmail}`);
  }

  console.log('✅ CollegeQuery Database Seeding Finished Successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
