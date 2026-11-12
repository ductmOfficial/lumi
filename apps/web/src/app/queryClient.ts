import { QueryClient } from "@tanstack/react-query";
import { MissingTokenError, TmdbError } from "@/lib/tmdb";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // movie data rarely changes
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof MissingTokenError) return false;
        if (
          error instanceof TmdbError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        )
          return false;
        return failureCount < 2;
      },
    },
  },
});
