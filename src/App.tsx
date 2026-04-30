import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import OtpVerification from './pages/OtpVerification'
import Listening from './pages/Listening'
import LanguageSelect from './pages/LanguageSelect'
import VoiceRegistration from './pages/VoiceRegistration'
import Profile from './pages/Profile'
import TermsAndConditions from './pages/TermsAndConditions'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VoiceSessionProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/verify-otp" element={<OtpVerification />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
