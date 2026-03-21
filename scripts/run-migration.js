import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[v0] Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', '001_create_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Dividir en statements individuales
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`[v0] Ejecutando ${statements.length} statements SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[v0] Ejecutando statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`[v0] Error en statement ${i + 1}:`, error);
      } else {
        console.log(`[v0] ✓ Statement ${i + 1} completado`);
      }
    }
    
    console.log('[v0] Migración completada exitosamente');
  } catch (error) {
    console.error('[v0] Error durante migración:', error);
    process.exit(1);
  }
}

runMigration();
