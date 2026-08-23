'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Save } from 'lucide-react';
import FormField, { inputClass, buttonPrimaryClass, buttonSecondaryClass } from '@/components/admin/FormField';
import TaxonAutocomplete, { type TaxonPick } from './TaxonAutocomplete';
import MediaSlot from '../multimedia/MediaSlot';
import { GRADE_OPTIONS } from '@/lib/constants/grades';
import { SEX_OPTIONS } from '@/lib/constants/sex';
import { CATALOGUE_CATEGORIES, findCategoryBySlugOrLabel } from '@/lib/specimens/catalogueNav';
import { STOREFRONT_RUBROS } from '@/lib/specimens/rubros';
import { DRIED_SPECIMEN_REGION_FOLDERS } from '@/scripts/sync-cloudinary/roots';
import {
  createSpecimenAction,
  updateSpecimenAction,
  generateSpecimenCodeAction,
  type SpecimenFormState,
} from './actions';

interface Option {
  id: string;
  name: string;
  slug?: string;
  region_name?: string | null;
}

export interface SpecimenMediaSlot {
  view?: string | null;
  media_type?: string | null;
  public_id?: string | null;
  media_url?: string | null;
  display_order?: number | null;
}

interface SpecimenInitial {
  id: string;
  specimen_code: string;
  category_id?: string | null;
  categoria?: string | null;
  /** Carpeta REGION plana (specimens.region). */
  regionFlat?: string | null;
  rubro?: string | null;
  species_name?: string | null;
  subespecie?: string | null;
  orden?: string | null;
  color_dominante?: string | null;
  localidad?: string | null;
  gps?: string | null;
  dimensiones?: string | null;
  peso_gramos?: number | null;
  cloudinary_public_id?: string | null;
  media_url?: string | null;
  global_regions: { id: string; region_name?: string | null; name?: string | null } | null;
  taxonomy: { id: string; category_id: string | null; rank_hierarchy: Record<string, string> } | null;
  pricing: Record<string, unknown> | null;
  stock: number;
  attributes: Record<string, unknown> | null;
  media?: SpecimenMediaSlot[];
}

interface Props {
  categories: Option[];
  regions: Option[];
  specimen?: SpecimenInitial;
}

const initialState: SpecimenFormState = {};

function mediaRef(m?: SpecimenMediaSlot | null): string | undefined {
  if (!m) return undefined;
  return m.public_id ?? m.media_url ?? undefined;
}

function findMedia(
  media: SpecimenMediaSlot[],
  opts: { view?: string; type?: string; order?: number },
): SpecimenMediaSlot | undefined {
  if (opts.view) {
    const byView = media.find((m) => (m.view ?? '').toLowerCase() === opts.view);
    if (byView) return byView;
  }
  if (opts.type) {
    const byType = media.find((m) => {
      const t = (m.media_type ?? '').toLowerCase();
      if (opts.type === 'image') return t === 'image' || t === 'photo_webp';
      if (opts.type === 'video') return t === 'video' || t === 'video_mp4';
      if (opts.type === 'model') return t === 'model' || t === 'model_3d_glb';
      return t === opts.type;
    });
    if (byType && opts.order == null) return byType;
  }
  if (opts.order != null) {
    const images = media
      .filter((m) => {
        const t = (m.media_type ?? '').toLowerCase();
        return t === 'image' || t === 'photo_webp' || !m.media_type;
      })
      .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
    return images[opts.order];
  }
  return undefined;
}

function kindFromRubro(rubro: string | null | undefined): 'dried_specimen' | 'zoology_skeleton' | 'plant' {
  const r = (rubro ?? '').toUpperCase();
  if (r.includes('ZOO') || r.includes('ESQUELET')) return 'zoology_skeleton';
  if (r.includes('PLANT')) return 'plant';
  return 'dried_specimen';
}

function defaultGeoFolder(regionFlat: string | null | undefined): string {
  if (!regionFlat) return DRIED_SPECIMEN_REGION_FOLDERS.find((r) => r.id === 'neotropical')!.folder;
  const hit = DRIED_SPECIMEN_REGION_FOLDERS.find(
    (r) =>
      r.folder === regionFlat ||
      r.id === regionFlat ||
      (r.aliases as readonly string[]).some((a) => a === regionFlat),
  );
  return hit?.folder ?? regionFlat;
}

export default function SpecimenForm({ categories, regions, specimen }: Props) {
  const isEdit = Boolean(specimen);
  const action = isEdit
    ? updateSpecimenAction.bind(null, specimen!.id)
    : createSpecimenAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('grabado') !== '1') return;
    setJustSaved(true);
    sp.delete('grabado');
    const q = sp.toString();
    router.replace(`${window.location.pathname}${q ? `?${q}` : ''}`, { scroll: false });
  }, [router]);

  const getRegionValue = (region?: Option | null) => region?.region_name ?? region?.name ?? '';
  const defaultRegionCode =
    specimen?.global_regions?.region_name ??
    specimen?.global_regions?.name ??
    regions.find((r) => getRegionValue(r) === 'NEO')?.region_name ??
    regions.find((r) => getRegionValue(r) === 'NEO')?.name ??
    regions[0]?.region_name ??
    regions[0]?.name ??
    '';
  const regionIdForGeo = (geo: string) => {
    const normalized = geo.trim().toLowerCase();
    const code = normalized.includes('africa') ? 'afr'
      : normalized.includes('austral') ? 'aus'
        : normalized.includes('europe') ? 'eur'
          : normalized.includes('nearctic') ? 'na'
            : normalized.includes('neo') || normalized.includes('south') ? 'neo-sa'
              : '';
    return regions.find((region) => getRegionValue(region).trim().toLowerCase() === code)?.id ?? '';
  };
  const categoryIdForLabel = (label: string) => {
    const normalized = label.trim().toLowerCase();
    return categories.find((category) => category.name.trim().toLowerCase() === normalized)?.id ?? '';
  };
  const [regionCode, setRegionCode] = useState(defaultRegionCode);
  const [regionId, setRegionId] = useState(
    specimen?.global_regions?.id ?? regionIdForGeo(defaultGeoFolder(specimen?.regionFlat ?? null)),
  );
  const [specimenCode, setSpecimenCode] = useState(specimen?.specimen_code ?? '');
  const [isGenerating, startGenerating] = useTransition();

  const attrs = specimen?.attributes ?? {};
  const pricing = specimen?.pricing ?? {};
  const initialKind =
    (attrs.specimen_kind as string) ||
    kindFromRubro(specimen?.rubro) ||
    'dried_specimen';
  const [specimenKind, setSpecimenKind] = useState(initialKind);

  const [geoRegionFolder, setGeoRegionFolder] = useState(
    defaultGeoFolder(specimen?.regionFlat ?? null),
  );

  const initialCat =
    findCategoryBySlugOrLabel(specimen?.categoria ?? '')?.segment ??
    specimen?.categoria ??
    CATALOGUE_CATEGORIES.find((c) => c.id === 'butterflies-lepidoptera-diurne')?.segment ??
    '';
  const [catalogueCategoria, setCatalogueCategoria] = useState(initialCat);
  const [categoryId, setCategoryId] = useState(
    specimen?.category_id ?? categoryIdForLabel(initialCat),
  );

  const rh = specimen?.taxonomy?.rank_hierarchy ?? {};
  const [orden, setOrden] = useState(specimen?.orden ?? rh.order ?? '');
  const [familia, setFamilia] = useState<TaxonPick>({ value: rh.family ?? '' });
  const [subfamilia, setSubfamilia] = useState<TaxonPick>({ value: rh.subfamily ?? '' });
  const [genero, setGenero] = useState<TaxonPick>({ value: rh.genus ?? '' });
  const [especie, setEspecie] = useState<TaxonPick>({ value: rh.species ?? '' });
  const [subespecie, setSubespecie] = useState(specimen?.subespecie ?? rh.subspecies ?? '');

  const defaultScientific =
    specimen?.species_name ??
    [rh.genus, rh.species, specimen?.subespecie].filter(Boolean).join(' ') ??
    '';
  const [scientificName, setScientificName] = useState(defaultScientific);

  const media = specimen?.media ?? [];
  const coverId =
    specimen?.cloudinary_public_id ??
    specimen?.media_url ??
    mediaRef(findMedia(media, { view: 'cover' })) ??
    mediaRef(findMedia(media, { view: 'principal' }));
  const dorsalId =
    mediaRef(findMedia(media, { view: 'dorsal' })) ?? mediaRef(findMedia(media, { order: 0 }));
  const ventralId =
    mediaRef(findMedia(media, { view: 'ventral' })) ?? mediaRef(findMedia(media, { order: 1 }));
  const modelId = mediaRef(findMedia(media, { type: 'model' }));
  const videoId = mediaRef(findMedia(media, { type: 'video' }));

  const kind =
    specimenKind === 'zoology_skeleton'
      ? 'zoology_skeleton'
      : specimenKind === 'plant'
        ? 'plant'
        : 'dried_specimen';

  const hierarchyHint = useMemo(() => {
    const rubroLabel =
      STOREFRONT_RUBROS.find((r) =>
        kind === 'zoology_skeleton'
          ? r.id === 'zoology-skeletons'
          : kind === 'plant'
            ? r.id === 'dry-plants-no-cites'
            : r.id === 'dried-specimens',
      )?.label ?? '—';
    return [rubroLabel, geoRegionFolder || '—', catalogueCategoria || '—', orden || '—', familia.value || '—']
      .join(' › ');
  }, [kind, geoRegionFolder, catalogueCategoria, orden, familia.value]);

  function syncScientificFromTaxon(next: {
    genero?: string;
    especie?: string;
    subespecie?: string;
  }) {
    const g = next.genero ?? genero.value;
    const e = next.especie ?? especie.value;
    const s = next.subespecie ?? subespecie;
    const built = [g, e, s].map((x) => x.trim()).filter(Boolean).join(' ');
    if (built) setScientificName(built);
  }

  function handleGenerateCode() {
    startGenerating(async () => {
      const code = await generateSpecimenCodeAction(regionCode);
      setSpecimenCode(code);
    });
  }

  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="relative flex max-w-3xl flex-col gap-8 pb-24">
      {justSaved && (
        <div className="rounded-md border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} /> GRABADO — especie / subespecie guardada
          </p>
          <p className="mt-1 text-xs text-emerald-300/90">
            {specimen?.species_name || scientificName || 'Ficha'} ·{' '}
            {especie.value || '—'}
            {subespecie ? ` · ssp. ${subespecie}` : ''} ·{' '}
            {new Date().toLocaleString('es-PE', { hour12: false })}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400/80">
            Ya está en la base. Revisá el website (hard refresh) si corresponde al catálogo público.
          </p>
        </div>
      )}
      {state.error && (
        <div className="rounded-md border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <p className="rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2 font-mono text-xs text-emerald-400/90">
        {hierarchyHint}
      </p>

      {/* ── 1. Información General del Producto ─────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          1 · Información General del Producto
        </legend>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <FormField
              label="ID del Producto"
              htmlFor="specimenCode"
              error={err('specimenCode')}
              hint="Ej. NEO-4421"
            >
              <input
                id="specimenCode"
                name="specimenCode"
                className={inputClass}
                value={specimenCode}
                onChange={(e) => setSpecimenCode(e.target.value)}
                placeholder="NEO-4421"
                required
              />
            </FormField>
          </div>
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className={buttonSecondaryClass}
          >
            {isGenerating ? 'Generando…' : 'Generar código'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Grado del Producto" htmlFor="gradeCode">
            <select
              id="gradeCode"
              name="gradeCode"
              className={inputClass}
              defaultValue={(attrs.grade_code as string) ?? ''}
            >
              <option value="">—</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.code} value={g.code}>
                  Grado Museo {g.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nombre Común" htmlFor="commonName">
            <input
              id="commonName"
              name="commonName"
              className={inputClass}
              defaultValue={(attrs.common_name as string) ?? ''}
              placeholder="Morfo Azul Común"
            />
          </FormField>
        </div>

        <FormField label="Nombre científico" htmlFor="scientificName" error={err('scientificName')}>
          <input
            id="scientificName"
            name="scientificName"
            className={`${inputClass} italic`}
            value={scientificName}
            onChange={(e) => setScientificName(e.target.value)}
            placeholder="Morpho menelaus"
            required
          />
        </FormField>
      </fieldset>

      {/* ── Ubicación en catálogo (rubro › región › categoría) ───────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          Ubicación en catálogo · Rubro › Región › Categoría
        </legend>
        <p className="text-xs text-neutral-500">
          Define a qué rubro, zona geográfica y categoría pertenece esta ficha (columnas planas
          rubro / region / categoria).
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Rubro" htmlFor="specimenKind" error={err('specimenKind')}>
            <select
              id="specimenKind"
              name="specimenKind"
              className={inputClass}
              value={specimenKind}
              onChange={(e) => setSpecimenKind(e.target.value)}
              required
            >
              <option value="dried_specimen">{STOREFRONT_RUBROS[0].label}</option>
              <option value="zoology_skeleton">{STOREFRONT_RUBROS[1].label}</option>
              <option value="plant">{STOREFRONT_RUBROS[2].label}</option>
            </select>
          </FormField>

          <FormField
            label="Región geográfica"
            htmlFor="geoRegionFolder"
            hint="Carpeta REGION Cloudinary → specimens.region"
          >
            <select
              id="geoRegionFolder"
              name="geoRegionFolder"
              className={inputClass}
              value={geoRegionFolder}
              onChange={(e) => {
                const nextGeo = e.target.value;
                setGeoRegionFolder(nextGeo);
                const nextRegionId = regionIdForGeo(nextGeo);
                if (nextRegionId) setRegionId(nextRegionId);
              }}
            >
              {DRIED_SPECIMEN_REGION_FOLDERS.map((r) => (
                <option key={r.id} value={r.folder}>
                  {r.folder}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Categoría (por zona)"
            htmlFor="catalogueCategoria"
            hint="Segmento Cloudinary → specimens.categoria"
          >
            <select
              id="catalogueCategoria"
              name="catalogueCategoria"
              className={inputClass}
              value={catalogueCategoria}
              onChange={(e) => {
                const nextCategory = e.target.value;
                setCatalogueCategoria(nextCategory);
                const nextCategoryId = categoryIdForLabel(nextCategory);
                if (nextCategoryId) setCategoryId(nextCategoryId);
              }}
              disabled={specimenKind !== 'dried_specimen'}
            >
              <option value="">—</option>
              {CATALOGUE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.segment}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Región (código / FK)"
            htmlFor="regionId"
            error={err('regionId')}
            hint="global_regions — para ID code y join"
          >
            <select
              id="regionId"
              name="regionId"
              className={inputClass}
              value={regionId}
              onChange={(e) => {
                const region = regions.find((r) => r.id === e.target.value);
                const next = getRegionValue(region);
                setRegionId(e.target.value);
                if (next) setRegionCode(next);
              }}
            >
              <option value="">— Región no especificada —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({getRegionValue(r) || '—'})
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </fieldset>

      {/* ── 2. Taxonomía y Atributos Científicos ─────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          2 · Taxonomía y Atributos Científicos
        </legend>
        <p className="text-xs text-neutral-500">
          Orden → Familia → Subfamilia → Género → Especie → Subespecie.
        </p>

        <FormField
          label="Orden (biológico)"
          htmlFor="orden"
          hint="Ej. Lepidoptera"
        >
          <input
            id="orden"
            name="orden"
            className={inputClass}
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            placeholder="Lepidoptera"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <TaxonAutocomplete
            rank="familia"
            label="Familia"
            value={familia}
            onChange={(p) => {
              setFamilia(p);
              setSubfamilia({ value: '' });
              setGenero({ value: '' });
              setEspecie({ value: '' });
            }}
          />
          <TaxonAutocomplete
            rank="subfamilia"
            label="Subfamilia"
            parentId={familia.sanityId}
            value={subfamilia}
            onChange={(p) => {
              setSubfamilia(p);
              setGenero({ value: '' });
              setEspecie({ value: '' });
            }}
          />
          <TaxonAutocomplete
            rank="genero"
            label="Género"
            parentId={subfamilia.sanityId}
            value={genero}
            onChange={(p) => {
              setGenero(p);
              setEspecie({ value: '' });
              syncScientificFromTaxon({ genero: p.value });
            }}
          />
          <TaxonAutocomplete
            rank="especie"
            label="Especie"
            parentId={genero.sanityId}
            value={especie}
            onChange={(p) => {
              setEspecie(p);
              syncScientificFromTaxon({ especie: p.value });
            }}
          />
        </div>
        {(err('genero') || err('especie')) && (
          <p className="text-xs text-red-400">{err('genero') ?? err('especie')}</p>
        )}

        <FormField label="Subespecie" htmlFor="subespecie">
          <input
            id="subespecie"
            name="subespecie"
            className={inputClass}
            value={subespecie}
            onChange={(e) => {
              setSubespecie(e.target.value);
              syncScientificFromTaxon({ subespecie: e.target.value });
            }}
            placeholder="tingomarensis"
          />
        </FormField>

        <input type="hidden" name="familia" value={familia.value} />
        <input type="hidden" name="familiaSanityId" value={familia.sanityId ?? ''} />
        <input type="hidden" name="subfamilia" value={subfamilia.value} />
        <input type="hidden" name="subfamiliaSanityId" value={subfamilia.sanityId ?? ''} />
        <input type="hidden" name="genero" value={genero.value} />
        <input type="hidden" name="generoSanityId" value={genero.sanityId ?? ''} />
        <input type="hidden" name="especie" value={especie.value} />
        <input type="hidden" name="especieSanityId" value={especie.sanityId ?? ''} />

        <FormField label="Color" htmlFor="color">
          <input
            id="color"
            name="color"
            className={inputClass}
            defaultValue={specimen?.color_dominante ?? (attrs.color as string) ?? ''}
            placeholder="Azul iridiscente"
          />
        </FormField>
      </fieldset>

      {/* ── 3. Opciones del Selector (Variantes) ─────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          3 · Opciones del Selector (Variantes)
        </legend>
        <p className="text-xs text-neutral-500">
          Calidad: A.1, A.1-, VG A.1, A.2, VG A.2 · Sexo: Male ♂, Female ♀, Pareja, Ex-pupa, Set.
          El grado (sección 1) y la calidad aquí comparten el mismo campo de producto.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Sexo / Tipo" htmlFor="sex">
            <select
              id="sex"
              name="sex"
              className={inputClass}
              defaultValue={(attrs.sex as string) ?? ''}
            >
              <option value="">—</option>
              {SEX_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Calidad (variante)"
            htmlFor="gradeCodeVariant"
            hint="Misma lista que Grado del Producto — se guarda gradeCode de arriba"
          >
            <select
              id="gradeCodeVariant"
              className={inputClass}
              disabled
              defaultValue={(attrs.grade_code as string) ?? ''}
            >
              <option value="">Usar Grado del Producto (sección 1)</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </fieldset>

      {/* ── 4. Origen y Expedición ───────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          4 · Origen y Expedición
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="País" htmlFor="countryOrigin">
            <input
              id="countryOrigin"
              name="countryOrigin"
              className={inputClass}
              defaultValue={(attrs.country_origin as string) ?? ''}
              placeholder="Perú"
            />
          </FormField>

          <FormField label="Expedición / Ubicación" htmlFor="localidad">
            <input
              id="localidad"
              name="localidad"
              className={inputClass}
              defaultValue={specimen?.localidad ?? ''}
              placeholder="Tingo María, Huánuco"
            />
          </FormField>

          <FormField label="Localidad GPS" htmlFor="gps">
            <input
              id="gps"
              name="gps"
              className={inputClass}
              defaultValue={specimen?.gps ?? ''}
              placeholder="-9.29, -76.00"
            />
          </FormField>
        </div>
      </fieldset>

      {/* ── 5. Precio y Compra ───────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          5 · Precio y Compra
        </legend>

        <FormField
          label="Campaña activa"
          htmlFor="campaignGap"
          hint="Sin vínculo ficha↔campaña en schema live — configurar en Campañas"
        >
          <input
            id="campaignGap"
            className={inputClass}
            disabled
            value="— (usar módulo Campañas; no hay descuento por ficha en DB)"
            readOnly
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio regular (menor)" htmlFor="retailPrice" error={err('retailPrice')}>
            <input
              id="retailPrice"
              name="retailPrice"
              type="number"
              step="0.01"
              className={inputClass}
              defaultValue={(pricing.retail_price as number) ?? ''}
              required
            />
          </FormField>

          <FormField
            label="Precio mayor"
            htmlFor="wholesalePrice"
            error={err('wholesalePrice')}
          >
            <input
              id="wholesalePrice"
              name="wholesalePrice"
              type="number"
              step="0.01"
              className={inputClass}
              defaultValue={(pricing.wholesale_price as number) ?? ''}
            />
          </FormField>

          <FormField
            label="Precio con descuento"
            htmlFor="discountGap"
            hint="Deriva de campaña activa en storefront — no columna por producto"
          >
            <input id="discountGap" className={inputClass} disabled value="—" readOnly />
          </FormField>

          <FormField label="Disponibilidad / Stock" htmlFor="stock" error={err('stock')}>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              className={inputClass}
              defaultValue={specimen?.stock ?? 1}
              required
            />
          </FormField>

          <FormField label="Mín. mayorista (ud.)" htmlFor="wholesaleMinQty">
            <input
              id="wholesaleMinQty"
              name="wholesaleMinQty"
              type="number"
              className={inputClass}
              defaultValue={(pricing.wholesale_min_qty as number) ?? ''}
            />
          </FormField>

          <FormField label="Divisa" htmlFor="currency">
            <input
              id="currency"
              name="currency"
              className={inputClass}
              defaultValue={(pricing.currency as string) ?? 'USD'}
            />
          </FormField>
        </div>
      </fieldset>

      {/* ── Otros / legacy ──────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-neutral-500">
          Otros campos
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Dimensiones / envergadura" htmlFor="dimensiones">
            <input
              id="dimensiones"
              name="dimensiones"
              className={inputClass}
              defaultValue={
                specimen?.dimensiones ??
                (attrs.wingspan_mm != null ? `${attrs.wingspan_mm} mm` : '')
              }
              placeholder="120 mm"
            />
          </FormField>
          <FormField label="Peso (g)" htmlFor="pesoGramos">
            <input
              id="pesoGramos"
              name="pesoGramos"
              type="number"
              step="0.01"
              className={inputClass}
              defaultValue={specimen?.peso_gramos ?? ''}
            />
          </FormField>
          <FormField
            label="Categoría (tabla categories / FK)"
            htmlFor="categoryId"
            error={err('categoryId')}
            hint="UUID interno — la categoría de catálogo Cloudinary está arriba"
          >
            <select
              id="categoryId"
              name="categoryId"
              className={inputClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— Categoría no especificada —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </fieldset>

      {/* ── Medios ──────────────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">
          Medios
        </legend>
        <p className="text-xs text-neutral-500">
          Foto principal + dorsal/ventral + modelo 3D + video → specimen_media.
        </p>

        {isEdit && specimen ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MediaSlot
                  specimenId={specimen.id}
                  kind={kind}
                  regionCode={regionCode || 'NEO'}
                  mediaType="photo_webp"
                  view="cover"
                  label="Foto principal (cover)"
                  currentCloudinaryId={coverId ?? undefined}
                />
              </div>
              <MediaSlot
                specimenId={specimen.id}
                kind={kind}
                regionCode={regionCode || 'NEO'}
                mediaType="photo_webp"
                view="dorsal"
                label="WebP 1 · Dorsal"
                currentCloudinaryId={dorsalId}
              />
              <MediaSlot
                specimenId={specimen.id}
                kind={kind}
                regionCode={regionCode || 'NEO'}
                mediaType="photo_webp"
                view="ventral"
                label="WebP 2 · Ventral"
                currentCloudinaryId={ventralId}
              />
              <MediaSlot
                specimenId={specimen.id}
                kind={kind}
                regionCode={regionCode || 'NEO'}
                mediaType="model_3d_glb"
                view="model"
                label="Modelo 3D"
                currentCloudinaryId={modelId}
              />
              <MediaSlot
                specimenId={specimen.id}
                kind={kind}
                regionCode={regionCode || 'NEO'}
                mediaType="video_mp4"
                view="video"
                label="Video (Blender / mp4)"
                currentCloudinaryId={videoId}
              />
            </div>
            <Link
              href={`/admin/multimedia/${specimen.id}`}
              className="text-xs text-emerald-400 underline hover:text-emerald-300"
            >
              Abrir gestor multimedia completo →
            </Link>
          </>
        ) : (
          <p className="rounded-md border border-dashed border-neutral-700 px-3 py-4 text-sm text-neutral-500">
            Guarda la ficha primero para subir medios anclados a esta especie/subespecie.
          </p>
        )}
      </fieldset>

      <div className="sticky bottom-0 z-20 -mx-1 border-t border-emerald-900/60 bg-neutral-950/95 px-1 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className={`${buttonPrimaryClass} inline-flex w-full items-center justify-center gap-2 sm:w-fit`}
        >
          <Save size={16} />
          {pending
            ? 'Grabando…'
            : isEdit
              ? 'GRABAR especie / subespecie'
              : 'GRABAR nueva ficha'}
        </button>
        <p className="mt-1.5 text-[10px] text-neutral-500">
          Guardá taxonomía (orden → familia → especie → subespecie) antes de subir fotos del
          ejemplar.
        </p>
      </div>
    </form>
  );
}
