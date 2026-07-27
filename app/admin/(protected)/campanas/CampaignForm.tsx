'use client';

import { useActionState, useState } from 'react';
import { Upload } from 'lucide-react';
import FormField, { inputClass, buttonPrimaryClass } from '@/components/admin/FormField';
import { imageUrl } from '@/lib/cloudinary/url';
import { createCampaignAction, updateCampaignAction, type CampaignFormState } from './actions';

interface Option {
  id: string;
  name: string;
}

interface CampaignBannerContent {
  headline?: { es?: string; en?: string };
  subheadline?: { es?: string; en?: string };
  ctaLabel?: { es?: string; en?: string };
  ctaHref?: string;
  imageCloudinaryId?: string;
  videoCloudinaryId?: string;
}

interface CampaignInitial {
  id: string;
  title: string;
  banner: CampaignBannerContent | null;
  discount_percent: number | null;
  category_id: string | null;
  region_id: string | null;
  starts_at: string;
  ends_at: string;
  priority: number;
  active: boolean;
}

interface Props {
  categories: Option[];
  regions: Option[];
  campaign?: CampaignInitial;
}

const initialState: CampaignFormState = {};

// datetime-local espera "YYYY-MM-DDTHH:mm" en hora local del navegador.
function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CampaignForm({ categories, regions, campaign }: Props) {
  const isEdit = Boolean(campaign);
  const action = isEdit ? updateCampaignAction.bind(null, campaign!.id) : createCampaignAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const banner = campaign?.banner ?? {};
  const [imageId, setImageId] = useState<string | undefined>(banner.imageCloudinaryId);
  const [uploading, setUploading] = useState(false);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', 'photo_webp');
    formData.append('documentFolder', 'campanas');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setImageId(data.cloudinaryId);
    } finally {
      setUploading(false);
    }
  }

  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-8">
      {state.error && (
        <div className="rounded-md border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">{state.error}</div>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Campaña</legend>
        <FormField label="Título interno" htmlFor="title" error={err('title')}>
          <input id="title" name="title" className={inputClass} defaultValue={campaign?.title} required />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Titular (Español)" htmlFor="headlineEs">
            <input id="headlineEs" name="headlineEs" className={inputClass} defaultValue={banner.headline?.es} />
          </FormField>
          <FormField label="Headline (English)" htmlFor="headlineEn">
            <input id="headlineEn" name="headlineEn" className={inputClass} defaultValue={banner.headline?.en} />
          </FormField>
          <FormField label="Subtítulo (Español)" htmlFor="subheadlineEs">
            <input
              id="subheadlineEs"
              name="subheadlineEs"
              className={inputClass}
              defaultValue={banner.subheadline?.es}
            />
          </FormField>
          <FormField label="Subheadline (English)" htmlFor="subheadlineEn">
            <input
              id="subheadlineEn"
              name="subheadlineEn"
              className={inputClass}
              defaultValue={banner.subheadline?.en}
            />
          </FormField>
          <FormField label="Texto del botón (Español)" htmlFor="ctaLabelEs">
            <input id="ctaLabelEs" name="ctaLabelEs" className={inputClass} defaultValue={banner.ctaLabel?.es} />
          </FormField>
          <FormField label="CTA label (English)" htmlFor="ctaLabelEn">
            <input id="ctaLabelEn" name="ctaLabelEn" className={inputClass} defaultValue={banner.ctaLabel?.en} />
          </FormField>
        </div>

        <FormField label="Enlace del botón" htmlFor="ctaHref">
          <input id="ctaHref" name="ctaHref" className={inputClass} defaultValue={banner.ctaHref} placeholder="/es#catalogo" />
        </FormField>

        <FormField label="Imagen del cintillo">
          <div className="flex items-center gap-3">
            {imageId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(imageId, ['w_160'])} alt="Banner" className="h-12 w-20 rounded object-cover" />
            )}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-emerald-500 hover:text-emerald-300">
              <Upload size={13} />
              {uploading ? 'Subiendo…' : 'Subir imagen'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImage} />
            </label>
          </div>
          <input type="hidden" name="imageCloudinaryId" value={imageId ?? ''} />
        </FormField>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Descuento y segmentación</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Descuento (%)" htmlFor="discountPercent" error={err('discountPercent')}>
            <input
              id="discountPercent"
              name="discountPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={inputClass}
              defaultValue={campaign?.discount_percent ?? ''}
            />
          </FormField>
          <FormField label="Prioridad" htmlFor="priority">
            <input
              id="priority"
              name="priority"
              type="number"
              className={inputClass}
              defaultValue={campaign?.priority ?? 0}
            />
          </FormField>
          <FormField label="Categoría (opcional)" htmlFor="categoryId">
            <select id="categoryId" name="categoryId" className={inputClass} defaultValue={campaign?.category_id ?? ''}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Región (opcional)" htmlFor="regionId">
            <select id="regionId" name="regionId" className={inputClass} defaultValue={campaign?.region_id ?? ''}>
              <option value="">Todas</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-emerald-400">Ventana de activación</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Activación" htmlFor="startsAt" error={err('startsAt')}>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              className={inputClass}
              defaultValue={campaign ? toDateTimeLocal(campaign.starts_at) : undefined}
              required
            />
          </FormField>
          <FormField label="Cierre" htmlFor="endsAt" error={err('endsAt')}>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              className={inputClass}
              defaultValue={campaign ? toDateTimeLocal(campaign.ends_at) : undefined}
              required
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="active" defaultChecked={campaign?.active ?? true} />
          Campaña activa (apagado manual, independiente de la ventana de fechas)
        </label>
        <p className="text-xs text-neutral-500">
          La campaña se muestra sola cuando la fecha actual está entre activación y cierre — no requiere despliegue ni
          tarea programada.
        </p>
      </fieldset>

      <button type="submit" disabled={pending} className={`${buttonPrimaryClass} w-fit`}>
        {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear campaña'}
      </button>
    </form>
  );
}
