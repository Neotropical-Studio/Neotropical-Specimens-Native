const createMock = () => ({
  from: () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => {
        try {
          const res = await fetch('/api/specimens');
          const data = await res.json();
          return { data: Array.isArray(data) ? data[0] : null, error: null };
        } catch { return { data: null, error: null }; }
      },
      then: (resolve: any) => {
        fetch('/api/specimens')
          .then(res => res.json())
          .then(data => resolve({ data: Array.isArray(data) ? data : [], error: null }))
          .catch(() => resolve({ data: [], error: null }));
      }
    };
    return builder;
  }
});

export const supabase = createMock() as any;
export const getSupabaseAdmin = () => createMock() as any;
export const createClient = () => createMock() as any;
