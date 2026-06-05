import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./layouts/layout";
import { AboutMePage } from "./pages/about_me";
import { NotFoundPage } from './pages/404';
import { Main } from './pages/main';
import { ARTICLE_NAME } from './routing/site_params';
import { ArticlePage } from './pages/articles/article_page';
import { ArticlesIndexPage } from './pages/articles/articles_index_page';

let container = document.getElementById("app")!;
let root = createRoot(container)
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Main />} />
          <Route path="/about-me" element={<AboutMePage />} />
          <Route path="/articles" element={<ArticlesIndexPage />}></Route>
          <Route path={`/articles/:articleName`} element={<ArticlePage />}></Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>,
  </StrictMode>
);
