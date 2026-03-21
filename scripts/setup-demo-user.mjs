#!/usr/bin/env node

/**
 * Script para crear un usuario demo en Supabase para testing del sistema de autenticación
 * 
 * Uso: node scripts/setup-demo-user.mjs
 * 
 * Requiere variables de entorno:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (para operaciones admin)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Error: Faltan variables de entorno:\n' +
    '   - NEXT_PUBLIC_SUPABASE_URL\n' +
    '   - SUPABASE_SERVICE_ROLE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const demoUsers = [
  {
    email: 'admin@ejemplo.com',
    password: 'Admin@2024!Seguro',
    displayName: 'Administrador Sistema',
  },
  {
    email: 'consejero@ejemplo.com',
    password: 'Consejero@2024!Seguro',
    displayName: 'Consejero Demo',
  },
]

async function setupDemoUsers() {
  console.log('🔐 Iniciando setup de usuarios demo...\n')

  for (const user of demoUsers) {
    try {
      console.log(`📧 Creando usuario: ${user.email}`)

      // Crear usuario con email y contraseña
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          display_name: user.displayName,
        },
      })

      if (error) {
        // Si el usuario ya existe, es ok
        if (error.message.includes('already exists')) {
          console.log(`   ✅ El usuario ya existe`)
        } else {
          console.error(`   ❌ Error: ${error.message}`)
          continue
        }
      } else {
        console.log(`   ✅ Usuario creado: ${data.user?.id}`)
      }

      console.log(`   📝 Email: ${user.email}`)
      console.log(`   🔑 Contraseña: ${user.password}\n`)
    } catch (error) {
      console.error(`   ❌ Error al crear usuario: ${error.message}\n`)
    }
  }

  console.log('✅ Setup de usuarios demo completado')
  console.log(
    '\n💡 Próximos pasos:\n' +
    '   1. Inicia la aplicación: npm run dev\n' +
    '   2. Ve a http://localhost:3000/login\n' +
    '   3. Usa las credenciales arriba\n' +
    '   4. ¡El sistema debería protegerse automáticamente!'
  )
}

setupDemoUsers().catch((error) => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
