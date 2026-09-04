import './App.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth, canEnterListening } from './contexts/AuthContext'
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}

const OnboardingRoute = ({ 
  children, 
  requiresLanguage = false,
  requiresVoice = false 
}: { 
  children: React.ReactNode
  requiresLanguage?: boolean
  requiresVoice?: boolean
}) => {
  const {
    isAuthenticated,
    preferredLanguage,
    isLoading,
    user,
    isVoiceprintRegistered,
    voiceRegistrationSkipped,
  } = useAuth()
  const location = useLocation()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  // /voice-registration: need language; leave automatically unless user explicitly opened enroll UI
  if (requiresLanguage && !requiresVoice) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    const explicitEnroll = new URLSearchParams(location.search).get('intent') === 'enroll'
    if (
      !explicitEnroll &&
      canEnterListening({
        isVoiceprintRegistered,
        voiceRegistrationSkipped,
        customerId: user?.customer_id,
      })
    ) {
      return <Navigate to="/listening" replace />
    }
  }

  // /listening + /home: onboarding must be complete
  if (requiresLanguage && requiresVoice) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    if (
      !canEnterListening({
        isVoiceprintRegistered,
        voiceRegistrationSkipped,
        customerId: user?.customer_id,
      })
    ) {
      return <Navigate to="/voice-registration" replace />
    }
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const {
    isAuthenticated,
    isLoading,
    preferredLanguage,
    isVoiceprintRegistered,
    voiceRegistrationSkipped,
    user,
  } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (isAuthenticated) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    if (
      !canEnterListening({
        isVoiceprintRegistered,
        voiceRegistrationSkipped,
        customerId: user?.customer_id,
      })
    ) {
      return <Navigate to="/voice-registration" replace />
    }
    return <Navigate to="/listening" replace />
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
                
                {/* Protected Routes - onboarding flow */}
                <Route path="/language" element={<OnboardingRoute><LanguageSelect /></OnboardingRoute>} />
                <Route path="/voice-registration" element={<OnboardingRoute requiresLanguage><VoiceRegistration /></OnboardingRoute>} />
                <Route path="/listening" element={<OnboardingRoute requiresLanguage requiresVoice><Listening /></OnboardingRoute>} />
                <Route path="/home" element={<OnboardingRoute requiresLanguage requiresVoice><Navigate to="/listening" replace /></OnboardingRoute>} />
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
