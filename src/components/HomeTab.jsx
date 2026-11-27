import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import ProfileHeader from './ProfileHeader';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const formatCompact = (num) => {
  const n = Number(num || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const formatCompactUsd = (num) => {
  const n = Number(num || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const cardStyle = {
  background: slateCard,
  border: goldBorder,
  borderRadius: '18px',
  padding: '18px',
  marginBottom: '14px',
  boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
};

const darkBtnStyle = {
  width: '100%',
  padding: '11px 16px',
  background: '#0E151C',
  border: goldBorder,
  borderRadius: '11px',
  color: '#F3F4F6',
  fontSize: '14px',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(226, 194, 144, 0.12)',
  transition: 'all 0.2s ease'
};

export default function HomeTab({ userData, setUserData, setActiveTab, t, lang, setLang }) {
  const [globalStats, setGlobalStats] = useState({
    users: 0,
    withdrawn: 0,
    deposited: 0,
    daysOnline: 1
  });

  useEffect(() => {
    let active = true;
    fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': WebApp.initData || ''
      },
      body: JSON.stringify({ action: 'get-global-stats' })
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.success && data.stats) {
          setGlobalStats({
            users: Number(data.stats.users || 0),
            withdrawn: Number(data.stats.withdrawn || 0),
            deposited: Number(data.stats.deposited || 0),
            daysOnline: Number(data.stats.daysOnline || 1)
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleWalletAction = (tabMode) => {
    try {
      localStorage.setItem('preferred_wallet_tab', tabMode);
    } catch {}
    if (typeof setActiveTab === 'function') {
      setActiveTab('wallet');
    }
  };

  // deposit_balance en DB está en USD; 1 USD = 1000 Créditos
  const vaultUsd = Number(userData?.deposit_balance || 0);
  const creditsEquiv = vaultUsd * 1000;

  // balance en DB está en USD; 1 USD = 1000 $TGM
  const withdrawableUsd = Number(userData?.balance || 0);
  const tgmBalance = Math.round(withdrawableUsd * 1000);

  return (
    <div className="fade-in" style={{ color: '#F3F4F6', paddingBottom: '24px' }}>
      <ProfileHeader
        userData={userData}
        setUserData={setUserData}
        t={t}
        lang={lang}
        setLang={setLang}
      />

      {/* Datos Globales (2x2) */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#F3F4F6' }}>
          {t?.('home_global_data') || 'Datos Globales'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
              {t?.('home_stat_users') || 'Usuarios:'}
            </div>
            <div style={{ fontSize: '21px', fontWeight: '800', color: '#F3F4F6' }}>
              {formatCompact(globalStats.users)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
              {t?.('home_stat_withdrawn') || 'Retirado:'}
            </div>
            <div style={{ fontSize: '21px', fontWeight: '800', color: '#F3F4F6' }}>
              {formatCompact(globalStats.withdrawn)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
              {t?.('home_stat_vault') || 'Fondos Bóveda:'}
            </div>
            <div style={{ fontSize: '21px', fontWeight: '800', color: '#F3F4F6' }}>
              {formatCompactUsd(globalStats.deposited)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
              {t?.('home_stat_days') || 'Días en Línea:'}
            </div>
            <div style={{ fontSize: '21px', fontWeight: '800', color: '#F3F4F6' }}>
              {globalStats.daysOnline}
            </div>
          </div>
        </div>
      </div>

      {/* Fondo de Campaña */}
      <h3 style={{ margin: '18px 2px 10px 2px', fontSize: '15px', fontWeight: '700', color: '#F3F4F6' }}>
        {t?.('home_campaign_fund') || 'Fondo de Campaña'}
      </h3>

      <div style={cardStyle}>
        <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>
          {t?.('home_vault_usd_label') || 'USD (Fondos para Campañas)'}
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#F3F4F6', marginBottom: '4px' }}>
          {vaultUsd.toFixed(2)} USD
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
          {(t?.('home_credits_equiv') || 'Equivale a {credits} CRÉDITOS').replace(
            '{credits}',
            creditsEquiv.toFixed(2)
          )}
        </div>
        <button type="button" onClick={() => handleWalletAction('deposit')} style={darkBtnStyle}>
          {t?.('home_btn_deposit') || 'Depositar'}
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600', marginBottom: '4px' }}>
          {t?.('home_withdrawable_label') || 'Saldo Retirable ($TGM)'}
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#E2C290', marginBottom: '4px' }}>
          {tgmBalance.toLocaleString('en-US')} $TGM
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
          {t?.('home_rate_info') || '1000 $TGM = 1 USD'}
        </div>
        <button type="button" onClick={() => handleWalletAction('withdraw')} style={darkBtnStyle}>
          {t?.('home_btn_withdraw') || 'Retirar'}
        </button>
      </div>
    </div>
  );
}
