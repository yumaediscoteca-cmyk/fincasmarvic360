import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { esRolEncargado } from '@/types/roles'

/** Tras login, los roles de campo van directo al parte encargado si entran en home. */
export default function EncargadoPostLoginRedirect() {
  const { user, rol, loading } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()

  useEffect(() => {
    if (loading || !user || !rol) return
    const path = loc.pathname
    if (esRolEncargado(rol) && (path === '/' || path === '/dashboard')) {
      nav('/parte-encargado', { replace: true })
    }
  }, [loading, user, rol, loc.pathname, nav])

  return null
}
