import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import OtpVerification from './pages/OtpVerification'
import Listening from './pages/Listening'
import LanguageSelect from './pages/LanguageSelect'
import VoiceRegistration from './pages/VoiceRegistration'
import Profile from './pages/Profile'
import TermsAndConditions from './pages/TermsAndConditions'
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
    } else if (!isVoiceprintRegistered) {
      return <Navigate to="/voice-registration" replace />
    } else if (isVoiceprintRegistered || (user?.customer_id && isVoiceSkipAllowed(user.customer_id))) {
      return <Navigate to="/home" replace />
    }
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/listening" element={<ProtectedRoute><Listening /></ProtectedRoute>} />
            <Route path="/voice-registration" element={<ProtectedRoute><VoiceRegistration /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </VoiceSessionProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
