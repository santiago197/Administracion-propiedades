import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testAccessControl() {
  console.log('🧪 Iniciando pruebas de control de acceso multi-tenant...\n')

  // 1. Obtener un usuario de prueba (ej. demo@demo.com)
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.error('❌ Error al listar usuarios:', usersError.message)
    return
  }

  const testUser = users.find(u => u.email === 'demo@demo.com')
  if (!testUser) {
    console.warn('⚠️ Usuario demo@demo.com no encontrado. Asegúrate de correr setup-demo-user.mjs primero.')
    return
  }

  console.log(`👤 Usuario de prueba: ${testUser.email} (ID: ${testUser.id})`)

  // 2. Verificar estado en tabla usuarios
  const { data: dbUser, error: dbError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', testUser.id)
    .single()

  if (dbError) {
    console.error('❌ Error al obtener usuario de la DB:', dbError.message)
  } else {
    console.log(`✅ Registro en DB: Activo=${dbUser.activo}, Conjunto=${dbUser.conjunto_id || 'Ninguno'}`)

    if (!dbUser.activo) {
      console.log('ℹ️ El usuario está inactivo, el middleware debería bloquearlo.')
    }

    if (!dbUser.conjunto_id) {
      console.log('ℹ️ El usuario no tiene conjunto, el acceso a /admin debería estar restringido.')
    }
  }

  console.log('\n🏁 Pruebas de acceso completadas.')
}

testAccessControl().catch(console.error)
