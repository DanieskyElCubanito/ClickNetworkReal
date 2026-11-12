import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const modernStyles = {
  container: { color: '#F3F4F6', paddingBottom: '20px' },
  title: { fontSize: '20px', fontWeight: '800', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '10px 0 24px 0', color: '#06B6D4' },
  
  balanceCard: { background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.05), rgba(17, 24, 39, 0.9))', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '24px', padding: '24px', marginBottom: '16px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)' },
  vaultCard: { background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.05), rgba(17, 24, 39, 0.9))', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '24px', padding: '24px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)' },
  
  card: { background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(10px)' },
  
  btnPrimary: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)', textTransform: 'uppercase', transition: 'transform 0.2s' },
  btnWarning: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', textTransform: 'uppercase', transition: 'transform 0.2s' },
  
  input: { width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '16px', fontSize: '14px', color: '#F3F4F6', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', fontWeight: '600', transition: 'border 0.3s' },
  label: { fontSize: '11px', color: '#9CA3AF', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' },
  
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' },
  tabBtn: (active, isDeposit) => ({ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: active ? (isDeposit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') : 'transparent', color: active ? (isDeposit ? '#10B981' : '#F59E0B') : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' })
};

export default function WalletTab({ userData, setUserData, t }) {
  const [activeTab, setActiveTab] = useState('withdraw'); 
  const [withdrawAddress, setWithdrawAddress] = useState(userData?.saved_wallet || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mínimo de Retiro
  const [minWithdrawalGemas, setMinWithdrawalGemas] = useState(50);

  const [reqs, setReqs] = useState({ referrals: 0, ads: 0 });
  const [playingAd, setPlayingAd] = useState(false);

  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [rechargeMethod, setRechargeMethod] = useState('gram');
  const [checkoutView, setCheckoutView] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempWallet, setTempWallet] = useState('');
  const [intentId, setIntentId] = useState(null);
  const [liveGramUsd, setLiveGramUsd] = useState(5.00);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    if (!window.showGiga) {
      const script = document.createElement("script");
      script.src = "https://ad.gigapub.tech/script?id=8567";
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
            setReqs({ referrals: data.referrals, ads: data.ads });
            if (data.saved_wallet) setWithdrawAddress(data.saved_wallet);
            if (data.min_withdrawal) {
                setMinWithdrawalGemas(Math.round(Number(data.min_withdrawal) * 1000));
            }
        }
      } catch (e) {
        console.error("Error cargando requisitos", e);
      }
    };
    if (activeTab === 'withdraw') {
      fetchReqs();
    }
    return () => { isMounted = false; };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    const fetchTonPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
        const data = await res.json();
        if (isMounted && data && data['the-open-network']?.usd) {
          setLiveGramUsd(data['the-open-network'].usd);
        }
      } catch (e) {
        if(isMounted) setLiveGramUsd(5.00);
      }
    };
    fetchTonPrice();
    return () => { isMounted = false; };
  }, []);

  const balanceUSDT = Number(userData?.balance || 0);
  const gemBalance = Number((Number(balanceUSDT) * 1000).toFixed(2));
  const depositBalanceUsdt = Number(userData?.deposit_balance || 0);

  const numericRecharge = Number(rechargeAmount) || 0;
  const gramRechargePrice = (numericRecharge / liveGramUsd).toFixed(2);

  const handleWatchProgressAd = () => {
    if (!window.showGiga) return toast.error("Conexión de red inestable.");
    setPlayingAd(true);

    window.showGiga()
      .then(async () => {
        try {
          const res = await fetch('/api', { 
            method: 'POST', 
            headers: apiHeaders, 
            body: JSON.stringify({ action: 'watch-ad-progress' }) 
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Misión de red validada (Sin recompensa extra)");
            setReqs(prev => ({ ...prev, ads: typeof data.ads === "number" ? data.ads : Math.min(prev.ads + 1, 5) }));
          } else {
            toast.error(data.error || "Fallo al procesar validación.");
          }
        } catch (err) {
          toast.error("Error de conexión.");
        } finally {
          setPlayingAd(false);
        }
      })
      .catch(() => {
        toast.error("Transmisión cancelada.");
        setPlayingAd(false);
      });
  };

  const handleWithdraw = async () => {
    if (!withdrawAddress.trim()) return toast.error(t('bank_err_wallet_empty') || "Ingresa tu billetera TON.");
    if (withdrawAddress.length < 20) return toast.error(t('bank_err_wallet_invalid') || "Billetera TON inválida.");

    const gemasAmount = Number(withdrawAmount);
    if (!gemasAmount || gemasAmount < minWithdrawalGemas) return toast.error(t('bank_err_min_withdraw') || `El retiro mínimo es de ${minWithdrawalGemas} Gemas.`);
    if (gemasAmount > gemBalance) return toast.error(t('bank_err_insufficient') || "Capital insuficiente.");

    if (reqs.referrals < 5 && reqs.ads < 5) {
      return toast.error(t('bank_req_error') || "Debes cumplir uno de los requisitos (5 Referidos o 5 Misiones de red).");
    }

    setIsWithdrawing(true);
    const tid = toast.loading(t('bank_msg_processing') || "Autorizando transacción...");
    const usdtAmount = gemasAmount / 1000;

    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'request-withdrawal', address: withdrawAddress, amount: usdtAmount })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || t('bank_msg_success') || "Retiro en proceso de liquidación.", { id: tid, duration: 4000 });
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance, saved_wallet: withdrawAddress }));
        setWithdrawAmount('');
      } else {
        toast.error(data.error || t('bank_msg_error') || "Fallo en transacción.", { id: tid, duration: 4000 });
      }
    } catch (err) {
      toast.error(t('bank_msg_conn_error') || "Error de red.", { id: tid });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleStartRecharge = async () => {
    if (numericRecharge <= 0) return toast.error(t('bank_err_amount') || "Monto inválido.");
    setIsGenerating(true);
    const tid = toast.loading(t('bank_msg_generating') || "Configurando pasarela...");

    try {
      const actionRoute = rechargeMethod === 'usdt' ? 'generate-usdt-wallet' : 'generate-payment-wallet';
      const amountToSend = rechargeMethod === 'usdt' ? numericRecharge : gramRechargePrice;

      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: actionRoute, packageId: 0, price: amountToSend, clicks: numericRecharge })
      });
      const data = await res.json();

      if (data.success && data.wallet) { 
        setTempWallet(data.wallet); 
        setIntentId(data.intentId); 
        toast.dismiss(tid); 
        setCheckoutView(true); 
      } else {
        throw new Error(data.error || t('bank_err_server_wallet') || "Fallo al generar contrato.");
      }
    } catch (e) { 
      toast.error(e.message || t('bank_err_gateway') || "Servidor inaccesible.", { id: tid, duration: 5000 }); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const copyWallet = (wallet) => { navigator.clipboard.writeText(wallet); toast.success(t('bank_msg_copied') || "Copiado exitosamente."); };
  const openTonkeeper = () => { try { WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor(gramRechargePrice * 1e9)}`); } catch (e) { toast.error(t('bank_err_not_installed') || "App no detectada."); } };

  const handleVerifyPayment = async () => {
    const tid = toast.loading(t('bank_msg_verifying') || "Auditando blockchain...");
    const verifyRoute = rechargeMethod === 'usdt' ? 'verify-usdt-payment' : 'verify-crypto-payment';

    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: verifyRoute, intentId: intentId, clicks: numericRecharge })
      });
      const data = await res.json();
      if (data.success) { 
        toast.success(t('bank_msg_deposit_ok')?.replace('{amount}', numericRecharge) || `Liquidación de $${numericRecharge} acreditada en Bóveda.`, { id: tid }); 
        if (data.deposit_balance !== undefined) setUserData(prev => ({ ...prev, deposit_balance: data.deposit_balance }));
        setCheckoutView(false); setTempWallet(''); setIntentId(null);
      }
      else throw new Error(data.error);
    } catch (e) { toast.error(e.message || t('bank_err_not_detected') || "Confirmaciones pendientes.", { id: tid, duration: 6000 }); }
  };

  const cancelCheckout = () => { setCheckoutView(false); setIntentId(null); setTempWallet(''); };

  const walletIsLocked = !!userData?.saved_wallet;

  return (
    <div style={modernStyles.container} className="fade-in">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <h2 style={modernStyles.title}>{t('bank_title') || "Tesorería Digital"}</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ ...modernStyles.balanceCard, flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('bank_gem_sack') || "Inventario (Gemas)"}</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#F9FAFB', margin: '8px 0' }}>{gemBalance}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '700' }}>{t('bank_withdrawable') || "Fondo Retirable"}</div>
        </div>

        <div style={{ ...modernStyles.vaultCard, flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('bank_vault_usdt') || "Bóveda (USDT)"}</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#F9FAFB', margin: '8px 0' }}>${depositBalanceUsdt.toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '700' }}>{t('bank_only_ads') || "Capital Publicitario"}</div>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(6, 182, 212, 0.05)', border: '1px dashed rgba(6, 182, 212, 0.3)', borderRadius: '20px', 
        padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ color: '#F9FAFB', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>{t('bank_live_title') || "📊 Auditoría Pública"}</div>
          <div style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: '500', marginTop: '4px' }}>{t('bank_live_desc') || "Registro de retiros procesados"}</div>
        </div>
        <button 
          onClick={() => WebApp.openTelegramLink('https://t.me/PagosEnCrypto')} 
          style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '10px 16px', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('bank_live_btn') || "VER CANAL"}
        </button>
      </div>

      <div style={modernStyles.tabContainer}>
        <button onClick={() => setActiveTab('withdraw')} style={modernStyles.tabBtn(activeTab === 'withdraw', false)}>
          {t('bank_tab_withdraw') || "SOLICITAR RETIRO"}
        </button>
        <button onClick={() => setActiveTab('deposit')} style={modernStyles.tabBtn(activeTab === 'deposit', true)}>
          {t('bank_tab_deposit') || "INYECTAR CAPITAL"}
        </button>
      </div>

      {activeTab === 'withdraw' && (
        <div className="fade-in" style={{...modernStyles.card, borderColor: 'rgba(245, 158, 11, 0.3)'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' }}>{t('bank_wd_title') || "EXTRACCIÓN DE ACTIVOS"}</h3>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{t('bank_wd_min') || `Umbral operativo: ${minWithdrawalGemas} Gemas`}</div>
            </div>
          </div>

          <label style={{...modernStyles.label, color: '#F59E0B'}}>{t('bank_wd_address_label') || "Billetera TON Destino"}</label>
          <input 
            style={{
               ...modernStyles.input, 
               borderColor: walletIsLocked ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.4)', 
               background: walletIsLocked ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.02)',
               color: walletIsLocked ? '#6B7280' : '#F9FAFB',
               textAlign: 'left'
            }} 
            placeholder={t('bank_wd_address_placeholder') || "UQDgJUo4Ycvd9Q..."} 
            value={withdrawAddress} 
            onChange={(e) => !walletIsLocked && setWithdrawAddress(e.target.value)} 
            disabled={walletIsLocked}
          />
          {walletIsLocked && (
             <div style={{ color: '#F59E0B', fontSize: '10px', fontWeight: '700', marginTop: '-10px', marginBottom: '20px', textAlign: 'center' }}>
               🔒 Dirección bloqueada por seguridad. Contacta a soporte para cambios.
             </div>
          )}

          <label style={{...modernStyles.label, color: '#F59E0B'}}>{t('bank_wd_amount_label') || "Monto a liquidar (GEMAS)"}</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
            <input 
              type="text" 
              inputMode="decimal"
              style={{ ...modernStyles.input, borderColor: 'rgba(245, 158, 11, 0.4)', marginBottom: 0, textAlign: 'left' }} 
              placeholder={`${minWithdrawalGemas}`} 
              value={withdrawAmount} 
              onChange={(e) => setWithdrawAmount(e.target.value.replace(',', '.'))} 
            />
            <button 
              onClick={() => setWithdrawAmount(gemBalance.toString())}
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#F59E0B', borderRadius: '14px', padding: '0 20px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {t('bank_btn_max') || "MÁX"}
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ color: '#D1D5DB', margin: '0 0 16px 0', fontSize: '13px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>{t('bank_req_title') || "🛡️ Control de Seguridad (Elige uno)"}</h4>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', color: '#F3F4F6', fontWeight: '600', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{t('bank_req_opt1') || "Opción 1: Reclutar Referidos"}</span>
                  <span style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{t('bank_req_opt1_desc') || "(Deben ser usuarios activos)"}</span>
                </div>
                <span style={{ color: reqs.referrals >= 5 ? '#10B981' : '#9CA3AF' }}>{reqs.referrals} / 5</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <div style={{ width: `${Math.min((reqs.referrals / 5) * 100, 100)}%`, height: '100%', background: reqs.referrals >= 5 ? '#10B981' : 'rgba(245, 158, 11, 0.5)', borderRadius: '10px', transition: 'width 0.3s' }}></div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#F3F4F6', fontWeight: '600', marginBottom: '8px' }}>
                <span>{t('bank_req_opt2') || "Opción 2: Tareas de Red (Diarias)"}</span>
                <span style={{ color: reqs.ads >= 5 ? '#10B981' : '#9CA3AF' }}>{reqs.ads} / 5</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ width: `${Math.min((reqs.ads / 5) * 100, 100)}%`, height: '100%', background: reqs.ads >= 5 ? '#10B981' : 'rgba(6, 182, 212, 0.5)', borderRadius: '10px', transition: 'width 0.3s' }}></div>
              </div>
              <button 
                onClick={handleWatchProgressAd} 
                disabled={playingAd || reqs.ads >= 5 || reqs.referrals >= 5}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', fontWeight: '800', fontSize: '12px', cursor: (reqs.ads >= 5 || reqs.referrals >= 5) ? 'not-allowed' : 'pointer', opacity: (reqs.ads >= 5 || reqs.referrals >= 5) ? 0.3 : 1, transition: 'background 0.2s' }}
              >
                {playingAd ? (t('bank_req_btn_loading') || 'CONECTANDO...') : (t('bank_req_btn_watch') || 'EJECUTAR MISIÓN DE RED')}
              </button>
            </div>
          </div>

          <button onClick={handleWithdraw} disabled={isWithdrawing} style={{...modernStyles.btnWarning, opacity: (reqs.referrals < 5 && reqs.ads < 5) ? 0.4 : 1 }}>
            {isWithdrawing ? (t('bank_btn_processing') || 'PROCESANDO...') : (t('bank_btn_withdraw') || 'AUTORIZAR RETIRO')}
          </button>
        </div>
      )}

      {activeTab === 'deposit' && (
        <div className="fade-in" style={{ ...modernStyles.card, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          {checkoutView ? (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('bank_dp_secure_title') || "Pasarela de Liquidez"}</h3>
                <button onClick={cancelCheckout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', width: '32px', height: '32px', color: '#EF4444', fontWeight: '800', cursor: 'pointer' }}>X</button>
              </div>

              {rechargeMethod === 'gram' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('bank_dp_send_exact')?.replace('{price}', liveGramUsd) || `Cotización TON: $${liveGramUsd}`}</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#10B981', margin: '8px 0' }}>{gramRechargePrice} GRAM</div>
                    <div style={{ fontSize: '12px', color: '#D1D5DB' }}>{t('bank_dp_to_generated') || "Dirección inteligente de contrato:"}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(16, 185, 129, 0.4)', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', marginBottom: '24px', color: '#F3F4F6' }}>
                    {tempWallet}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>{t('bank_btn_copy') || "COPIAR"}</button>
                    <button onClick={openTonkeeper} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>{t('bank_btn_tonkeeper') || "TONKEEPER"}</button>
                  </div>
                  <button onClick={handleVerifyPayment} style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}>
                    {t('bank_btn_verify') || "VERIFICAR TRANSACCIÓN"}
                  </button>
                </>
              )}

              {rechargeMethod === 'usdt' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('bank_dp_send_bsc') || "Red (BSC / BEP20)"}</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#06B6D4', margin: '8px 0' }}>${numericRecharge.toFixed(2)} USDT</div>
                    <div style={{ fontSize: '12px', color: '#D1D5DB' }}>{t('bank_dp_to_derived') || "Dirección de Bóveda Asignada:"}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(6, 182, 212, 0.4)', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', marginBottom: '24px', color: '#F3F4F6' }}>
                    {tempWallet}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '14px', background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>{t('bank_btn_copy') || "COPIAR"}</button>
                  </div>
                  <button onClick={handleVerifyPayment} disabled={isGenerating} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                    {isGenerating ? (t('bank_btn_verifying') || 'VERIFICANDO...') : (t('bank_btn_verify_block') || 'CONFIRMAR DEPÓSITO')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="fade-in">
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#10B981', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('bank_promo_title') || '🚀 Inyección de Capital'}</h4>
                <p style={{ color: '#D1D5DB', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                  {t('bank_promo_desc') || 'Añade liquidez para fondear tus campañas de tráfico masivo y atraer miles de usuarios.'} <strong style={{color:'#ffffff'}}>{t('bank_promo_highlight') || '¡Sin límites de crecimiento!'}</strong>
                </p>
              </div>

              <h3 style={{ margin: '0 0 16px 0', color: '#F9FAFB', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' }}>{t('bank_dp_title') || "Monto a Inyectar"}</h3>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button onClick={() => setRechargeAmount(p => Math.max(0.5, Number((Number(p) - 1).toFixed(2))))} style={{ width: '48px', background: 'rgba(255,255,255,0.02)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', transition: 'background 0.2s' }}>-</button>

                <input 
                  type="text" 
                  inputMode="decimal"
                  style={{ ...modernStyles.input, marginBottom: 0, textAlign: 'center', fontSize: '20px', fontWeight: '900', color: '#10B981' }} 
                  value={rechargeAmount} 
                  onChange={(e) => setRechargeAmount(e.target.value.replace(',', '.'))} 
                />

                <button onClick={() => setRechargeAmount(p => Number((Number(p) + 1).toFixed(2)))} style={{ width: '48px', background: 'rgba(255,255,255,0.02)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', transition: 'background 0.2s' }}>+</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                <button onClick={() => setRechargeAmount(10)} style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>$10</button>
                <button onClick={() => setRechargeAmount(25)} style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>$25</button>
                <button onClick={() => setRechargeAmount(50)} style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>$50</button>
                <button onClick={() => setRechargeAmount(100)} style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>$100</button>
              </div>

              <label style={modernStyles.label}>{t('bank_dp_method_label') || "Red de Liquidación"}</label>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '24px' }}>
                <button onClick={() => setRechargeMethod('gram')} style={{ flex: 1, padding: '14px', border: 'none', background: rechargeMethod === 'gram' ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'transparent', color: rechargeMethod === 'gram' ? '#ffffff' : '#9CA3AF', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>{t('bank_dp_method_gram') || "GRAM (TON)"}</button>
                <button onClick={() => setRechargeMethod('usdt')} style={{ flex: 1, padding: '14px', borderLeft: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', borderRight: 'none', borderBottom: 'none', background: rechargeMethod === 'usdt' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent', color: rechargeMethod === 'usdt' ? '#ffffff' : '#9CA3AF', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>{t('bank_dp_method_usdt') || "USDT (BEP20)"}</button>
              </div>

              <button onClick={handleStartRecharge} disabled={isGenerating} style={{...modernStyles.btnPrimary, background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'}}>
                {isGenerating ? (t('bank_btn_connecting') || 'INICIALIZANDO CONTRATO...') : (t('bank_btn_proceed') || 'GENERAR CONTRATO DE PAGO')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
