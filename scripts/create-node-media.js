const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnectionAndInsert() {
  console.log('🔄 Verificando conexión a Supabase y estado de la tabla node_media...');
  
  // Intenta hacer una consulta a la tabla node_media
  const { data, error } = await supabase.from('node_media').select('id').limit(1);

  if (error) {
    if (error.code === '42P01' || /relation .*node_media.* does not exist/i.test(error.message)) {
      console.log('⚠️ La tabla "node_media" aún no existe en Supabase.');
      console.log('👉 Ejecuta el siguiente bloque SQL en el SQL Editor de la consola de Supabase:\n');
      console.log(`
CREATE TABLE IF NOT EXISTS public.node_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node_key TEXT UNIQUE NOT NULL,
    card_url TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.node_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read/write access to node_media" ON public.node_media FOR ALL USING (true);
      `);
    } else {
      console.error('❌ Error devuelto por Supabase:', error.message);
    }
  } else {
    console.log('✅ ¡La tabla "node_media" ya está creada y operativa en Supabase!');
  }
}

testConnectionAndInsert();
