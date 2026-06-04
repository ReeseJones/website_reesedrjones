import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./layouts/layout";
import { AboutMePage } from "./pages/about_me";
import { NotFoundPage } from './pages/404';
import { Main } from './pages/main';

let container = document.getElementById("app")!;
let root = createRoot(container)
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Main />} />
          <Route path="/about-me" element={<AboutMePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>,
  </StrictMode>
);
