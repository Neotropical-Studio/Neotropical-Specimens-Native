const createMock = () => ({
  from: () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => {
        try {
          const res = await fetch("http://localhost:3000/api/specimens");
          const data = await res.json();
          return { data: Array.isArray(data) ? data[0] : null, error: null };
        } catch { return { data: null, error: null }; }
      },
      then: (resolve: any) => {
        fetch("http://localhost:3000/api/specimens")
          .then(res => res.json())
          .then(data => resolve({ data: Array.isArray(data) ? data : [], error: null }))
          .catch(() => resolve({ data: [], error: null }));
      }
    };
    return builder;
  }
});

export function isSupabaseAdminConfigured() { return true; }
export function isSupabaseConfigured() { return true; }
export function getSupabaseAdmin() { return createMock(); }
export function anonClient() { return createMock(); }
export function createClient() { return createMock(); }
export const supabase = createMock();
export default createMock();
