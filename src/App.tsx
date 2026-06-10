import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import Welcome from './pages/Welcome'
import OtpVerification from './pages/OtpVerification'
import Listening from './pages/Listening'
import LanguageSelect from './pages/LanguageSelect'
import VoiceRegistration from './pages/VoiceRegistration'
import Profile from './pages/Profile'
import TermsAndConditions from './pages/TermsAndConditions'
import AdminLogin from './pages/AdminLogin'
import AdminFeedback from './pages/AdminFeedback'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext'
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt'

import { isVoiceSkipAllowed } from '@/lib/demoCustomer'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isNewUser, preferredLanguage, isVoiceprintRegistered, isLoading, user } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (isAuthenticated) {
    if (isNewUser || !preferredLanguage) {
      return <Navigate to="/language" replace />
    } else if (!isVoiceprintRegistered && !(user?.customer_id && isVoiceSkipAllowed(user.customer_id))) {
      return <Navigate to="/voice-registration" replace />
    } else {
      return <Navigate to="/listening" replace />
    }
  }

  return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isLoading } = useAdmin()
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  }
  
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <LanguageProvider>
            <VoiceSessionProvider>
              <PwaInstallPrompt />
              <Routes>
                <Route path="/" element={<PublicRoute><Navigate to="/welcome" replace /></PublicRoute>} />
                <Route path="/welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
                <Route path="/verify-otp" element={<PublicRoute><OtpVerification /></PublicRoute>} />
                <Route path="/terms" element={<TermsAndConditions />} />
                
                {/* Protected Routes */}
                <Route path="/language" element={<ProtectedRoute><LanguageSelect /></ProtectedRoute>} />
                <Route path="/home" element={<ProtectedRoute><Navigate to="/listening" replace /></ProtectedRoute>} />
                <Route path="/listening" element={<ProtectedRoute><Listening /></ProtectedRoute>} />
                <Route path="/voice-registration" element={<ProtectedRoute><VoiceRegistration /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
                
                <Route path="*" element={<Navigate to="/welcome" replace />} />
              </Routes>
            </VoiceSessionProvider>
          </LanguageProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
