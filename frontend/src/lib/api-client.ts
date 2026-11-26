// ==============================================================================
// CollegeQuery SaaS — Frontend API Client (api-client.ts)
// ==============================================================================

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private tenantId: string = 'tenant-xyz';
  private tenantSlug: string = 'stjude-engineering';
  private actAsTenantId: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('cq_access_token');
      const savedTenantId = localStorage.getItem('cq_tenant_id');
      const savedTenantSlug = localStorage.getItem('cq_tenant_slug');
      const savedActAs = localStorage.getItem('cq_act_as_tenant_id');
      if (savedTenantId) this.tenantId = savedTenantId;
      if (savedTenantSlug) this.tenantSlug = savedTenantSlug;
      if (savedActAs) this.actAsTenantId = savedActAs;
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('cq_access_token', token);
      } else {
        localStorage.removeItem('cq_access_token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('cq_access_token');
    }
    return this.token;
  }

  public setTenant(tenantId: string, tenantSlug?: string) {
    this.tenantId = tenantId;
    if (tenantSlug) this.tenantSlug = tenantSlug;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cq_tenant_id', tenantId);
      if (tenantSlug) localStorage.setItem('cq_tenant_slug', tenantSlug);
    }
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  public setActAsTenantId(tenantId: string | null) {
    this.actAsTenantId = tenantId;
    if (typeof window !== 'undefined') {
      if (tenantId) {
        localStorage.setItem('cq_act_as_tenant_id', tenantId);
      } else {
        localStorage.removeItem('cq_act_as_tenant_id');
      }
    }
  }

  public getActAsTenantId(): string | null {
    return this.actAsTenantId;
  }

  private buildHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }

    if (this.tenantSlug) {
      headers['x-tenant-slug'] = this.tenantSlug;
    }

    if (this.actAsTenantId) {
      headers['x-act-as-tenant-id'] = this.actAsTenantId;
    }

    return headers;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    fallbackData?: T
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}/${endpoint.replace(/^\//, '')}`;

    const isFormData = options.body instanceof FormData;
    const headers = {
      ...this.buildHeaders(isFormData),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // keep text
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        // Unwrap NestJS TransformResponseInterceptor envelope { success: true, data: T }
        if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
          return json.data as T;
        }
        return json as T;
      }

      return (await response.text()) as unknown as T;
    } catch (err: any) {
      console.warn(`[API Client] Error on ${options.method || 'GET'} ${url}:`, err.message);
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      throw err;
    }
  }

  public get<T = any>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    fallbackData?: T
  ): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        url += (url.includes('?') ? '&' : '?') + queryStr;
      }
    }
    return this.request<T>(url, { method: 'GET' }, fallbackData);
  }

  public post<T = any>(endpoint: string, body?: any, fallbackData?: T): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      fallbackData
    );
  }

  public patch<T = any>(endpoint: string, body?: any, fallbackData?: T): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      fallbackData
    );
  }

  public put<T = any>(endpoint: string, body?: any, fallbackData?: T): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      fallbackData
    );
  }

  public delete<T = any>(endpoint: string, fallbackData?: T): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, fallbackData);
  }

  public upload<T = any>(endpoint: string, formData: FormData, fallbackData?: T): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: formData,
      },
      fallbackData
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
