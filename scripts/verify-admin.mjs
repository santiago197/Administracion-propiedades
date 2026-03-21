#!/usr/bin/env node

/**
 * Script para verificar el estado de los usuarios administrativos y su vinculación con conjuntos
 *
 * Uso: node scripts/verify-admin.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifyAdmin() {
  console.log('🔍 Verificando configuración administrativa...\n')

  // 1. Verificar si existe el conjunto "Barlovento Reservado CR"
  const { data: conjuntos, error: conjError } = await supabase
    .from('conjuntos')
    .select('*')
    .ilike('nombre', '%Barlovento Reservado%')

  if (conjError) {
    console.error(`❌ Error al buscar conjunto: ${conjError.message}`)
  } else if (!conjuntos || conjuntos.length === 0) {
    console.warn('⚠️ No se encontró el conjunto "Barlovento Reservado CR"')
  } else {
    console.log(`✅ Conjunto encontrado: "${conjuntos[0].nombre}" (ID: ${conjuntos[0].id})`)
  }

  // 2. Verificar usuario admin en auth.users
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.error(`❌ Error al listar usuarios: ${userError.message}`)
    return
  }

  const adminUser = users.users.find(u => u.email === 'admin@ejemplo.com')

  if (!adminUser) {
    console.error('❌ Usuario "admin@ejemplo.com" NO existe en auth.users')
  } else {
    console.log(`✅ Usuario "admin@ejemplo.com" existe (ID: ${adminUser.id})`)

    // 3. Verificar perfil en public.profiles
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single()

    if (profError) {
      console.error(`❌ Error al buscar perfil: ${profError.message}`)

      // Intentar crear el perfil si no existe
      console.log('🛠️ Intentando crear perfil para el admin...')
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminUser.email,
          nombre_completo: 'Administrador Sistema',
          rol: 'admin',
          conjunto_id: conjuntos?.[0]?.id || null
        })

      if (insertError) {
        console.error(`❌ No se pudo crear el perfil: ${insertError.message}`)
      } else {
        console.log('✅ Perfil creado exitosamente')
      }
    } else {
      console.log(`✅ Perfil encontrado. Rol: ${profile.rol}, Conjunto ID: ${profile.conjunto_id || 'Ninguno'}`)

      // Si el perfil existe pero no tiene el conjunto_id correcto, actualizarlo
      if (conjuntos?.[0] && profile.conjunto_id !== conjuntos[0].id) {
        console.log(`🛠️ Actualizando conjunto_id en el perfil a ${conjuntos[0].id}...`)
        const { error: updError } = await supabase
          .from('profiles')
          .update({ conjunto_id: conjuntos[0].id })
          .eq('id', adminUser.id)

        if (updError) {
          console.error(`❌ Error al actualizar perfil: ${updError.message}`)
        } else {
          console.log('✅ Perfil actualizado exitosamente')
        }
      }
    }
  }

  console.log('\n🏁 Verificación completada.')
}

verifyAdmin().catch(console.error)
