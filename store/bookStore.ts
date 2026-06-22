import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookState {
  currentBookId: string | null;
  currentCfi: string | null; // CFI tracks the precise character coordinate in an EPUB file
  fontSize: number;

  // Per-book saved reading position, keyed by a stable book id (not the
  // volatile cache file path, which changes on every import).
  locationsByBook: Record<string, string>;

  setBook: (bookId: string) => void;
  updateLocation: (cfi: string) => void;
  setFontSize: (size: number) => void;

  // Look up the last saved CFI for a given book id, e.g. to pass into
  // rendition.display(cfi) when re-opening a book.
  getLocationForBook: (bookId: string) => string | null;
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      currentBookId: null,
      currentCfi: null,
      fontSize: 16,
      locationsByBook: {},

      setBook: (bookId) =>
        set((state) => ({
          currentBookId: bookId,
          // Restore the saved position for this book, if any, instead of
          // always resetting to null.
          currentCfi: state.locationsByBook[bookId] ?? null,
        })),

      updateLocation: (cfi) =>
        set((state) => {
          if (!state.currentBookId) {
            // No book context yet; just track it transiently.
            return { currentCfi: cfi };
          }
          return {
            currentCfi: cfi,
            locationsByBook: {
              ...state.locationsByBook,
              [state.currentBookId]: cfi,
            },
          };
        }),

      setFontSize: (size) => set({ fontSize: size }),

      getLocationForBook: (bookId) => get().locationsByBook[bookId] ?? null,
    }),
    {
      name: 'book-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data that should survive app restarts —
      // currentCfi is transient/derived, no need to double-store it.
      partialize: (state) => ({
        fontSize: state.fontSize,
        locationsByBook: state.locationsByBook,
      }),
    }
  )
);