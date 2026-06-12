import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'
import { DEFAULT_THEME } from '../lib/themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import AppHeader from '../components/AppHeader'

function randomSlug() {
  return `card-${Math.random().toString(36).slice(2, 8)}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cards, setCards] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('cards')
      .select('id, slug, full_name, company, status, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error(error.message)
        else setCards(data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function createCard() {
    setCreating(true)
    // Retry on the rare slug collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('cards')
        .insert({ user_id: user.id, slug: randomSlug(), theme: DEFAULT_THEME })
        .select('id')
        .single()
      if (!error) {
        navigate(`/editor/${data.id}`)
        return
      }
      if (error.code !== '23505') {
        toast.error(error.message)
        break
      }
    }
    setCreating(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <AppHeader to="/dashboard">
        <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
        <Button variant="ghost" onClick={signOut}>Sign out</Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Your cards</h1>
          <Button onClick={createCard} disabled={creating}>
            <Plus className="size-4" />
            {creating ? 'Creating…' : 'New card'}
          </Button>
        </div>

        {cards === null && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {cards?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">
                No cards yet — create your first one. It's free to design.
              </p>
              <Button onClick={createCard} disabled={creating}>
                <Plus className="size-4" /> Create a card
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {cards?.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-semibold">
                    {c.full_name || c.company || 'Untitled card'}
                  </span>
                  <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                    {c.status === 'paid' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {c.status === 'paid' && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/c/${c.slug}`} target="_blank">
                        <ExternalLink className="size-4" /> View
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/editor/${c.id}`}>
                      <Pencil className="size-4" /> Edit
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
