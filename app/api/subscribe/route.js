import { NextResponse } from 'next/server';
import { redis } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const sub = await req.json();
  const subs = (await redis.get('naver:subs')) || [];
  const exists = subs.some((s) => s.endpoint === sub.endpoint);

  if (!exists) {
    subs.push(sub);
    await redis.set('naver:subs', subs);
  }
  return NextResponse.json({ ok: true, count: subs.length });
}
