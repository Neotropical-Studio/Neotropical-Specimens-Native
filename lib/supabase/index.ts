const createMockProxy = (): any => {
  const fn = () => {};
  return new Proxy(fn, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: Function) => resolve({ data: [], error: null, count: 0 });
      }
      if (prop === 'catch') {
        return (resolve: Function) => {};
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      return (...args: any[]) => createMockProxy();
    },
    apply() {
      return createMockProxy();
    }
  });
};

const mockInstance = createMockProxy();

export function isSupabaseAdminConfigured() { return true; }
export function isSupabaseConfigured() { return true; }
export function getSupabaseAdmin() { return mockInstance; }
export function getSupabaseBrowser() { return mockInstance; }
export function anonClient() { return mockInstance; }
export function createClient() { return mockInstance; }
export function createBrowserClient() { return mockInstance; }
export function createServerClient() { return mockInstance; }
export const supabase = mockInstance;
export default mockInstance;
