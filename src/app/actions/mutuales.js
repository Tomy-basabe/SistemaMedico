'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function toggleMutualServer(medicoId, obraSocialId, actualmenteAceptada) {
  if (!supabaseServiceKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    if (actualmenteAceptada) {
      const { error } = await supabase
        .from('medico_obras_sociales')
        .delete()
        .match({ medico_id: medicoId, obra_social_id: obraSocialId });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('medico_obras_sociales')
        .insert({ medico_id: medicoId, obra_social_id: obraSocialId });
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
