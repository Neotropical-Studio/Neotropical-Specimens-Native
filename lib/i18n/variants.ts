// ============================================================================
// Equivalencia ESTRICTA de variantes de idioma.
//
// El problema que resuelve: la coincidencia laxa por subetiqueta primaria ("si
// no hay zh-HK, usa cualquier zh") sirve chino simplificado de RPC a un
// visitante de Hong Kong. El texto se "entiende", pero es la localización
// equivocada: glifos, vocabulario y convenciones de mercado son distintos.
//
// Reglas:
//   · Los clústeres Han simplificado y tradicional NUNCA se cruzan.
//   · Dentro del tradicional sí hay fallback (zh-HK → zh-MO → zh-TW): son
//     variantes de mercado del mismo sistema de escritura.
//   · 'zh' a secas se trata como simplificado (uso convencional de facto).
//   · El resto de idiomas mantiene el fallback laxo habitual (es-PE → es), que
//     ahí sí es correcto.
//
// Sin dependencias ni 'server-only': lo usan la capa de cadenas, la de locales,
// el traductor automático y el middleware.
// ============================================================================

// Chino tradicional: Taiwán, Hong Kong y Macao (variantes de mercado).
const ZH_HANT = ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant'];
// Chino simplificado: RPC y Singapur.
const ZH_HANS = ['zh-CN', 'zh-SG', 'zh-Hans', 'zh'];

const lower = (l: string) => l.trim().toLowerCase();
export const primaryOf = (l: string) => lower(l).split('-')[0];

// Idiomas cuyas variantes NO son intercambiables: exigen coincidencia dentro de
// su clúster de escritura y nunca caen al idioma "genérico".
export function isStrictVariant(locale: string): boolean {
  return primaryOf(locale) === 'zh';
}

// ¿Es una variante de chino tradicional?
export function isTraditionalChinese(locale: string): boolean {
  const l = lower(locale);
  return ZH_HANT.some((v) => lower(v) === l) || l.includes('hant');
}

// Candidatos ordenados (de más a menos específico) para resolver un valor
// autorizado en `locale`. El primer elemento es siempre el propio locale.
export function candidatesFor(locale: string): string[] {
  const l = lower(locale);
  const out: string[] = [];
  const push = (tag: string) => {
    const t = lower(tag);
    if (!out.includes(t)) out.push(t);
  };

  push(l);

  if (primaryOf(l) === 'zh') {
    // Sólo variantes del MISMO sistema de escritura, la propia primero.
    const cluster = isTraditionalChinese(l) ? ZH_HANT : ZH_HANS;
    for (const tag of cluster) push(tag);
    return out;
  }

  // Resto: la subetiqueta primaria es un fallback aceptable (es-PE → es).
  push(primaryOf(l));
  return out;
}

// ¿`candidate` sirve para un visitante que pide `wanted`? Respeta la barrera
// simplificado/tradicional en chino y acepta primaria↔región en los demás.
export function isCompatible(wanted: string, candidate: string): boolean {
  const w = lower(wanted);
  const c = lower(candidate);
  if (w === c) return true;

  if (primaryOf(w) === 'zh' || primaryOf(c) === 'zh') {
    // Ambos deben ser chino y del mismo clúster de escritura.
    if (primaryOf(w) !== 'zh' || primaryOf(c) !== 'zh') return false;
    return isTraditionalChinese(w) === isTraditionalChinese(c);
  }

  return primaryOf(w) === primaryOf(c);
}

// --- Códigos de destino para traducción automática ---------------------------
// Los proveedores no comparten nomenclatura y varios sólo entienden 'ZH', que
// devuelve simplificado: mandarlo para zh-TW/zh-HK/zh-MO produce exactamente la
// traducción incorrecta que queremos evitar.
export function mtTargetFor(locale: string, provider: string): string {
  const l = lower(locale);
  const traditional = isTraditionalChinese(l);

  if (primaryOf(l) === 'zh') {
    if (provider === 'deepl') return traditional ? 'ZH-HANT' : 'ZH-HANS';
    // Google/LibreTranslate: zh-TW es su código de tradicional (no existe
    // zh-HK/zh-MO como destino propio; tradicional es lo correcto para ambos).
    return traditional ? 'zh-TW' : 'zh-CN';
  }

  // ja y ko no tienen variantes en juego: la subetiqueta primaria es exacta.
  // DeepL espera el código en mayúsculas ('JA', 'KO').
  return provider === 'deepl' ? primaryOf(l).toUpperCase() : primaryOf(l);
}
