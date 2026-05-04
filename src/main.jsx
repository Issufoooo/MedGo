import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useAuthStore } from './store/authStore'

// Global styles
import './index.css'

// Leaflet CSS — required for maps
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon broken by Vite asset pipeline
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// Initialise auth before first render
useAuthStore.getState().init()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
