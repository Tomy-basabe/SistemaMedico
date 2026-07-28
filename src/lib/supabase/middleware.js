import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
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
    data: { session },
  } = await supabase.auth.getSession();
  
  const user = session?.user;
  const pathname = request.nextUrl.pathname;

  // Rutas públicas
  if (pathname === '/login' || pathname === '/') {
    if (user) {
      // Intentar leer el rol de los metadatos para evitar query a BD
      let role = user.user_metadata?.rol;
      
      if (!role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('rol')
          .eq('id', user.id)
          .single();
        role = profile?.rol;
      }

      if (role) {
        const redirectUrl = role === 'superadmin' 
          ? '/superadmin' 
          : role === 'admin'
          ? '/admin'
          : role === 'medico'
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
  if (pathname.startsWith('/secretaria') || pathname.startsWith('/medico') || pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
    
    let role = user.user_metadata?.rol;
      
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single();
      role = profile?.rol;
    }

    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Superadmin tiene acceso a /superadmin y potencialmente a otras rutas si se requiere, pero por ahora su sección es /superadmin
    if (role === 'superadmin') {
      if (!pathname.startsWith('/superadmin')) {
        return NextResponse.redirect(new URL('/superadmin', request.url));
      }
      return supabaseResponse;
    }

    // Admin tiene acceso a TODO excepto superadmin
    if (role === 'admin') {
      if (pathname.startsWith('/superadmin')) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return supabaseResponse;
    }

    // Otros roles solo a su sección
    const requiredRole = pathname.startsWith('/secretaria')
      ? 'secretaria'
      : pathname.startsWith('/medico')
      ? 'medico'
      : 'admin';

    if (role !== requiredRole) {
      const redirectUrl = role === 'medico' ? '/medico' : (role === 'secretaria' ? '/secretaria' : '/admin');
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return supabaseResponse;
}
