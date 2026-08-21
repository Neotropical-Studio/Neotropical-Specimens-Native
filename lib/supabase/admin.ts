const createMock = () => ({
  from: () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null })
    };
    return builder;
  },
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
});

const mockInstance = createMock();

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
