import './response-reading.css'
import './claim-workspace.css'
import './legacy/usability'
import './usability.css'
import './legacy/delphiDemo'
import './components/summary/summary-refinement.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Router from './AppRouter'
import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import './i18n'
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
