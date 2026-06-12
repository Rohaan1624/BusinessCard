import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}
