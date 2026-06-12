import { createContext, useContext } from 'react'

export const AuthContext = createContext({ session: null, user: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}
