import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider
    client={convex}
    storage={window.sessionStorage}
    storageNamespace="bokun-frontend-auth-tab"
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConvexAuthProvider>,
);
