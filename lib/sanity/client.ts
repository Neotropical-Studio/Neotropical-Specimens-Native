export const sanity = {
  fetch: async <T = unknown>(_query: string, _params?: Record<string, unknown>): Promise<T> => {
    return [] as T;
  },
};

export const sanityPreview = sanity;
