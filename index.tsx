import React from 'react';
import { createRoot } from 'react-dom/client';
import 'vazirmatn/Vazirmatn-font-face.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline support
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);