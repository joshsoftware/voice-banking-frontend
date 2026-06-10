import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '@/contexts/AdminContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAdmin()
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = login(username, password)
      if (success) {
        navigate('/admin/feedback')
      } else {
        setError('Invalid username or password')
        setPassword('')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen [background:var(--gradient-brand)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-xl">
          {/* Title Section */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-white/70 text-sm">
              Sign in to access the feedback dashboard
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-white/90">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full h-12"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-12"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/20 border border-red-500/40 p-3 text-center text-sm font-medium text-red-200">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-12 text-base font-semibold mt-6" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-white/50">
              Protected admin area • Authorized access only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
