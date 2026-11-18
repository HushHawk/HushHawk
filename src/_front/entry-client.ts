// Install the serialized SSR environment before evaluating the application module
// and its dependency graph. Normal CSR pages have no environment to install.
import './rendering/prerenderBootstrap';

// Every call to the HushHawk API carries the signed-in user's session. A 401 means the session ended, so the
// stored credentials are cleared and the user is sent to the login page.
if (typeof window !== 'undefined' && !(window as any).__HUSHHAWK_FETCH_WRAPPED__) {
  (window as any).__HUSHHAWK_FETCH_WRAPPED__ = true;
  const originalFetch = window.fetch.bind(window);

  const isApiRequest = (resource: RequestInfo | URL): boolean => {
    try {
      const raw = resource instanceof Request ? resource.url : String(resource);
      const url = new URL(raw, window.location.origin);
      const sameOrigin = url.origin === window.location.origin;
      return sameOrigin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ww/'));
    } catch {
      return false;
    }
  };

  const isLoginCall = (resource: RequestInfo | URL): boolean => {
    const raw = resource instanceof Request ? resource.url : String(resource);
    return /\/api\/(v1\/)?auth\/(login|get-session)/.test(raw);
  };

  window.fetch = async function (resource: RequestInfo | URL, init?: RequestInit) {
    if (!isApiRequest(resource)) return originalFetch(resource, init);

    const token = window.localStorage.getItem('hushhawk_auth_token');
    const headers = new Headers(init?.headers || (resource instanceof Request ? resource.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = await originalFetch(resource, { ...init, headers });
    if (response.status === 401 && !isLoginCall(resource) && !window.location.pathname.startsWith('/login')) {
      try {
        window.localStorage.removeItem('hushhawk_auth_token');
        window.localStorage.removeItem('hushhawk_session');
        window.sessionStorage.removeItem('hushhawk_session');
      } catch { /* storage unavailable */ }
      window.location.href = '/login';
    }
    return response;
  };
}

await import('./main.js');
