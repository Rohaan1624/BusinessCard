import { createClient, type User } from 'npm:@supabase/supabase-js@2'

// Privileged client — bypasses RLS. Only edge functions hold this key.
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

// Resolves the calling user from the request's JWT.
export async function getUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )
  const { data, error } = await client.auth.getUser()
  if (error) return null
  return data.user
}
