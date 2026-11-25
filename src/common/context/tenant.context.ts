// ==============================================================================
// CollegeQuery SaaS — Tenant Context & AsyncLocalStorage
// ==============================================================================

import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  isSuperAdmin?: boolean;
}

export const tenantAsyncStorage = new AsyncLocalStorage<TenantStore>();

export class TenantContext {
  static run<R>(store: TenantStore, callback: () => R): R {
    return tenantAsyncStorage.run(store, callback);
  }

  static get(): TenantStore | undefined {
    return tenantAsyncStorage.getStore();
  }

  static setTenantId(tenantId: string): void {
    const store = this.get();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  static getTenantId(): string {
    const store = this.get();
    if (!store?.tenantId) {
      throw new Error('TenantContext error: No active tenantId in execution context.');
    }
    return store.tenantId;
  }

  static getTenantSlug(): string {
    const store = this.get();
    return store?.tenantSlug || '';
  }

  static isSuperAdmin(): boolean {
    return !!this.get()?.isSuperAdmin;
  }
}
