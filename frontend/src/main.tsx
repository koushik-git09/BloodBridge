import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerBloodBridgeServiceWorker } from './services/firebase'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register background service worker immediately for push notifications using the unified registration helper
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerBloodBridgeServiceWorker().catch(() => {
      // Handled internally in registerBloodBridgeServiceWorker
    })
  })
}
