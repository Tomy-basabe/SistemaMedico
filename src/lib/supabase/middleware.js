import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas públicas
  if (pathname === '/login' || pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (profile) {
        const redirectUrl = profile.rol === 'admin'
          ? '/admin'
          : profile.rol === 'medico'
          ? '/medico'
          : '/secretaria';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return supabaseResponse;
  }

  // Rutas protegidas: requieren autenticación
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // RBAC: Verificar rol vs ruta
  if (pathname.startsWith('/secretaria') || pathname.startsWith('/medico') || pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Admin tiene acceso a TODO
    if (profile.rol === 'admin') {
      return supabaseResponse;
    }

    // Otros roles solo a su sección
    const requiredRole = pathname.startsWith('/secretaria')
      ? 'secretaria'
      : pathname.startsWith('/medico')
      ? 'medico'
      : 'admin';

    if (profile.rol !== requiredRole) {
      const redirectUrl = profile.rol === 'medico' ? '/medico' : '/secretaria';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return supabaseResponse;
}
