import React from "react"
import ReactDOM from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import App from "./App"
import "./index.css"
import { ThemeProvider } from "./lib/theme"

// El service worker se actualiza solo y cachea el shell de la app.
// Las peticiones a /api y /uploads quedan fuera del cache (ver vite.config.ts).
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
