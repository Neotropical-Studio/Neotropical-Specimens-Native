const fs = require('fs');
const filePath = 'components/admin/IndustrialMasterSystemV3.tsx';

if (!fs.existsSync(filePath)) {
  console.error('❌ No se encontró el archivo:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la línea de parseo frágil por un parseo protegido con validación HTTP
const targetPattern = /json\s*=\s*text\s*\?\s*\(JSON\.parse\(text\)\s*as\s*typeof\s*json\)\s*:\s*\{\};/;

if (targetPattern.test(content)) {
  const replacement = `if (!res.ok) {
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        throw new Error(\`Error (\${res.status}): \${cleanText.slice(0, 150) || 'Error interno del servidor'}\`);
      }
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('El servidor devolvió una respuesta no válida (HTML/Texto plano en lugar de JSON).');
      }`;
  content = content.replace(targetPattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Archivo corregido exitosamente. Ahora capturará el error real sin romper con JSON.parse.');
} else {
  console.log('ℹ️ La línea exacta ya fue modificada o tiene una estructura distinta.');
}
