import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useAuthStore } from './store/authStore'

// i18n must be imported before App renders
import './i18n/index.js'

// Global styles
import './index.css'

// Initialise auth before first render
useAuthStore.getState().init()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
