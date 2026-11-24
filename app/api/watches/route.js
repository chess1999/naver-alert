import { NextResponse } from 'next/server';
import { redis } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const watches = (await redis.get('naver:watches')) || [];
  const lastCheck = (await redis.get('naver:lastCheck')) || '';
  return NextResponse.json({ watches, lastCheck });
}

export async function POST(req) {
  const body = await req.json();
  const { name, url, date, startTime, endTime } = body;

  const match = url.match(/booking\/(\d+)\/bizes\/(\d+)\/items\/(\d+)/);
  if (!match) {
    return NextResponse.json(
      { error: '올바른 네이버 예약 상품 링크가 아닙니다. (booking/.../bizes/.../items/... 형태)' },
      { status: 400 }
    );
  }

  const watches = (await redis.get('naver:watches')) || [];
  const newWatch = {
    id: Date.now().toString(),
    name: name || `매장 ${match[2]}`,
    url,
    businessTypeId: Number(match[1]),
    businessId: match[2],
    bizItemId: match[3],
    date,
    startTime,
    endTime,
  };

  watches.push(newWatch);
  await redis.set('naver:watches', watches);
  return NextResponse.json({ ok: true, watch: newWatch });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const watches = (await redis.get('naver:watches')) || [];
  const filtered = watches.filter((w) => w.id !== id);
  await redis.set('naver:watches', filtered);

  const alerted = (await redis.get('naver:alerted')) || {};
  if (alerted[id]) {
    delete alerted[id];
    await redis.set('naver:alerted', alerted);
  }

  return NextResponse.json({ ok: true });
}
