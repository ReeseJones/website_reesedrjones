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

/*
function Index() {
  return (
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Main />} />
            <Route path="/about-me" element={<AboutMePage />} />
            <Route path="/articles" element={<ArticlesIndexPage />}></Route>
            {ARTICLE_PAGES.map((pageDetails) => {
              const ArticleComponent = pageDetails.articleComponent;
              return <Route path={`/articles/${pageDetails.path}`} element={<ArticleComponent/>}></Route>;
            })}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>,
    </StrictMode>
  );
}
  */

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
