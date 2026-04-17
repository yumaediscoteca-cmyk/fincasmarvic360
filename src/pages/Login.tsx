import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlobalThemeToggle from '@/components/GlobalThemeToggle';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error inesperado al iniciar sesión');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalThemeToggle />
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
        {/* Logo Marvic */}
        <div className="mb-8 text-center">
          <img
            src="/MARVIC_logo.png"
            alt="Agrícola Marvic"
            className="mx-auto h-20 w-auto object-contain"
          />
          <h1 className="mt-4 text-3xl font-bold text-foreground tracking-wide">AGRÍCOLA MARVIC 360</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sistema de gestión agrícola integral</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Correo electrónico
            </label>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contraseña
            </label>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/40 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Botón login */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-primary mt-6 py-2"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Agrícola Marvic 360 — Gestión agrícola integrada
        </p>
      </div>
    </div>
    </>
  );
};

export default Login;
