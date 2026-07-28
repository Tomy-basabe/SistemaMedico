'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createEspecialidadServer(data) {
  if (!supabaseServiceKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { error } = await supabase.from('especialidades').insert([{ nombre: data.nombre, activa: data.activa, domain: data.domain }]);
    if (error) {
      // Si el UNIQUE es por (nombre, domain), 23505 aplica. Si es global, igual tirará error.
      if (error.code === '23505') throw new Error('Ya existe una especialidad con este nombre');
      throw error;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function toggleEspecialidadServer(id, activa) {
  if (!supabaseServiceKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { error } = await supabase.from('especialidades').update({ activa }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
