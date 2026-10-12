import { createRoot } from 'react-dom/client';
import { Component, StrictMode } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Layout } from "./layouts/layout";
import { AboutMePage } from "./pages/about_me";
import { NotFoundPage } from './pages/404';
import { Main } from './pages/main';
import { ArticlesIndexPage } from './pages/articles/articles_index_page';
import { ARTICLE_PAGES } from "./pages/articles/index_instance";
import { APP_VERSION, GIT_COMMIT, GIT_BRANCH, BUILD_TIMESTAMP } from "./version";

console.log(
  `%c[website_reesedrjones]%c v${APP_VERSION} (%c${GIT_COMMIT}%c on %c${GIT_BRANCH}%c) • Built ${BUILD_TIMESTAMP}`,
  "color: #4fc3f7; font-weight: bold;",
  "color: #ffffff; font-weight: bold;",
  "color: #81c784; font-weight: bold;",
  "color: #ffffff;",
  "color: #ffb74d; font-weight: bold;",
  "color: #888888;"
);

const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
       { index: true, Component: Main },
       {
          path: "/about-me",
          Component: AboutMePage
       },
       {
          path: "/articles",
          Component: ArticlesIndexPage
       },
       ... ARTICLE_PAGES.map((pageDetails) => {
          return {
            path: `/articles/${pageDetails.path}`,
            Component: pageDetails.articleComponent
          };
        }),
        {
          path: "*",
          Component: NotFoundPage
        }
    ],
  },
]);

const root = document.getElementById("app")!;
createRoot(root).render(<RouterProvider router={router} />);
