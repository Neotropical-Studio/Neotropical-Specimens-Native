'use client';

import { useActionState, useState, useTransition } from 'react';
import FormField, { inputClass, buttonPrimaryClass, buttonSecondaryClass } from '@/components/admin/FormField';
import TaxonAutocomplete, { type TaxonPick } from './TaxonAutocomplete';
import { GRADE_OPTIONS } from '@/lib/constants/grades';
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

interface SpecimenInitial {
  id: string;
  specimen_code: string;
  category_id?: string | null;
  global_regions: { id: string; region_name?: string | null; name?: string | null } | null;
  taxonomy: { id: string; category_id: string | null; rank_hierarchy: Record<string, string> } | null;
  pricing: Record<string, unknown> | null;
  stock: number;
  attributes: Record<string, unknown> | null;
}

interface Props {
  categories: Option[];
  regions: Option[];
  specimen?: SpecimenInitial;
}

const initialState: SpecimenFormState = {};

export default function SpecimenForm({ categories, regions, specimen }: Props) {
  const isEdit = Boolean(specimen);
  const action = isEdit
    ? updateSpecimenAction.bind(null, specimen!.id)
    : createSpecimenAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const getRegionValue = (region?: Option | null) => region?.region_name ?? region?.name ?? '';
  const defaultRegionCode =
    specimen?.global_regions?.region_name ??
    specimen?.global_regions?.name ??
    regions.find((r) => getRegionValue(r) === 'NEO')?.region_name ??
    regions.find((r) => getRegionValue(r) === 'NEO')?.name ??
    regions[0]?.region_name ??
    regions[0]?.name ??
    '';
  const [regionCode, setRegionCode] = useState(defaultRegionCode);
  const [specimenCode, setSpecimenCode] = useState(specimen?.specimen_code ?? '');
  const [isGenerating, startGenerating] = useTransition();

  const rh = specimen?.taxonomy?.rank_hierarchy ?? {};
  const [familia, setFamilia] = useState<TaxonPick>({ value: rh.family ?? '' });
  const [subfamilia, setSubfamilia] = useState<TaxonPick>({ value: rh.subfamily ?? '' });
  const [genero, setGenero] = useState<TaxonPick>({ value: rh.genus ?? '' });
  const [especie, setEspecie] = useState<TaxonPick>({ value: rh.species ?? '' });

  const attrs = specimen?.attributes ?? {};
  const pricing = specimen?.pricing ?? {};

  function handleGenerateCode() {
    startGenerating(async () => {
      const code = await generateSpecimenCodeAction(regionCode);
      setSpecimenCode(code);
    });
  }

  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-8">
      {state.error && (
        <div className="rounded-md border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">{state.error}</div>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Identificación</legend>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <FormField label="Código de inventario (correlativo)" htmlFor="specimenCode" error={err('specimenCode')}>
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
          <button type="button" onClick={handleGenerateCode} disabled={isGenerating} className={buttonSecondaryClass}>
            {isGenerating ? 'Generando…' : 'Generar código'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Región biogeográfica" htmlFor="regionId" error={err('regionId')}>
            <select
              id="regionId"
              name="regionId"
              className={inputClass}
              defaultValue={specimen?.global_regions?.id ?? regions.find((r) => getRegionValue(r) === 'NEO')?.id}
              onChange={(e) => {
                const region = regions.find((r) => r.id === e.target.value);
                const nextRegionValue = getRegionValue(region);
                if (nextRegionValue) setRegionCode(nextRegionValue);
              }}
              required
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({getRegionValue(r) || '—'})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Categoría" htmlFor="categoryId" error={err('categoryId')}>
            <select
              id="categoryId"
              name="categoryId"
              className={inputClass}
              defaultValue={specimen?.category_id ?? specimen?.taxonomy?.category_id ?? categories.find((c) => c.slug === 'mariposas')?.id}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Tipo de espécimen (museográfico)" htmlFor="specimenKind" error={err('specimenKind')}>
          <select
            id="specimenKind"
            name="specimenKind"
            className={inputClass}
            defaultValue={(attrs.specimen_kind as string) ?? 'dried_specimen'}
            required
          >
            <option value="dried_specimen">Espécimen Seco</option>
            <option value="zoology_skeleton">Esqueleto de Zoología</option>
            <option value="plant">Planta</option>
          </select>
        </FormField>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Taxonomía (autocompletado)</legend>
        <div className="grid grid-cols-2 gap-4">
          <TaxonAutocomplete rank="familia" label="Familia" value={familia} onChange={setFamilia} />
          <TaxonAutocomplete
            rank="subfamilia"
            label="Subfamilia"
            parentId={familia.sanityId}
            value={subfamilia}
            onChange={setSubfamilia}
          />
          <TaxonAutocomplete
            rank="genero"
            label="Género"
            parentId={subfamilia.sanityId}
            value={genero}
            onChange={setGenero}
          />
          <TaxonAutocomplete
            rank="especie"
            label="Especie"
            parentId={genero.sanityId}
            value={especie}
            onChange={setEspecie}
          />
        </div>
        {(err('genero') || err('especie')) && (
          <p className="text-xs text-red-400">{err('genero') ?? err('especie')}</p>
        )}
        <input type="hidden" name="familia" value={familia.value} />
        <input type="hidden" name="familiaSanityId" value={familia.sanityId ?? ''} />
        <input type="hidden" name="subfamilia" value={subfamilia.value} />
        <input type="hidden" name="subfamiliaSanityId" value={subfamilia.sanityId ?? ''} />
        <input type="hidden" name="genero" value={genero.value} />
        <input type="hidden" name="generoSanityId" value={genero.sanityId ?? ''} />
        <input type="hidden" name="especie" value={especie.value} />
        <input type="hidden" name="especieSanityId" value={especie.sanityId ?? ''} />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Calidad y atributos</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Grado de calidad" htmlFor="gradeCode">
            <select
              id="gradeCode"
              name="gradeCode"
              className={inputClass}
              defaultValue={(attrs.grade_code as string) ?? ''}
            >
              <option value="">—</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label} · {g.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Sexo" htmlFor="sex">
            <select id="sex" name="sex" className={inputClass} defaultValue={(attrs.sex as string) ?? ''}>
              <option value="">—</option>
              <option value="M">♂ Macho</option>
              <option value="F">♀ Hembra</option>
              <option value="P">Pareja</option>
              <option value="EP">Ex-pupa</option>
              <option value="S">Set</option>
            </select>
          </FormField>
          <FormField label="Nombre común" htmlFor="commonName">
            <input
              id="commonName"
              name="commonName"
              className={inputClass}
              defaultValue={(attrs.common_name as string) ?? ''}
            />
          </FormField>
          <FormField label="Envergadura (mm)" htmlFor="wingspanMm">
            <input
              id="wingspanMm"
              name="wingspanMm"
              type="number"
              step="0.1"
              className={inputClass}
              defaultValue={(attrs.wingspan_mm as number) ?? ''}
            />
          </FormField>
          <FormField label="País de origen" htmlFor="countryOrigin">
            <input
              id="countryOrigin"
              name="countryOrigin"
              className={inputClass}
              defaultValue={(attrs.country_origin as string) ?? ''}
            />
          </FormField>
          <FormField label="Stock" htmlFor="stock" error={err('stock')}>
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
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Precios</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio minorista" htmlFor="retailPrice" error={err('retailPrice')}>
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
          <FormField label="Precio mayorista" htmlFor="wholesalePrice" error={err('wholesalePrice')}>
            <input
              id="wholesalePrice"
              name="wholesalePrice"
              type="number"
              step="0.01"
              className={inputClass}
              defaultValue={(pricing.wholesale_price as number) ?? ''}
            />
          </FormField>
          <FormField label="Mínimo mayorista (unidades)" htmlFor="wholesaleMinQty">
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

      <button type="submit" disabled={pending} className={`${buttonPrimaryClass} w-fit`}>
        {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear espécimen'}
      </button>
    </form>
  );
}
