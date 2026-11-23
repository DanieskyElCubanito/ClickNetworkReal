import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';

const PROMO_CHANNEL_URL = 'https://t.me/CryptoWeb3Pay';

export default function PromoBlock() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const openChannel = () => {
    try {
      if (WebApp.openTelegramLink) WebApp.openTelegramLink(PROMO_CHANNEL_URL);
      else window.open(PROMO_CHANNEL_URL, '_blank');
    } catch (e) {
      window.open(PROMO_CHANNEL_URL, '_blank');
    }
  };

  const redeem = async () => {
    const clean = code.trim();
    if (!clean || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': WebApp.initData || ''
        },
        body: JSON.stringify({ action: 'redeem-promo', code: clean })
      });
      const data = await response.json().catch(() => null);
      if (data && data.success) {
        setMsg({ ok: true, text: `✅ ¡Canjeado! +${(Number(data.reward) * 1000).toFixed(2)} $TGM` });
        setCode('');
      } else {
        setMsg({ ok: false, text: (data && data.error) || 'No se pudo canjear el código.' });
      }
    } catch (e) {
      setMsg({ ok: false, text: 'Sin conexión con el servidor. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const empty = !code.trim() || busy;

  return (
    <div style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #5B1FC4 100%)', borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 0 #3F0F8F', color: '#fff', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{ fontSize: '18px', fontWeight: '900' }}>🎟️ Código promo</div>
        <button
          onClick={openChannel}
          style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none', borderRadius: '999px', padding: '6px 12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', flexShrink: 0 }}
        >
          Conseguir códigos ›
        </button>
      </div>
      <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '12px' }}>Escribe tu código y recibe tu premio</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Escribe tu código"
          maxLength={40}
          disabled={busy}
          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '2px dashed #E9D5FF', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '14px', fontWeight: '800', outline: 'none' }}
        />
        <button
          onClick={redeem}
          disabled={empty}
          style={{ padding: '0 16px', minHeight: '44px', borderRadius: '12px', border: 'none', background: empty ? '#9CA3AF' : '#21A845', color: '#fff', fontWeight: '900', fontSize: '14px', cursor: empty ? 'default' : 'pointer', flexShrink: 0 }}
        >
          {busy ? '...' : 'Canjear'}
        </button>
      </div>
      {msg && (
        <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '800', color: msg.ok ? '#B9F6CA' : '#FFD1D1' }}>{msg.text}</div>
      )}
    </div>
  );
}