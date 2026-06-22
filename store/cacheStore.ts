import { create } from 'zustand';
import { PageInsight } from '../services/groq';

interface CacheState {
  // Key format: "bookId_pageHash" -> Structured AI response
  cache: Record<string, PageInsight>;
  setPageInsight: (pageKey: string, insight: PageInsight) => void;
  getCachedInsight: (pageKey: string) => PageInsight | null;
  clearCache: () => void;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  cache: {},
  
  setPageInsight: (pageKey, insight) => set((state) => ({
    cache: { ...state.cache, [pageKey]: insight }
  })),

  getCachedInsight: (pageKey) => {
    return get().cache[pageKey] || null;
  },

  clearCache: () => set({ cache: {} }),
}));