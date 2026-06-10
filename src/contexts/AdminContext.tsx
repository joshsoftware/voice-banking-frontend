import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AdminContextType {
  isAdminAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check if admin is already logged in (from sessionStorage)
    const adminAuth = sessionStorage.getItem('admin_authenticated')
    if (adminAuth === 'true') {
      setIsAdminAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const login = (username: string, password: string): boolean => {
    const adminUsername = import.meta.env.VITE_ADMIN_USERNAME
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD

    if (username === adminUsername && password === adminPassword) {
      setIsAdminAuthenticated(true)
      sessionStorage.setItem('admin_authenticated', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdminAuthenticated(false)
    sessionStorage.removeItem('admin_authenticated')
  }

  return (
    <AdminContext.Provider value={{ isAdminAuthenticated, isLoading, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
