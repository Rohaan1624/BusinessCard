import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const from = location.state?.from || '/dashboard'

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const fn =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })
    const { data, error } = await fn
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: error.message })
    } else if (mode === 'signup' && !data.session) {
      setMessage({ kind: 'ok', text: 'Check your email to confirm your account, then sign in.' })
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CreditCard className="size-4" />
        </span>
        BizCard
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
            </TabsList>
          </Tabs>
          <CardTitle>{mode === 'signup' ? 'Create an account' : 'Welcome back'}</CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Design your card for free — pay only when you publish.'
              : 'Sign in to manage your business cards.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
            {message && (
              <Alert variant={message.kind === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Working…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
