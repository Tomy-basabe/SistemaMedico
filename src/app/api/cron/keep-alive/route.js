import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Variables de entorno no configuradas' }, { status: 500 });
    }

    // Hacemos una consulta rápida y ligera a la tabla perfiles solo para registrar actividad en la base de datos
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) {
      throw new Error('Error en la respuesta de Supabase');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ping exitoso. El proyecto de Supabase se mantiene activo.' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
