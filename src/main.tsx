import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared/i18n/index";
import "./shared/styles/global.css";
import { App } from "./app/App";
createRoot(document.getElementById("root")!).render(
// test
<StrictMode>
    <App />
  </StrictMode>,
);
