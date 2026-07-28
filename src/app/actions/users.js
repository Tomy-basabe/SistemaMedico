'use server';

import { createClient } from '@supabase/supabase-js';

// Usamos el cliente de Supabase estándar (no SSR) con la Service Role Key 
// para saltarnos el RLS y no modificar la sesión actual del usuario (cookies).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createUserServer(data) {
  if (!supabaseServiceKey) {
    return { success: false, error: 'Falta configurar la variable SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel).' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Crear el usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nombre: data.nombre,
        apellido: data.apellido,
        rol: data.rol,
        especialidad: data.rol === 'medico' ? data.especialidad : null,
        matricula: data.rol === 'medico' ? data.matricula : null,
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('El correo ya está registrado en el sistema.');
      }
      throw authError;
    }

    const userId = authData.user.id;

    // 2. Darle un momento al trigger de base de datos para crear el perfil
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Actualizar el perfil público con el rol correcto
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nombre: data.nombre,
        apellido: data.apellido,
        rol: data.rol,
        especialidad: data.rol === 'medico' ? data.especialidad : null,
        matricula: data.rol === 'medico' ? data.matricula : null,
      })
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Error en createUserServer:', error);
    return { success: false, error: error.message };
  }
}
