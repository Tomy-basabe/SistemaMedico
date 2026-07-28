const { createClient } = require('@supabase/supabase-js');
// Removed dotenv

// We need the service role key to bypass RLS and create users directly
// We can use the one from seed.js if it's not in .env.local
const supabaseUrl = 'https://cvevqbnrhfreygjdyswa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = 'stackhard@stackhard.com';
  const password = 'SuperAdmin123!';

  console.log(`Creando SuperAdmin: ${email}...`);

  // Crear usuario en Auth
  const { data: userRecord, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;
  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('El usuario ya existe en Auth, obteniendo ID...');
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      }
    } else {
      console.error('Error creando usuario en Auth:', authError);
      return;
    }
  } else {
    userId = userRecord.user.id;
  }

  // Esperar un poco a que el trigger de Supabase cree el registro en public.profiles
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Actualizar rol a superadmin en profiles
  console.log(`Actualizando perfil (ID: ${userId}) a rol: superadmin...`);
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      rol: 'superadmin',
      nombre: 'Super',
      apellido: 'Administrador'
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error actualizando el perfil:', profileError);
  } else {
    console.log('✅ SuperAdmin creado y configurado exitosamente.');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

main().catch(console.error);
