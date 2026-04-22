import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { RolUsuario } from '@/types/roles';

interface AuthContextType {
  user: User | null;
  rol: RolUsuario | null;
  companyId: string | null;
  fincas_permitidas: string[] | null;
  rol_encargado: string | null;
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
  const [fincas_permitidas, setFincasPermitidas] = useState<string[] | null>(null);
  const [rol_encargado, setRolEncargado] = useState<string | null>(null);
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
          setFincasPermitidas(null);
          setRolEncargado(null);
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
            setFincasPermitidas(null);
            setRolEncargado(null);
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
          setFincasPermitidas(null);
          setRolEncargado(null);
        }

        // FIX D: Invalidar SOLO queries de usuario, no la app entera
        queryClient.invalidateQueries({
          queryKey: ['user'],
        });
      } else {
        setUser(null);
        setRol(null);
        setCompanyId(null);
        setFincasPermitidas(null);
        setRolEncargado(null);
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
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, fincas_permitidas, rol_encargado, company_id, status')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error al leer user_profiles:', profileError);
        setRol('solo_lectura');
        setCompanyId(PILOT_COMPANY_ID);
        setFincasPermitidas(null);
        setRolEncargado(null);
        return;
      }

      if (!profile || profile.status !== 'active') {
        setRol('solo_lectura');
        setCompanyId(profile?.company_id ?? PILOT_COMPANY_ID);
        setFincasPermitidas(profile?.fincas_permitidas ?? null);
        setRolEncargado(profile?.rol_encargado ?? null);
        return;
      }

      const roleValue = (profile.role ?? 'solo_lectura') as RolUsuario;
      setRol(roleValue);
      setCompanyId(profile.company_id ?? PILOT_COMPANY_ID);
      setFincasPermitidas(profile.fincas_permitidas ?? null);
      setRolEncargado(profile.rol_encargado ?? null);
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
      setRol('solo_lectura');
      setCompanyId(PILOT_COMPANY_ID);
      setFincasPermitidas(null);
      setRolEncargado(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, rol, companyId, fincas_permitidas, rol_encargado, loading }}
    >
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
