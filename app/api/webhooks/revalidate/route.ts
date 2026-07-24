import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.WEBHOOK_SECRET!;

function authorized(token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return [v];
  return [];
}

interface RevalidateBody {
  tag?: string | string[];
  tags?: string | string[];
  path?: string | string[];
  paths?: string | string[];
  type?: 'layout' | 'page';
}

export async function POST(request: NextRequest) {
  try {
    const token =
      request.headers.get('x-webhook-secret') ??
      request.headers.get('authorization')?.replace('Bearer ', '') ??
      null;

    if (!authorized(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RevalidateBody;

    const tags = [...toList(body.tag), ...toList(body.tags)];
    const paths = [...toList(body.path), ...toList(body.paths)];

    for (const tag of new Set(tags)) revalidateTag(tag);
    for (const path of new Set(paths)) {
      revalidatePath(path, body.type ?? (path.includes('[') ? 'page' : undefined));
    }

    return NextResponse.json({
      revalidated: true,
      tags: [...new Set(tags)],
      paths: [...new Set(paths)],
      now: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}
