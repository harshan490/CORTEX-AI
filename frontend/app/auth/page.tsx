'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Brain,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard } from '@/components/ui/glass-card'
import { useStore as useAppStore } from '@/lib/store'

export default function AuthPage() {
  const router = useRouter()
  const login = useAppStore((s) => s.login)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('alice@cortex.ai')
  const [password, setPassword] = useState('••••••••')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      login({
        id: 'usr-001',
        name: 'Alice Chen',
        email: 'alice@cortex.ai',
        role: 'admin',
      })
      router.push('/dashboard')
    }, 800)
  }

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      login({
        id: 'usr-001',
        name: 'Alice Chen',
        email: email,
        role: 'admin',
      })
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="animated-gradient fixed inset-0" />

      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          <div className="floating">
            <div className="flex items-center justify-center mb-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
                <Brain className="h-14 w-14 text-white" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              CORTEX <span className="text-gradient">AI</span>
            </h1>
            <p className="text-xl text-white/60 max-w-md mx-auto leading-relaxed">
              The Autonomous AI Chief of Staff
            </p>
            <p className="text-sm text-white/30 mt-4 max-w-sm mx-auto">
              Enterprise-grade intelligence that autonomously manages your meetings, tasks, and workflows
            </p>
          </div>

          <div className="flex justify-center gap-3 mt-12">
            {['Video', 'Mic', 'Bot', 'Cpu'].map((icon, i) => {
              const icons = [VideoMicIcon, BotIcon, CpuIcon, SparklesIcon]
              const Icon = icons[i] || icons[0]
              return (
                <motion.div
                  key={icon}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="floating-delayed"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                    <Icon />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <GlassCard glow className="!p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                className="flex justify-center mb-4 lg:hidden"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg">
                  <Brain className="h-9 w-9 text-white" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-white/50 mt-1">
                {mode === 'login' ? 'Sign in to continue to CORTEX AI' : 'Get started with CORTEX AI'}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <GoogleLogo />
              Continue with Google
            </motion.button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-cortex-dark px-4 text-xs text-white/30">or</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@cortex.ai"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  icon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500" />
                  <span className="text-xs text-white/50">Remember me</span>
                </label>
                <button type="button" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-xs text-white/30 mt-6">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.832 1.24 6.926l4.026 2.839Z" />
      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 2.859A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
      <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.554-5.09 3.554-9 0-.775-.085-1.535-.248-2.273H12v4.546h4.437a5.057 5.057 0 0 1-2.327 3.358l3.724 2.914Z" />
      <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.926A11.926 11.926 0 0 0 0 12c0 1.92.445 3.73 1.237 5.338l4.04-3.07Z" />
    </svg>
  )
}

function VideoMicIcon() {
  return (
    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function BotIcon() {
  return <Brain className="h-6 w-6 text-blue-400" />
}

function CpuIcon() {
  return (
    <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  )
}

function SparklesIcon() {
  return <Sparkles className="h-6 w-6 text-amber-400" />
}
