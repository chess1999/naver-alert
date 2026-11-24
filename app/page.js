'use client';

import { useEffect, useState } from 'react';

const PRESETS = [
  {
    label: '스페이스잇 삼송점',
    name: '스페이스잇 삼송점',
    url: 'https://m.booking.naver.com/booking/10/bizes/1411197/items/6750319',
  },
  {
    label: '스페이스잇 원흥점',
    name: '스페이스잇 원흥점',
    url: 'https://m.booking.naver.com/booking/10/bizes/1583743/items/7380443',
  },
];

const TIME_OPTIONS = [];
for (let h = 0; h <= 24; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  if (h < 24) TIME_OPTIONS.push(`${hh}:30`);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Home() {
  const [watches, setWatches] = useState([]);
  const [lastCheck, setLastCheck] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [date, setDate] = useState('2026-11-29');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:30');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/watches', { cache: 'no-store' });
      const data = await res.json();
      setWatches(data.watches || []);
      setLastCheck(data.lastCheck || '아직 체크 기록 없음');
    } catch {
      setMsg('목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const enablePush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('아이폰은 사파리에서 [공유 → 홈 화면에 추가] 후 앱으로 열어야 알림을 켤 수 있습니다.');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해 주세요.');
        return;
      }
      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pubKey) {
        alert('VAPID 공개키가 설정되지 않았습니다.');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setMsg('✅ 이 기기에 푸시 알림이 켜졌습니다!');
    } catch (err) {
      alert('알림 설정 오류: ' + err.message);
    }
  };

  const testPush = async () => {
    setMsg('테스트 알림 발송 중...');
    const res = await fetch('/api/test-push');
    const data = await res.json();
    setMsg(data.ok ? `🔔 테스트 알림 발송 완료! (${data.sent}대)` : `오류: ${data.error}`);
  };

  const applyPreset = (preset) => {
    setName(preset.name);
    setUrl(preset.url);
  };

  const addWatch = async (e) => {
    e.preventDefault();
    if (!url.trim()) return alert('네이버 예약 링크를 붙여넣어 주세요.');
    if (startTime >= endTime) return alert('종료 시간이 시작 시간보다 늦어야 합니다.');

    setLoading(true);
    const res = await fetch('/api/watches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), date, startTime, endTime }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || '등록 실패');
      return;
    }
    setName('');
    setUrl('');
    setMsg('✅ 감시 목록에 추가되었습니다!');
    loadData();
  };

  const deleteWatch = async (id) => {
    await fetch(`/api/watches?id=${id}`, { method: 'DELETE' });
    loadData();
  };

  const runCheckNow = async () => {
    setMsg('네이버 예약 실시간 조회 중...');
    const res = await fetch('/api/check');
    const data = await res.json();
    setMsg(data.ok ? `🔍 체크 완료! (감시 ${data.checked}건 / 빈자리 ${data.found}건)` : `오류: ${data.error}`);
    loadData();
  };

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 6px', color: '#03c75a' }}>🟢 네이버 예약 빈자리 알림</h1>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>최근 자동 체크: {lastCheck}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={enablePush} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', backgroundColor: '#03c75a', color: '#fff', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
          🔔 알림 켜기
        </button>
        <button onClick={testPush} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #ddd', backgroundColor: '#fff', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
          테스트 알림
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 12px', backgroundColor: '#e8f8ee', borderRadius: 8, fontSize: 13, color: '#0b6b35', marginBottom: 16 }}>
          {msg}
        </div>
      )}

      <form onSubmit={addWatch} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>새 빈자리 감시 등록</h2>

        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 6 }}>자주 가는 곳 바로 선택</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => {
            const isSelected = url === p.url;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: isSelected ? '1.5px solid #03c75a' : '1px solid #ddd',
                  backgroundColor: isSelected ? '#e8f8ee' : '#f8f9fa',
                  color: isSelected ? '#0b6b35' : '#333',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {isSelected ? '✓ ' : '📍 '}{p.label}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>매장/룸 이름 (알림에 표시될 별명)</label>
        <input
          type="text"
          placeholder="예: 스페이스잇 고양삼송 6인실"
          value={name}
          on
