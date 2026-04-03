import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import OtpVerification from './pages/OtpVerification'
import Listening from './pages/Listening'
import LanguageSelect from './pages/LanguageSelect'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/language" element={<LanguageSelect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
