import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import "./review/comments.js";
import "./review/prototype.js";

import { App } from "./App";
import { installLinkInterception } from "./links";
import type { ScreenId } from "./routes";
import { screenChanged } from "./sim";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

installLinkInterception();

document.addEventListener("prototype:screen-change", (event) => screenChanged((event as CustomEvent<ScreenId>).detail));
