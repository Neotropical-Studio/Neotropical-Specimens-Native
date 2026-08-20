import os
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

# Limpiamos todo para empezar de cero sin basura
supabase.table('specimens').delete().neq('familia', 'INEXISTENTE').execute()

registros = [
    {'familia': 'Scorpion', 'genero': 'Scorpion', 'species_name': 'Scorpion sp.', 'localidad': 'Colección General', 'specimen_code': 'SCORP-001', 'stock': 1},
    {'familia': 'Spirostreptida', 'genero': 'Archispirostreptus', 'species_name': 'Archispirostreptus gigas', 'localidad': 'Colección General', 'specimen_code': 'SPIRO-001', 'stock': 1},
    {'familia': 'Scolopendromorpha', 'genero': 'Scolopendra', 'species_name': 'Scolopendra gigantea', 'localidad': 'Colección General', 'specimen_code': 'SCOLO-001', 'stock': 1}
]

for reg in registros:
    supabase.table('specimens').insert(reg).execute()
    print(f"✓ {reg['species_name']} subido dinámicamente.")
