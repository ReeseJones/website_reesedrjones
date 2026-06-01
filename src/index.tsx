import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App } from './app';
import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./layouts/layout";
import { AboutMePage } from "./pages/about_me";

let container = document.getElementById("app")!;
let root = createRoot(container)
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/about-me" element={<AboutMePage />} />
        </Route>
      </Routes>
    </BrowserRouter>,
  </StrictMode>
);
