import { Redis } from '@upstash/redis';
import webpush from 'web-push';

export const redis = Redis.fromEnv();

export async function sendPushToAll(payload) {
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (!pubKey || !privKey) return { sent: 0, error: 'VAPID 키 미설정' };

  webpush.setVapidDetails('mailto:admin@example.com', pubKey, privKey);

  const subs = (await redis.get('naver:subs')) || [];
  if (subs.length === 0) return { sent: 0 };

  const validSubs = [];
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      validSubs.push(sub);
      sent++;
    } catch (err) {
      // 만료된 구독(404, 410)은 자동 정리
      if (err.statusCode !== 404 && err.statusCode !== 410) {
        validSubs.push(sub);
      }
    }
  }

  if (validSubs.length !== subs.length) {
    await redis.set('naver:subs', validSubs);
  }
  return { sent };
}
