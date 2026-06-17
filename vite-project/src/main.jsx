/* eslint-disable react-refresh/only-export-components -- entry file, not a HMR'd component module */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import ProtectedRoute from './components/ProtectedRoute'

// Route-level code splitting: a scanned /c/:slug only downloads the public-card
// chunk, not the editor/PayPal/QR/image-export code.
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Editor = lazy(() => import('./pages/Editor'))
const PublicCard = lazy(() => import('./pages/PublicCard'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:cardId"
              element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              }
            />
            <Route path="/c/:slug" element={<PublicCard />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
