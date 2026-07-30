import Link from 'next/link';
import CatalogEntryVideo from './CatalogEntryVideo';
import CatalogNavCard from './CatalogNavCard';
import type {
  CatalogueBreadcrumb,
  CatalogueNavNode,
} from '@/lib/specimens/catalogueNav';

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs: CatalogueBreadcrumb[];
  /** @deprecated Preferir video por card (showCardVideo). */
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
  breadcrumbs,
  entryVideoPublicId,
  nodes,
  hrefFor,
  showCardVideo,
  familyCards = false,
  childLabel,
  emptyMessage = 'No hay elementos en este nivel todavía.',
}: Props) {
  const cardVideo = showCardVideo ?? familyCards;
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/45">
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

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-white/55">{subtitle}</p>
        ) : null}
      </header>

      {entryVideoPublicId ? (
        <div className="mb-10 overflow-hidden rounded-2xl border border-white/10">
          <CatalogEntryVideo
            videoPublicId={entryVideoPublicId}
            title={title}
            variant="hero"
          />
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/50">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <CatalogNavCard
              key={node.id}
              node={node}
              href={hrefFor(node)}
              showCardVideo={cardVideo}
              childLabel={
                childLabel ??
                (cardVideo ? 'especímenes' : 'ítems')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
