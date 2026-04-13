import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type AuthSuccessResponse } from '@/services/authService'
import { setActiveCustomerByPhone, clearActiveCustomer, getActiveCustomer, type DemoCustomer } from '@/lib/demoCustomer'

interface AuthContextType {
  user: DemoCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  lastOtp: string | null
  requestOtp: (mobileNumber: string) => Promise<void>
  login: (mobileNumber: string, otp: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastOtp, setLastOtp] = useState<string | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token')
      if (accessToken) {
        // In a real app, we might fetch the user profile here
        const customer = getActiveCustomer()
        setUser(customer)
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const requestOtp = async (mobileNumber: string) => {
    try {
      const response = await authService.sendOtp(mobileNumber)
      if (response.otp) {
        setLastOtp(response.otp)
      }
    } catch (error) {
      console.error('Failed to request OTP:', error)
      throw error
    }
  }

  const login = async (mobileNumber: string, otp: string) => {
    try {
      const response: AuthSuccessResponse = await authService.verifyOtp(mobileNumber, otp)
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      // Update demo customer context to match logged in user
      const customer = setActiveCustomerByPhone(mobileNumber)
      setUser(customer)
      setLastOtp(null)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout API failure:', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      clearActiveCustomer()
      setUser(null)
      window.location.href = '/welcome'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        lastOtp,
        requestOtp,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
