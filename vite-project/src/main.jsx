import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import PublicCard from './pages/PublicCard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
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
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
