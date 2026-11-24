import { NextResponse } from 'next/server';
import { sendPushToAll } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await sendPushToAll({
    title: '🟢 네이버 예약 알림 테스트',
    body: '정상적으로 연결되었습니다! 빈자리가 나면 바로 알려드릴게요.',
    url: '/',
  });
  return NextResponse.json({ ok: !result.error, ...result });
}
