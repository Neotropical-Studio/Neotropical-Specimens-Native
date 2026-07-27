import Link from 'next/link';
import { imageUrl } from '@/lib/cloudinary/url';
import { getActiveCampaign } from '@/lib/campaigns/getActive';

interface Props {
  lang: string;
}

// Server Component: sin caché (la portada ya es revalidate = 0), así que
// activar/cerrar una campaña en el panel admin sólo cambia sus fechas — sin
// necesidad de invalidar nada aquí.
export default async function CampaignBanner({ lang }: Props) {
  const campaign = await getActiveCampaign();
  if (!campaign) return null;

  const headline = campaign.banner.headline?.[lang as 'es' | 'en'] ?? campaign.banner.headline?.es ?? campaign.title;
  const subheadline = campaign.banner.subheadline?.[lang as 'es' | 'en'] ?? campaign.banner.subheadline?.es;
  const ctaLabel = campaign.banner.ctaLabel?.[lang as 'es' | 'en'] ?? campaign.banner.ctaLabel?.es ?? 'Ver más';
  const ctaHref = campaign.banner.ctaHref ?? `/${lang}`;
  const image = campaign.banner.imageCloudinaryId ? imageUrl(campaign.banner.imageCloudinaryId, ['w_1600']) : null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950 to-neutral-950">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">{headline}</p>
          {subheadline && <p className="text-xs text-emerald-200/80">{subheadline}</p>}
        </div>
        <div className="flex items-center gap-3">
          {campaign.discountPercent != null && (
            <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950">
              -{campaign.discountPercent}%
            </span>
          )}
          <Link
            href={ctaHref}
            className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400 hover:text-emerald-950"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
