import { createRoot } from "react-dom/client";
import App from "./App";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";

// Register Service Worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
