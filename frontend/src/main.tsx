import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Router from './AppRouter'
import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import RouteAnnouncer from './components/RouteAnnouncer'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <RouteAnnouncer />
            <Router />
            <OfflineBanner />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
)
