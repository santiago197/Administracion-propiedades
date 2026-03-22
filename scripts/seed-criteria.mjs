/**
 * Script para sembrar los criterios de evaluación por defecto según el flujo de negocio.
 * Criterios: Legal 25%, Técnico 30%, Financiero 20%, Referencias 15%, Propuesta 10%.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const defaultCriteria = [
  { nombre: 'Evaluación Legal', peso: 25, tipo: 'escala', orden: 1, descripcion: 'Verificación de SARLAFT, antecedentes y pólizas.' },
  { nombre: 'Evaluación Técnica', peso: 30, tipo: 'escala', orden: 2, descripcion: 'Experiencia y capacidad técnica.' },
  { nombre: 'Evaluación Financiera', peso: 20, tipo: 'escala', orden: 3, descripcion: 'Estados financieros y solvencia.' },
  { nombre: 'Verificación de Referencias', peso: 15, tipo: 'escala', orden: 4, descripcion: 'Validación de referencias comerciales y personales.' },
  { nombre: 'Propuesta Económica', peso: 10, tipo: 'escala', orden: 5, descripcion: 'Valor de honorarios y beneficios adicionales.' }
]

async function seedDefaultCriteria(procesoId) {
  console.log(`🌱 Sembrando criterios por defecto para el proceso: ${procesoId}`)

  const criteriaToInsert = defaultCriteria.map(c => ({
    ...c,
    proceso_id: procesoId,
    activo: true,
    valor_minimo: 1,
    valor_maximo: 5
  }))

  const { data, error } = await supabase
    .from('criterios')
    .insert(criteriaToInsert)
    .select()

  if (error) {
    console.error('❌ Error al insertar criterios:', error.message)
    return
  }

  console.log(`✅ ${data.length} criterios insertados exitosamente.`)
}

// Para usar desde la línea de comandos: node scripts/seed-criteria.mjs <proceso_id>
const args = process.argv.slice(2)
if (args.length > 0) {
  seedDefaultCriteria(args[0]).catch(console.error)
} else {
  console.log('💡 Uso: node scripts/seed-criteria.mjs <proceso_id>')
}
