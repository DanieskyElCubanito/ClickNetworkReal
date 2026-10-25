import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neonStyles = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
  balanceCard: { background: 'linear-gradient(135deg, rgba(38, 8, 8, 0.85), rgba(20, 5, 5, 0.95))', border: '2px solid #ff1414', borderRadius: '24px', padding: '20px', marginBottom: '16px', textAlign: 'center', boxShadow: '0 8px 25px rgba(255, 20, 20, 0.2)' },
  vaultCard: { background: 'linear-gradient(135deg, rgba(0, 46, 66, 0.85), rgba(5, 20, 38, 0.95))', border: '2px solid #00f0ff', borderRadius: '24px', padding: '20px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 25px rgba(0, 240, 255, 0.2)' },
  card: { background: 'rgba(15, 5, 28, 0.8)', border: '1px solid #8a2be2', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.15)' },
  btnPrimary: { width: '100%', padding: '16px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.3)', textTransform: 'uppercase' },
  btnPink: { width: '100%', padding: '16px', background: 'linear-gradient(90deg, #ff1493, #d80073)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.3)', textTransform: 'uppercase' },
  input: { width: '100%', background: 'rgba(0, 0, 0, 0.4)', border: '2px solid #8a2be2', borderRadius: '14px', padding: '14px', fontSize: '15px', color: '#ffffff', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', fontWeight: 'bold' },
  label: { fontSize: '11px', color: '#ff99dd', fontWeight: '900', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '20px' },
  tabBtn: (active, isDeposit) => ({ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.3s', background: active ? (isDeposit ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'linear-gradient(90deg, #ff1414, #8b0000)') : 'transparent', color: active ? (isDeposit ? '#050214' : '#ffffff') : (isDeposit ? '#00f0ff' : '#ff9999'), boxShadow: active ? (isDeposit ? '0 4px 15px rgba(0,240,255,0.3)' : '0 4px 15px rgba(255,20,20,0.3)') : 'none', textTransform: 'uppercase' })
};

export default function WalletTab({ userData, setUserData, t }) {
  const [activeTab, setActiveTab] = useState('withdraw'); 
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [rechargeMethod, setRechargeMethod] = useState('gram');
  const [checkoutView, setCheckoutView] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempWallet, setTempWallet] = useState('');
  const [intentId, setIntentId] = useState(null);
  const [liveGramUsd, setLiveGramUsd] = useState(5.00);

  useEffect(() => {
    const fetchTonPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
        const data = await res.json();
        if (data && data['the-open-network']?.usd) {
          setLiveGramUsd(data['the-open-network'].usd);
        }
      } catch (e) {
        setLiveGramUsd(5.00);
      }
    };
    fetchTonPrice();
  }, []);

  const balanceUSDT = Number(userData?.balance || 0);
  const gemBalance = Number((Number(balanceUSDT) * 1000).toFixed(2));
  const depositBalanceUsdt = Number(userData?.deposit_balance || 0);
  
  const numericRecharge = Number(rechargeAmount) || 0;
  const gramRechargePrice = (numericRecharge / liveGramUsd).toFixed(2);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const handleWithdraw = async () => {
    if (!withdrawAddress.trim()) return toast.error("Ingresa tu billetera TON.");
    if (withdrawAddress.length < 20) return toast.error("Billetera TON inválida.");

    const gemasAmount = Number(withdrawAmount);
    if (!gemasAmount || gemasAmount < 200) return toast.error("El retiro mínimo es de 200 Gemas.");
    if (gemasAmount > gemBalance) return toast.error("No tienes suficientes Gemas.");

    setIsWithdrawing(true);
    const tid = toast.loading("Procesando retiro...");
    const usdtAmount = gemasAmount / 1000;

    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'request-withdrawal', userId: userData.id, address: withdrawAddress, amount: usdtAmount })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Retiro en proceso.", { id: tid });
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        setWithdrawAddress(''); setWithdrawAmount('');
      } else {
        toast.error(data.error || "Error al solicitar retiro.", { id: tid });
      }
    } catch (err) {
      toast.error("Error de conexión.", { id: tid });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleStartRecharge = async () => {
    if (numericRecharge <= 0) return toast.error("Ingresa un monto válido.");
    setIsGenerating(true);
    const tid = toast.loading("Generando pasarela blockchain...");
    
    try {
      const actionRoute = rechargeMethod === 'usdt' ? 'generate-usdt-wallet' : 'generate-payment-wallet';
      const amountToSend = rechargeMethod === 'usdt' ? numericRecharge : gramRechargePrice;

      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: actionRoute, userId: userData.id, packageId: 0, price: amountToSend, clicks: numericRecharge })
      });
      const data = await res.json();
      
      if (data.success && data.wallet) { 
        setTempWallet(data.wallet); 
        setIntentId(data.intentId); 
        toast.dismiss(tid); 
        setCheckoutView(true); 
      } else {
        throw new Error(data.error || "El servidor no devolvió una billetera válida.");
      }
    } catch (e) { 
      toast.error(e.message || "Error al conectar con la pasarela.", { id: tid, duration: 5000 }); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const copyWallet = (wallet) => { navigator.clipboard.writeText(wallet); toast.success("Billetera copiada."); };
  const openTonkeeper = () => { try { WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor(gramRechargePrice * 1e9)}`); } catch (e) { toast.error("Billetera no instalada."); } };

  const handleVerifyPayment = async () => {
    const tid = toast.loading("Verificando en la blockchain...");
    const verifyRoute = rechargeMethod === 'usdt' ? 'verify-usdt-payment' : 'verify-crypto-payment';

    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: verifyRoute, userId: userData.id, intentId: intentId, clicks: numericRecharge })
      });
      const data = await res.json();
      if (data.success) { 
        toast.success(`Depósito de $${numericRecharge} acreditado en tu Bóveda.`, { id: tid }); 
        if (data.deposit_balance !== undefined) setUserData(prev => ({ ...prev, deposit_balance: data.deposit_balance }));
        setCheckoutView(false); setTempWallet(''); setIntentId(null);
      }
      else throw new Error(data.error);
    } catch (e) { toast.error(e.message || "Aún no detectamos el pago.", { id: tid, duration: 6000 }); }
  };

  const cancelCheckout = () => { setCheckoutView(false); setIntentId(null); setTempWallet(''); };

  return (
    <div style={neonStyles.container} className="fade-in">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <h2 style={neonStyles.title}>Banco Central</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ ...neonStyles.balanceCard, flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: '#ff9999', textTransform: 'uppercase' }}>Saco de Gemas</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '6px 0' }}>{gemBalance}</div>
          <div style={{ fontSize: '10px', color: '#ff9999', fontWeight: 'bold' }}>Retirable (TON)</div>
        </div>

        <div style={{ ...neonStyles.vaultCard, flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: '#00f0ff', textTransform: 'uppercase' }}>Bóveda USDT</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '6px 0' }}>${depositBalanceUsdt.toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: '#00f0ff', fontWeight: 'bold' }}>Solo Campañas</div>
        </div>
      </div>

      <div style={neonStyles.tabContainer}>
        <button onClick={() => setActiveTab('withdraw')} style={neonStyles.tabBtn(activeTab === 'withdraw', false)}>
          RETIRAR GEMAS
        </button>
        <button onClick={() => setActiveTab('deposit')} style={neonStyles.tabBtn(activeTab === 'deposit', true)}>
          RECARGAR BÓVEDA
        </button>
      </div>

      {activeTab === 'withdraw' && (
        <div className="fade-in" style={{...neonStyles.card, borderColor: '#ff1414'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '900' }}>Retirar a Billetera TON</h3>
              <div style={{ fontSize: '11px', color: '#aaa' }}>Mínimo de retiro: 200 Gemas</div>
            </div>
          </div>

          <label style={{...neonStyles.label, color: '#ff9999'}}>Billetera de Destino (Red TON)</label>
          <input 
            style={{...neonStyles.input, borderColor: '#ff1414'}} 
            placeholder="Ej: UQDgJUo4Ycvd9Q_ICUI..." 
            value={withdrawAddress} 
            onChange={(e) => setWithdrawAddress(e.target.value)} 
          />

          <label style={{...neonStyles.label, color: '#ff9999'}}>Cantidad a retirar (GEMAS)</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input 
              type="text" 
              inputMode="decimal"
              style={{ ...neonStyles.input, borderColor: '#ff1414', marginBottom: 0 }} 
              placeholder="200" 
              value={withdrawAmount} 
              onChange={(e) => setWithdrawAmount(e.target.value.replace(',', '.'))} 
            />
            <button 
              onClick={() => setWithdrawAmount(gemBalance.toString())}
              style={{ background: 'rgba(255, 20, 20, 0.2)', border: '1px solid #ff1414', color: '#ff9999', borderRadius: '14px', padding: '0 20px', fontWeight: '900', cursor: 'pointer' }}
            >
              MAX
            </button>
          </div>

          <button onClick={handleWithdraw} disabled={isWithdrawing} style={{...neonStyles.btnPink, background: 'linear-gradient(90deg, #ff1414, #8b0000)'}}>
            {isWithdrawing ? 'PROCESANDO...' : 'SOLICITAR RETIRO ➔'}
          </button>
        </div>
      )}

      {activeTab === 'deposit' && (
        <div className="fade-in" style={{ ...neonStyles.card, borderColor: '#00f0ff' }}>
          {checkoutView ? (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#00f0ff', textTransform: 'uppercase' }}>Pago Seguro Bóveda</h3>
                <button onClick={cancelCheckout} style={{ background: 'rgba(255, 65, 180, 0.2)', border: '1px solid #ff1493', borderRadius: '10px', width: '30px', height: '30px', color: '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>X</button>
              </div>

              {rechargeMethod === 'gram' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#ff99dd', textTransform: 'uppercase' }}>Envía exactamente (Precio TON en vivo: ${liveGramUsd})</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#00f0ff', margin: '6px 0' }}>{gramRechargePrice} GRAM</div>
                    <div style={{ fontSize: '11px', color: '#ffffff' }}>A tu billetera generada:</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', border: '1px dashed #ff1493', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px', color: '#ffffff' }}>
                    {tempWallet}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '12px', background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '2px solid #00f0ff', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>COPIAR</button>
                    <button onClick={openTonkeeper} style={{ flex: 1, padding: '12px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>TONKEEPER</button>
                  </div>
                  <button onClick={handleVerifyPayment} style={{ width: '100%', padding: '14px', background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}>
                    VERIFICAR PAGO
                  </button>
                </>
              )}

              {rechargeMethod === 'usdt' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#ff99dd', textTransform: 'uppercase' }}>Envía (Red BSC / BEP20)</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#00ffaa', margin: '6px 0' }}>${numericRecharge.toFixed(2)} USDT</div>
                    <div style={{ fontSize: '11px', color: '#ffffff' }}>A tu billetera derivada:</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', border: '1px dashed #00ffaa', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px', color: '#ffffff' }}>
                    {tempWallet}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '12px', background: 'rgba(0, 255, 170, 0.1)', color: '#00ffaa', border: '1px solid #00ffaa', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>COPIAR</button>
                  </div>
                  <button onClick={handleVerifyPayment} disabled={isGenerating} style={{ width: '100%', padding: '14px', background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}>
                    {isGenerating ? 'VERIFICANDO...' : 'VERIFICAR PAGO EN BLOCKCHAIN'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="fade-in">
              <h3 style={{ margin: '0 0 14px 0', color: '#fff', fontSize: '16px', fontWeight: '900' }}>Recargar Bóveda USDT</h3>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '16px' }}>Añade fondos que se usarán exclusivamente para crear campañas publicitarias.</div>

              <label style={neonStyles.label}>Monto a recargar (USDT)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button onClick={() => setRechargeAmount(p => Math.max(0.5, Number((Number(p) - 1).toFixed(2))))} style={{ width: '40px', background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid #00f0ff', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>-</button>
                
                <input 
                  type="text" 
                  inputMode="decimal"
                  style={{ ...neonStyles.input, marginBottom: 0, textAlign: 'center', fontSize: '16px' }} 
                  value={rechargeAmount} 
                  onChange={(e) => setRechargeAmount(e.target.value.replace(',', '.'))} 
                />
                
                <button onClick={() => setRechargeAmount(p => Number((Number(p) + 1).toFixed(2)))} style={{ width: '40px', background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid #00f0ff', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>+</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setRechargeAmount(1)} style={{ flex: 1, padding: '8px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>$1</button>
                <button onClick={() => setRechargeAmount(5)} style={{ flex: 1, padding: '8px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>$5</button>
                <button onClick={() => setRechargeAmount(10)} style={{ flex: 1, padding: '8px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>$10</button>
                <button onClick={() => setRechargeAmount(25)} style={{ flex: 1, padding: '8px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>$25</button>
              </div>

              <label style={neonStyles.label}>Método de Pago</label>
              <div style={{ display: 'flex', background: 'rgba(15, 5, 28, 0.8)', borderRadius: '12px', border: '1px solid #8a2be2', overflow: 'hidden', marginBottom: '20px' }}>
                <button onClick={() => setRechargeMethod('gram')} style={{ flex: 1, padding: '12px', border: 'none', background: rechargeMethod === 'gram' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: rechargeMethod === 'gram' ? '#ffffff' : '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>GRAM (TON)</button>
                <button onClick={() => setRechargeMethod('usdt')} style={{ flex: 1, padding: '12px', borderLeft: '1px solid #8a2be2', border: 'none', background: rechargeMethod === 'usdt' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: rechargeMethod === 'usdt' ? '#ffffff' : '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>USDT (BEP20)</button>
              </div>

              <button onClick={handleStartRecharge} disabled={isGenerating} style={neonStyles.btnPrimary}>
                {isGenerating ? 'CONECTANDO...' : 'PROCEDER AL PAGO'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
