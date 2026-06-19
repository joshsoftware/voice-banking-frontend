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

const OnboardingRoute = ({ 
  children, 
  requiresLanguage = false,
  requiresVoice = false 
}: { 
  children: React.ReactNode
  requiresLanguage?: boolean
  requiresVoice?: boolean
}) => {
  const { isAuthenticated, preferredLanguage, isVoiceprintRegistered, isLoading, user } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  // Allow users to revisit /language, so we don't automatically forward them here.


  // For /voice-registration: redirect back if no language, forward if already registered
  if (requiresLanguage && !requiresVoice) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    // Allow users to revisit /voice-registration if they explicitly navigate here (e.g., from the menu)
  }

  // For /listening: redirect back if onboarding incomplete
  if (requiresLanguage && requiresVoice) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    if (!isVoiceprintRegistered && !(user?.customer_id && isVoiceSkipAllowed(user.customer_id))) {
      return <Navigate to="/voice-registration" replace />
    }
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, preferredLanguage, isVoiceprintRegistered, user } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  // If authenticated, send to appropriate onboarding step or home
  if (isAuthenticated) {
    if (!preferredLanguage) {
      return <Navigate to="/language" replace />
    }
    if (!isVoiceprintRegistered && !(user?.customer_id && isVoiceSkipAllowed(user.customer_id))) {
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
