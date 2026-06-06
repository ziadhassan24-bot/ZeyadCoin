// React entry point. Mounts the single-page <App /> into #root and pulls in
// the global stylesheet (Tailwind v4 + the neo-brutalist design system).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
