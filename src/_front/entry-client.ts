// Install the serialized SSR environment before evaluating the application module
// and its dependency graph. Normal CSR pages have no environment to install.
import './rendering/prerenderBootstrap';

if (typeof window !== 'undefined' && !(window as any).__HUSHHAWK_FETCH_WRAPPED__) {
  (window as any).__HUSHHAWK_FETCH_WRAPPED__ = true;
  const originalFetch = window.fetch;
  window.fetch = function (resource: RequestInfo | URL, init?: RequestInit) {
    const token = window.localStorage.getItem('hushhawk_auth_token');
    if (token && typeof resource === 'string' && (resource.startsWith('/api/') || resource.startsWith('/ww/'))) {
      init = init ? { ...init } : {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init.headers = headers;
    }
    return originalFetch.call(this, resource, init);
  };
}

await import('./main.js');
