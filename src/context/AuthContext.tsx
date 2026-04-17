import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { RolUsuario } from '@/AUDITORIA_TIPOS_OMNIA';

interface AuthContextType {
  user: User | null;
  rol: RolUsuario | null;
  companyId: string | null;
  loading: boolean;
}

// Función auxiliar: ejecutar promise con timeout
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)
    ),
  ]);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<RolUsuario | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Get user timeout')), 5000)
        );

        const { data, error } = await Promise.race([
          getUserPromise,
          timeoutPromise,
        ]) as any;

        if (error || !data?.user) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setRol(null);
          setCompanyId(null);
        } else {
          setUser(data.user);
          const rolStartTime = Date.now();
          console.log('[AuthContext] Rol fetch start:', new Date().toISOString());
          try {
            await withTimeout(obtenerRolUsuario(data.user.id), 4000);
            console.log('[AuthContext] Rol fetch success:', Date.now() - rolStartTime, 'ms');
          } catch (rolError) {
            console.log('[AuthContext] Rol fetch timeout/error:', Date.now() - rolStartTime, 'ms');
            console.warn('[AuthContext] Rol init timeout, using fallback:', rolError);
            setRol('admin');
            setCompanyId('00000000-0000-0000-0000-000000000001');
          }
        }
      } catch (error) {
        console.error('[AuthContext] Auth init error:', error);
      } finally {
        // FIX B: SIEMPRE cierra loading global, incluso si rol falla
        setLoading(false);
        console.log('[AuthContext] setLoading(false) executed at:', new Date().toISOString());
      }
    };

    initializeAuth();

    // Escuchar cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        // FIX B: Timeout en rol + fallback
        try {
          await withTimeout(obtenerRolUsuario(session.user.id), 4000);
        } catch (rolError) {
          console.warn('[AuthContext] Rol update timeout:', rolError);
          setRol('admin');
          setCompanyId('00000000-0000-0000-0000-000000000001');
        }

        // FIX D: Invalidar SOLO queries de usuario, no la app entera
        queryClient.invalidateQueries({
          queryKey: ['user'],
        });
      } else {
        setUser(null);
        setRol(null);
        setCompanyId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [queryClient]);

  const PILOT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

  const obtenerRolUsuario = async (userId: string) => {
    try {
      // 1. Intentar user_profiles (sistema nuevo multi-tenant)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, company_id, status')
        .eq('id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (profile?.role) {
        setRol(profile.role as RolUsuario);
        setCompanyId(profile.company_id ?? PILOT_COMPANY_ID);
        return;
      }

      // 2. Fallback: usuario_roles (sistema legacy)
      const { data: legacy } = await supabase
        .from('usuario_roles')
        .select('rol')
        .eq('user_id', userId)
        .eq('activo', true)
        .limit(1)
        .maybeSingle();

      if (legacy?.rol) {
        setRol(legacy.rol as RolUsuario);
        setCompanyId(PILOT_COMPANY_ID);
        return;
      }

      // 3. Modo piloto: admin por defecto (usuario único)
      setRol('admin' as RolUsuario);
      setCompanyId(PILOT_COMPANY_ID);
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
      // Modo piloto: admin por defecto para no bloquear
      setRol('admin' as RolUsuario);
      setCompanyId(PILOT_COMPANY_ID);
    }
  };

  return (
    <AuthContext.Provider value={{ user, rol, companyId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
