import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layout/RootLayout";
import { NotFoundPage, RouteError } from "./layout/RouteError";

const movieTabs = () => import("@/features/movies/profile/OtherTabs");
const personTabs = () => import("@/features/people/profile/PersonTabs");
const seasonTabs = () => import("@/features/tv/SeasonsTab");

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      {
        ErrorBoundary: RouteError,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import("@/features/home/pages")).HomePage }),
          },
          {
            path: "movies",
            lazy: async () => ({
              Component: (await import("@/features/home/pages")).MoviesHomePage,
            }),
          },
          {
            path: "series",
            lazy: async () => ({
              Component: (await import("@/features/home/pages")).SeriesHomePage,
            }),
          },
          {
            path: "series/:category",
            lazy: async () => ({
              Component: (await import("@/features/tv/SeriesListPage")).SeriesListPage,
            }),
          },
          {
            path: "movies/:category",
            lazy: async () => ({
              Component: (await import("@/features/movies/pages/MovieListPage")).MovieListPage,
            }),
          },
          {
            // /movie/693134-dune-part-two[/tab]
            path: "movie/:movieId",
            lazy: async () => ({
              Component: (await import("@/features/movies/profile/MovieProfilePage"))
                .MovieProfilePage,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("@/features/movies/profile/TimelineTab")).TimelineTab,
                }),
              },
              { path: "about", lazy: async () => ({ Component: (await movieTabs()).AboutTab }) },
              { path: "cast", lazy: async () => ({ Component: (await movieTabs()).CastTab }) },
              { path: "photos", lazy: async () => ({ Component: (await movieTabs()).PhotosTab }) },
              {
                path: "videos",
                lazy: async () => ({
                  Component: (await import("@/features/movies/profile/VideosTab")).VideosTab,
                }),
              },
              {
                path: "reviews",
                lazy: async () => ({ Component: (await movieTabs()).ReviewsTab }),
              },
              {
                path: "similar",
                lazy: async () => ({ Component: (await movieTabs()).SimilarTab }),
              },
            ],
          },
          {
            // /tv/1399-game-of-thrones[/tab] — shares the movie tabs + a Seasons tab
            path: "tv/:tvId",
            lazy: async () => ({
              Component: (await import("@/features/movies/profile/MovieProfilePage")).TvProfilePage,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("@/features/movies/profile/TimelineTab")).TimelineTab,
                }),
              },
              { path: "about", lazy: async () => ({ Component: (await movieTabs()).AboutTab }) },
              {
                path: "seasons",
                lazy: async () => ({ Component: (await seasonTabs()).SeasonsTab }),
              },
              {
                path: "seasons/:seasonNumber",
                lazy: async () => ({ Component: (await seasonTabs()).SeasonDetailTab }),
              },
              { path: "cast", lazy: async () => ({ Component: (await movieTabs()).CastTab }) },
              { path: "photos", lazy: async () => ({ Component: (await movieTabs()).PhotosTab }) },
              {
                path: "videos",
                lazy: async () => ({
                  Component: (await import("@/features/movies/profile/VideosTab")).VideosTab,
                }),
              },
              {
                path: "reviews",
                lazy: async () => ({ Component: (await movieTabs()).ReviewsTab }),
              },
              {
                path: "similar",
                lazy: async () => ({ Component: (await movieTabs()).SimilarTab }),
              },
            ],
          },
          {
            path: "person/:personId",
            lazy: async () => ({
              Component: (await import("@/features/people/profile/PersonProfilePage"))
                .PersonProfilePage,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await personTabs()).LifeEventsTab }),
              },
              {
                path: "about",
                lazy: async () => ({ Component: (await personTabs()).PersonAboutTab }),
              },
              {
                path: "movies",
                lazy: async () => ({ Component: (await personTabs()).PersonMoviesTab }),
              },
              {
                path: "photos",
                lazy: async () => ({ Component: (await personTabs()).PersonPhotosTab }),
              },
            ],
          },
          {
            path: "discover",
            lazy: async () => ({
              Component: (await import("@/features/discover/pages/DiscoverHubPage"))
                .DiscoverHubPage,
            }),
          },
          {
            path: "discover/browse",
            lazy: async () => ({
              Component: (await import("@/features/discover/pages/DiscoverPage")).DiscoverPage,
            }),
          },
          {
            path: "search",
            lazy: async () => ({
              Component: (await import("@/features/search/pages/SearchPage")).SearchPage,
            }),
          },
          {
            path: "watchlist",
            lazy: async () => ({
              Component: (await import("@/features/watchlist/pages/WatchlistPage")).WatchlistPage,
            }),
          },
          {
            path: "lists/shared",
            lazy: async () => ({
              Component: (await import("@/features/library/pages/SharedListPage")).SharedListPage,
            }),
          },
          {
            path: "lists/:listId",
            lazy: async () => ({
              Component: (await import("@/features/library/pages/ListPage")).ListPage,
            }),
          },
          {
            path: "settings",
            lazy: async () => ({
              Component: (await import("@/features/settings/pages/SettingsPage")).SettingsPage,
            }),
          },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]);
