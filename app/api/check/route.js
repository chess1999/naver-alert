import { NextResponse } from 'next/server';
import { redis, sendPushToAll } from '../../../lib/store';

export const dynamic = 'force-dynamic';

function getTargetSlots(date, startTime, endTime) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const start = toMin(startTime);
  const end = toMin(endTime);
  const list = [];
  for (let m = start; m < end; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    list.push(`${date}T${hh}:${mm}`);
  }
  return list;
}

export async function GET() {
  try {
    const watches = (await redis.get('naver:watches')) || [];
    const alerted = (await redis.get('naver:alerted')) || {};
    let found = 0;

    for (const w of watches) {
      const targetTimes = getTargetSlots(w.date, w.startTime, w.endTime);

      const payload = {
        operationName: 'hourlySchedule',
        variables: {
          scheduleParams: {
            businessTypeId: Number(w.businessTypeId) || 10,
            businessId: String(w.businessId),
            bizItemId: String(w.bizItemId),
            startDateTime: `${w.date}T00:00:00`,
            endDateTime: `${w.date}T23:59:59`,
            fixedTime: true,
            includesHolidaySchedules: true,
          },
        },
        query:
          'query hourlySchedule($scheduleParams: ScheduleParams) { schedule(input: $scheduleParams) { bizItemSchedule { hourly { unitStartDateTime unitStock unitBookingCount stock bookingCount isUnitSaleDay } } } }',
      };

      const res = await fetch('https://m.booking.naver.com/graphql?opName=hourlySchedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://m.booking.naver.com',
          Referer: `https://m.booking.naver.com/booking/${w.businessTypeId}/bizes/${w.businessId}/items/${w.bizItemId}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!res.ok) continue;
      const data = await res.json();
      const slots = data?.data?.schedule?.bizItemSchedule?.hourly || [];

      const openList = [];
      for (const t of targetTimes) {
        const slot = slots.find((s) => s.unitStartDateTime && s.unitStartDateTime.startsWith(t));
        if (slot) {
          const remain =
            slot.unitStock !== null && slot.unitStock !== undefined
              ? slot.unitStock - slot.unitBookingCount
              : slot.stock - slot.bookingCount;
          if (remain > 0 && slot.isUnitSaleDay === true) {
            openList.push(t.substring(11, 16));
          }
        }
      }

      if (openList.length > 0) {
        found++;
        const keyStr = openList.join(', ');
        if (alerted[w.id] !== keyStr) {
          await sendPushToAll({
            title: `🟢 ${w.name} 빈자리 발견!`,
            body: `${w.date} [${keyStr}] 예약 가능! 터치해서 바로 예약하세요.`,
            url: w.url,
          });
          alerted[w.id] = keyStr;
        }
      } else {
        delete alerted[w.id];
      }
    }

    const lastCheck = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    await redis.set('naver:alerted', alerted);
    await redis.set('naver:lastCheck', lastCheck);

    return NextResponse.json({ ok: true, checked: watches.length, found, lastCheck });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
