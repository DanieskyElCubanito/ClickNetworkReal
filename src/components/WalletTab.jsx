import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateSurface = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const formatVaultDisplay = (val) => {
  const n = Number(val || 0);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 100_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return Math.floor(n).toLocaleString('en-US');
};

const formatTgmDisplay = (val) => {
  const n = Number(val || 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const styles = {
  container: { color: '#F3F4F6', paddingBottom: '24px' },
  title: {
    fontSize: '18px',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    margin: '6px 0 18px 0',
    color: '#F3F4F6'
  },
  dualCard: {
    flex: 1,
    minWidth: 0,
    background: slateSurface,
    border: goldBorder,
    borderRadius: '18px',
    padding: '16px 12px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
  },
  card: {
    background: slateSurface,
    border: goldBorder,
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '14px',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
  },
  champagneBtn: {
    width: '100%',
    padding: '14px 16px',
    background: champagneGrad,
    color: '#0E151C',
    border: '1px solid rgba(226, 194, 144, 0.65)',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '13px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    background: '#0E151C',
    border: goldBorder,
    borderRadius: '12px',
    padding: '13px 14px',
    fontSize: '14px',
    color: '#F3F4F6',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '14px',
    fontWeight: '600'
  },
  label: {
    fontSize: '11px',
    color: '#94A3B8',
    fontWeight: '700',
    display: 'block',
    marginBottom: '7px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    background: '#0E151C',
    padding: '5px',
    borderRadius: '14px',
    border: goldBorder
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: '11px 10px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '12px',
    border: active ? '1px solid rgba(226, 194, 144, 0.6)' : '1px solid transparent',
    cursor: 'pointer',
    background: active ? champagneGrad : 'transparent',
    color: active ? '#0E151C' : '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  })
};

export default function WalletTab({ userData, setUserData, t }) {
  const [activeTab, setActiveTab] = useState('withdraw');
  const [withdrawAddress, setWithdrawAddress] = useState(userData?.saved_wallet || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [minWithdrawalTGM, setMinWithdrawalTGM] = useState(null);
  const [reqs, setReqs] = useState({ referrals: 0, ads: 0 });
  const [playingAd, setPlayingAd] = useState(false);

  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [rechargeMethod, setRechargeMethod] = useState('gram');
  const [checkoutView, setCheckoutView] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempWallet, setTempWallet] = useState('');
  const [intentId, setIntentId] = useState(null);
  const [liveGramUsd, setLiveGramUsd] = useState(5.0);

  const apiHeaders = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': WebApp.initData || ''
  };

  const tr = (key, fallback, vars = {}) => {
    const raw = typeof t === 'function' ? t(key) : null;
    let text = !raw || raw === key ? fallback : raw;
    Object.entries(vars).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
    return text;
  };

  useEffect(() => {
    try {
      const preferred = localStorage.getItem('preferred_wallet_tab');
      if (preferred === 'deposit' || preferred === 'withdraw') {
        setActiveTab(preferred);
        localStorage.removeItem('preferred_wallet_tab');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!window.showGiga) {
      const script = document.createElement('script');
      script.src = 'https://ad.gigapub.tech/script?id=8567';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchReqs = async () => {
      try {
        const res = await fetch('/api', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ action: 'get-withdrawal-reqs' })
        });
        const data = await res.json();
        if (isMounted && data.success) {
          setReqs({ referrals: data.referrals ?? 0, ads: data.ads ?? 0 });
          if (data.saved_wallet) setWithdrawAddress(data.saved_wallet);
          if (data.min_withdrawal != null) {
            setMinWithdrawalTGM(Math.round(Number(data.min_withdrawal) * 1000));
          }
        }
      } catch (e) {
        console.error('Error cargando requisitos', e);
      }
    };
    if (activeTab === 'withdraw') fetchReqs();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data?.['the-open-network']?.usd) {
          setLiveGramUsd(data['the-open-network'].usd);
        }
      })
      .catch(() => {
        if (isMounted) setLiveGramUsd(5.0);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const balanceUSDT = Number(userData?.balance || 0);
  const tgmBalance = Number((balanceUSDT * 1000).toFixed(2));

  const depositBalanceUsdt = Number(userData?.deposit_balance || 0);
  const creditVault = Math.floor(depositBalanceUsdt * 1000);

  const numericRecharge = Number(rechargeAmount) || 0;
  const gramRechargePrice = (numericRecharge / liveGramUsd).toFixed(2);

  const handleWatchProgressAd = () => {
    if (!window.showGiga) return toast.error(tr('bank_err_unstable', 'Conexión de red inestable.'));
    setPlayingAd(true);

    window
      .showGiga()
      .then(async () => {
        try {
          const res = await fetch('/api', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({ action: 'watch-ad-progress' })
          });
          const data = await res.json();
          if (data.success) {
            toast.success(tr('bank_msg_mission_ok', 'Misión de red validada (Sin recompensa extra)'));
            setReqs((prev) => ({
              ...prev,
              ads: typeof data.ads === 'number' ? data.ads : Math.min(prev.ads + 1, 5)
            }));
          } else {
            toast.error(data.error || tr('bank_err_validation', 'Fallo al procesar validación.'));
          }
        } catch {
          toast.error(tr('bank_msg_conn_error', 'Error de conexión.'));
        } finally {
          setPlayingAd(false);
        }
      })
      .catch(() => {
        toast.error(tr('bank_err_cancelled', 'Transmisión cancelada.'));
        setPlayingAd(false);
      });
  };

  const handleWithdraw = async () => {
    if (!withdrawAddress.trim()) return toast.error(tr('bank_err_wallet_empty', 'Ingresa tu billetera TON.'));
    if (withdrawAddress.length < 20) return toast.error(tr('bank_err_wallet_invalid', 'Billetera TON inválida.'));

    const tgmAmount = Number(withdrawAmount);
    if (minWithdrawalTGM == null) {
      return toast.error(tr('bank_err_loading_min', 'Cargando el mínimo de retiro, inténtalo de nuevo.'));
    }
    if (!tgmAmount || tgmAmount < minWithdrawalTGM) {
      return toast.error(tr('bank_err_min_withdraw', 'El retiro mínimo es de {min} $TGM.', { min: minWithdrawalTGM }));
    }
    if (tgmAmount > tgmBalance) {
      return toast.error(tr('bank_err_insufficient', 'Capital insuficiente.'));
    }

    if (reqs.referrals < 5 && reqs.ads < 5) {
      return toast.error(tr('bank_req_error', 'Debes cumplir uno de los requisitos (5 Referidos o 5 Misiones de red).'));
    }

    setIsWithdrawing(true);
    const tid = toast.loading(tr('bank_msg_processing', 'Autorizando transacción...'));
    const usdtAmount = tgmAmount / 1000;

    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ action: 'request-withdrawal', address: withdrawAddress, amount: usdtAmount })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || tr('bank_msg_success', 'Retiro en proceso de liquidación.'), { id: tid, duration: 4000 });
        if (data.balance !== undefined) {
          setUserData((prev) => ({ ...prev, balance: data.balance, saved_wallet: withdrawAddress }));
        }
        setWithdrawAmount('');
      } else {
        toast.error(data.error || tr('bank_msg_error', 'Fallo en transacción.'), { id: tid, duration: 4000 });
      }
    } catch {
      toast.error(tr('bank_msg_conn_error', 'Error de red.'), { id: tid });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleStartRecharge = async () => {
    if (numericRecharge <= 0) return toast.error(tr('bank_err_amount', 'Monto inválido.'));
    setIsGenerating(true);
    const tid = toast.loading(tr('bank_msg_generating', 'Configurando pasarela...'));

    try {
      const actionRoute = rechargeMethod === 'usdt' ? 'generate-usdt-wallet' : 'generate-payment-wallet';
      const amountToSend = rechargeMethod === 'usdt' ? numericRecharge : gramRechargePrice;

      const res = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ action: actionRoute, packageId: 0, price: amountToSend, clicks: numericRecharge })
      });
      const data = await res.json();

      if (data.success && data.wallet) {
        setTempWallet(data.wallet);
        setIntentId(data.intentId);
        toast.dismiss(tid);
        setCheckoutView(true);
      } else {
        throw new Error(data.error || tr('bank_err_server_wallet', 'Fallo al generar contrato.'));
      }
    } catch (e) {
      toast.error(e.message || tr('bank_err_gateway', 'Servidor inaccesible.'), { id: tid, duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyWallet = (wallet) => {
    navigator.clipboard.writeText(wallet);
    toast.success(tr('bank_msg_copied', 'Copiado exitosamente.'));
  };

  const openTonkeeper = () => {
    try {
      WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor(gramRechargePrice * 1e9)}`);
    } catch {
      toast.error(tr('bank_err_not_installed', 'App no detectada.'));
    }
  };

  const handleVerifyPayment = async () => {
    const tid = toast.loading(tr('bank_msg_verifying', 'Auditando blockchain...'));
    const verifyRoute = rechargeMethod === 'usdt' ? 'verify-usdt-payment' : 'verify-crypto-payment';

    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ action: verifyRoute, intentId, clicks: numericRecharge })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tr('bank_msg_deposit_ok', 'Liquidación de ${amount} acreditada en Bóveda.', { amount: numericRecharge }), { id: tid });
        if (data.deposit_balance !== undefined) {
          setUserData((prev) => ({ ...prev, deposit_balance: data.deposit_balance }));
        }
        setCheckoutView(false);
        setTempWallet('');
        setIntentId(null);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      toast.error(e.message || tr('bank_err_not_detected', 'Confirmaciones pendientes.'), { id: tid, duration: 6000 });
    }
  };

  const cancelCheckout = () => {
    setCheckoutView(false);
    setIntentId(null);
    setTempWallet('');
  };

  const walletIsLocked = !!userData?.saved_wallet;
  const reqMet = reqs.referrals >= 5 || reqs.ads >= 5;

  return (
    <div style={styles.container} className="fade-in">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#141D26',
            color: '#F3F4F6',
            border: goldBorder
          }
        }}
      />

      <h2 style={styles.title}>{tr('bank_title', 'Tesorería Digital')}</h2>

      {/* Balances duales simétricos arriba */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={styles.dualCard}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {tr('bank_gem_sack', 'SALDO GANADO ($TGM)')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#F3F4F6', margin: '6px 0 3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatTgmDisplay(tgmBalance)} $TGM
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>
            {tr('bank_withdrawable', 'Fondo Retirable')}
          </div>
        </div>

        <div style={styles.dualCard}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {tr('bank_vault_usdt', 'FONDOS DE CAMPAÑA')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#F3F4F6', margin: '6px 0 3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatVaultDisplay(creditVault)}
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>
            {tr('bank_only_ads', 'Créditos Publicitarios')}
          </div>
        </div>
      </div>

      {/* Barra compacta de Auditoría Pública */}
      <div
        style={{
          ...styles.card,
          padding: '12px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: '700' }}>
            {tr('bank_live_title', 'Auditoría Pública')}
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
            {tr('bank_live_desc', 'Registro de retiros procesados')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => WebApp.openTelegramLink('https://t.me/PagosEnCrypto')}
          style={{
            background: '#0E151C',
            color: '#F3F4F6',
            border: goldBorder,
            borderRadius: '10px',
            padding: '8px 12px',
            fontWeight: '700',
            fontSize: '11px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
          }}
        >
          {tr('bank_live_btn', 'VER CANAL')}
        </button>
      </div>

      {/* Interruptor de pestañas */}
      <div style={styles.tabContainer}>
        <button type="button" onClick={() => setActiveTab('withdraw')} style={styles.tabBtn(activeTab === 'withdraw')}>
          {tr('bank_tab_withdraw', 'SOLICITAR RETIRO')}
        </button>
        <button type="button" onClick={() => setActiveTab('deposit')} style={styles.tabBtn(activeTab === 'deposit')}>
          {tr('bank_tab_deposit', 'INYECTAR CRÉDITOS')}
        </button>
      </div>

      {/* 1. VISTA SOLICITAR RETIRO */}
      {activeTab === 'withdraw' && (
        <div className="fade-in" style={styles.card}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#F3F4F6', fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px' }}>
              {tr('bank_wd_title', 'EXTRACCIÓN DE ACTIVOS')}
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              {tr('bank_wd_min', 'Umbral operativo: {min} $TGM', { min: minWithdrawalTGM == null ? '…' : minWithdrawalTGM })}
            </div>
          </div>

          <label style={styles.label}>{tr('bank_wd_address_label', 'Billetera TON Destino')}</label>
          <input
            style={{
              ...styles.input,
              background: walletIsLocked ? 'rgba(14, 21, 28, 0.75)' : '#0E151C',
              color: walletIsLocked ? '#94A3B8' : '#F3F4F6'
            }}
            placeholder={tr('bank_wd_address_placeholder', 'UQDgJUo4Ycvd9Q...')}
            value={withdrawAddress}
            onChange={(e) => !walletIsLocked && setWithdrawAddress(e.target.value)}
            disabled={walletIsLocked}
          />
          {walletIsLocked && (
            <div style={{ color: '#D4AF7A', fontSize: '11px', fontWeight: '600', marginTop: '-8px', marginBottom: '14px' }}>
              {tr('bank_wd_locked', 'Dirección bloqueada por seguridad. Contacta a soporte para cambios.')}
            </div>
          )}

          <label style={styles.label}>{tr('bank_wd_amount_label', 'Monto a liquidar ($TGM)')}</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              type="text"
              inputMode="decimal"
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              placeholder={minWithdrawalTGM == null ? '' : String(minWithdrawalTGM)}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value.replace(',', '.'))}
            />
            <button
              type="button"
              onClick={() => setWithdrawAmount(String(tgmBalance))}
              style={{
                background: '#0E151C',
                border: goldBorder,
                color: '#E2C290',
                borderRadius: '12px',
                padding: '0 16px',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {tr('bank_btn_max', 'MÁX')}
            </button>
          </div>

          <div
            style={{
              background: '#0E151C',
              border: goldBorder,
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '18px'
            }}
          >
            <h4 style={{ color: '#F3F4F6', margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
              {tr('bank_req_title', 'Control de Seguridad (Elige uno)')}
            </h4>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#F3F4F6', fontWeight: '600', marginBottom: '6px' }}>
                <div>
                  <div>{tr('bank_req_opt1', 'Opción 1: Reclutar Referidos')}</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>{tr('bank_req_opt1_desc', '(Deben ser usuarios activos)')}</div>
                </div>
                <span style={{ color: reqs.referrals >= 5 ? '#E2C290' : '#94A3B8', fontWeight: '800' }}>
                  {reqs.referrals} / 5
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min((reqs.referrals / 5) * 100, 100)}%`,
                    height: '100%',
                    background: champagneGrad
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#F3F4F6', fontWeight: '600', marginBottom: '6px' }}>
                <span>{tr('bank_req_opt2', 'Opción 2: Tareas de Red (Diarias)')}</span>
                <span style={{ color: reqs.ads >= 5 ? '#E2C290' : '#94A3B8', fontWeight: '800' }}>
                  {reqs.ads} / 5
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
                <div
                  style={{
                    width: `${Math.min((reqs.ads / 5) * 100, 100)}%`,
                    height: '100%',
                    background: champagneGrad
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleWatchProgressAd}
                disabled={playingAd || reqMet}
                style={{
                  width: '100%',
                  background: '#141D26',
                  color: '#F3F4F6',
                  border: goldBorder,
                  borderRadius: '11px',
                  padding: '10px',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: reqMet ? 'not-allowed' : 'pointer',
                  opacity: reqMet ? 0.45 : 1
                }}
              >
                {playingAd ? tr('bank_req_btn_loading', 'CONECTANDO...') : tr('bank_req_btn_watch', 'EJECUTAR MISIÓN DE RED')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            style={{ ...styles.champagneBtn, opacity: !reqMet ? 0.5 : 1 }}
          >
            {isWithdrawing ? tr('bank_btn_processing', 'PROCESANDO...') : tr('bank_btn_withdraw', 'AUTORIZAR RETIRO')}
          </button>
        </div>
      )}

      {/* 2. VISTA INYECTAR CRÉDITOS */}
      {activeTab === 'deposit' && (
        <div className="fade-in" style={styles.card}>
          {checkoutView ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#F3F4F6', textTransform: 'uppercase' }}>
                  {tr('bank_dp_secure_title', 'Pasarela de Liquidez')}
                </h3>
                <button
                  type="button"
                  onClick={cancelCheckout}
                  style={{ background: '#0E151C', border: goldBorder, borderRadius: '9px', width: '30px', height: '30px', color: '#94A3B8', fontWeight: '800', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {rechargeMethod === 'gram' ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
                      {tr('bank_dp_send_exact', 'Cotización TON: ${price}', { price: liveGramUsd })}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#E2C290', margin: '6px 0' }}>
                      {gramRechargePrice} GRAM
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {tr('bank_dp_to_generated', 'Dirección inteligente de contrato:')}
                    </div>
                  </div>
                  <div style={{ background: '#0E151C', padding: '14px', borderRadius: '12px', border: goldBorder, wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px', color: '#F3F4F6' }}>
                    {tempWallet}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <button type="button" onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '12px', background: '#0E151C', color: '#F3F4F6', border: goldBorder, borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      {tr('bank_btn_copy', 'COPIAR')}
                    </button>
                    <button type="button" onClick={openTonkeeper} style={{ ...styles.champagneBtn, flex: 1, padding: '12px' }}>
                      {tr('bank_btn_tonkeeper', 'TONKEEPER')}
                    </button>
                  </div>
                  <button type="button" onClick={handleVerifyPayment} style={{ width: '100%', padding: '13px', background: '#0E151C', color: '#F3F4F6', border: goldBorder, borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>
                    {tr('bank_btn_verify', 'VERIFICAR TRANSACCIÓN')}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
                      {tr('bank_dp_send_bsc', 'Red (BSC / BEP20)')}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#E2C290', margin: '6px 0' }}>
                      ${numericRecharge.toFixed(2)} USDT
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {tr('bank_dp_to_derived', 'Dirección de Bóveda Asignada:')}
                    </div>
                  </div>
                  <div style={{ background: '#0E151C', padding: '14px', borderRadius: '12px', border: goldBorder, wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', marginBottom: '14px', color: '#F3F4F6' }}>
                    {tempWallet}
                  </div>
                  <button type="button" onClick={() => copyWallet(tempWallet)} style={{ width: '100%', padding: '12px', background: '#0E151C', color: '#F3F4F6', border: goldBorder, borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', marginBottom: '14px' }}>
                    {tr('bank_btn_copy', 'COPIAR')}
                  </button>
                  <button type="button" onClick={handleVerifyPayment} disabled={isGenerating} style={styles.champagneBtn}>
                    {isGenerating ? tr('bank_btn_verifying', 'VERIFICANDO...') : tr('bank_btn_verify_block', 'CONFIRMAR DEPÓSITO')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              <div style={{ background: '#0E151C', border: goldBorder, borderRadius: '14px', padding: '14px', marginBottom: '18px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#E2C290', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {tr('bank_promo_title', 'Inyección de Capital')}
                </h4>
                <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0, lineHeight: '1.45' }}>
                  {tr('bank_promo_desc', 'Añade liquidez para fondear tus campañas de tráfico masivo y atraer miles de usuarios.')}{' '}
                  <strong style={{ color: '#F3F4F6' }}>{tr('bank_promo_highlight', '¡Sin límites de crecimiento!')}</strong>
                </p>
              </div>

              <h3 style={{ margin: '0 0 12px 0', color: '#F3F4F6', fontSize: '14px', fontWeight: '800' }}>
                {tr('bank_dp_title', 'Monto a Inyectar (USDT)')}
              </h3>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRechargeAmount((p) => Math.max(0.5, Number((Number(p) - 1).toFixed(2))))}
                  style={{ width: '44px', background: '#0E151C', color: '#E2C290', border: goldBorder, borderRadius: '12px', fontWeight: '900', fontSize: '18px', cursor: 'pointer' }}
                >
                  -
                </button>

                <input
                  type="text"
                  inputMode="decimal"
                  style={{ ...styles.input, marginBottom: 0, textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#E2C290' }}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value.replace(',', '.'))}
                />

                <button
                  type="button"
                  onClick={() => setRechargeAmount((p) => Number((Number(p) + 1).toFixed(2)))}
                  style={{ width: '44px', background: '#0E151C', color: '#E2C290', border: goldBorder, borderRadius: '12px', fontWeight: '900', fontSize: '18px', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {[10, 25, 50, 100].map((preset) => {
                  const active = numericRecharge === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRechargeAmount(preset)}
                      style={{
                        padding: '10px 4px',
                        background: active ? champagneGrad : '#0E151C',
                        border: goldBorder,
                        color: active ? '#0E151C' : '#F3F4F6',
                        borderRadius: '10px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ${preset}
                    </button>
                  );
                })}
              </div>

              <label style={styles.label}>{tr('bank_dp_method_label', 'Red de Liquidación')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => setRechargeMethod('gram')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border: goldBorder,
                    background: rechargeMethod === 'gram' ? champagneGrad : '#0E151C',
                    color: rechargeMethod === 'gram' ? '#0E151C' : '#94A3B8',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {tr('bank_dp_method_gram', 'GRAM (TON)')}
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeMethod('usdt')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border: goldBorder,
                    background: rechargeMethod === 'usdt' ? champagneGrad : '#0E151C',
                    color: rechargeMethod === 'usdt' ? '#0E151C' : '#94A3B8',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {tr('bank_dp_method_usdt', 'USDT (BEP20)')}
                </button>
              </div>

              <button type="button" onClick={handleStartRecharge} disabled={isGenerating} style={styles.champagneBtn}>
                {isGenerating ? tr('bank_btn_connecting', 'INICIALIZANDO CONTRATO...') : tr('bank_btn_proceed', 'GENERAR CONTRATO DE PAGO')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
