import Image from 'next/image';
import Link from 'next/link';
import CatalogBackLink from './CatalogBackLink';
import CatalogEntryVideo from './CatalogEntryVideo';
import CatalogNavPager from './CatalogNavPager';
import { imageUrl } from '@/lib/cloudinary/url';
import type {
  CatalogueBreadcrumb,
  CatalogueNavNode,
} from '@/lib/specimens/catalogueNav';

interface Props {
  title: string;
  subtitle?: string;
  /** Línea grande de instrucción (ej. SEARCH BELOW WORLD REGIONS). */
  lead?: string;
  breadcrumbs: CatalogueBreadcrumb[];
  /** Volver al sitio anterior (nivel padre del árbol). */
  backHref?: string | null;
  backLabel?: string | null;
  /** Cover del nodo (`_card`) — se muestra junto al video de entrada. */
  entryCoverPublicId?: string | null;
  /** Video del nodo (`_video`) — banda hero bajo el lead. */
  entryVideoPublicId?: string | null;
  nodes: CatalogueNavNode[];
  hrefFor: (node: CatalogueNavNode) => string;
  /** true: cada card muestra badge de video de entrada (categoría o familia). */
  showCardVideo?: boolean;
  /** @deprecated Usar showCardVideo. */
  familyCards?: boolean;
  childLabel?: string;
  emptyMessage?: string;
}

export default function CatalogBrowseShell({
  title,
  subtitle,
  lead,
  breadcrumbs,
  backHref,
  backLabel,
  entryCoverPublicId,
  entryVideoPublicId,
  nodes,
  hrefFor,
  showCardVideo,
  familyCards = false,
  childLabel,
  emptyMessage = 'No hay elementos en este nivel todavía.',
}: Props) {
  const cardVideo = showCardVideo ?? familyCards;
  const coverId = entryCoverPublicId?.trim() || null;
  const videoId = entryVideoPublicId?.trim() || null;
  const coverSrc = coverId
    ? imageUrl(coverId, ['w_1280', 'c_fill', 'g_auto', 'q_auto'])
    : null;
  const hasEntryMedia = Boolean(coverSrc || videoId);
  const back =
    backHref?.trim() && backLabel?.trim()
      ? { href: backHref.trim(), label: backLabel.trim() }
      : null;

  const navItems = nodes.map((node) => ({
    node,
    href: hrefFor(node),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
      {back ? <CatalogBackLink href={back.href} label={back.label} /> : null}

      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/45"
      >
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span className="text-white/20">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="transition hover:text-emerald-300">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white/70">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <header className="mb-8 max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-white/55">{subtitle}</p>
        ) : null}
        {lead ? (
          <p className="mt-5 text-2xl font-semibold uppercase tracking-[0.12em] text-emerald-300 md:text-4xl md:tracking-[0.16em]">
            {lead}
          </p>
        ) : null}
      </header>

      {hasEntryMedia ? (
        <div className="mb-10 grid gap-4 lg:grid-cols-5">
          {coverSrc ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 lg:col-span-2 lg:aspect-auto lg:min-h-[280px]">
              <Image
                src={coverSrc}
                alt={`${title} · card`}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <span className="absolute left-3 top-3 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                Card
              </span>
            </div>
          ) : null}
          {videoId ? (
            <div
              className={`overflow-hidden rounded-2xl border border-white/10 ${
                coverSrc ? 'lg:col-span-3' : 'lg:col-span-5'
              }`}
            >
              <div className="relative">
                <CatalogEntryVideo
                  mediaCode={videoId}
                />
                <span className="absolute left-3 top-3 z-10 rounded bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                  Video
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/50">
          {emptyMessage}
        </p>
      ) : (
        <CatalogNavPager
          items={navItems}
          showCardVideo={cardVideo}
          childLabel={childLabel}
        />
      )}
    </div>
  );
}
