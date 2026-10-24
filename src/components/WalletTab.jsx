import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neonStyles = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: {
    fontSize: '24px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase',
    margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
  },
  balanceCard: {
    background: 'linear-gradient(135deg, rgba(20, 8, 38, 0.9), rgba(46, 16, 77, 0.9))',
    border: '2px solid #ff1493', borderRadius: '24px', padding: '24px', marginBottom: '20px',
    textAlign: 'center', boxShadow: '0 8px 25px rgba(255, 20, 147, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.1)',
    position: 'relative', overflow: 'hidden'
  },
  card: {
    background: 'rgba(15, 5, 28, 0.8)', border: '1px solid #8a2be2', borderRadius: '20px', 
    padding: '20px', marginBottom: '16px', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.15)'
  },
  btnPrimary: {
    width: '100%', padding: '16px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)',
    color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.3)'
  },
  btnPink: {
    width: '100%', padding: '16px', background: 'linear-gradient(90deg, #ff1493, #d80073)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.3)'
  },
  input: {
    width: '100%', background: 'rgba(0, 0, 0, 0.4)', border: '2px solid #8a2be2', borderRadius: '14px',
    padding: '16px', fontSize: '16px', color: '#ffffff', outline: 'none', boxSizing: 'border-box',
    marginBottom: '16px', fontWeight: 'bold'
  },
  label: {
    fontSize: '12px', color: '#ff99dd', fontWeight: '900', display: 'block', marginBottom: '8px', textTransform: 'uppercase'
  },
  tabContainer: {
    display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '20px'
  },
  tabBtn: (active, isDeposit) => ({
    flex: 1, padding: '14px', borderRadius: '14px', fontWeight: '900', fontSize: '14px', border: 'none', cursor: 'pointer', transition: '0.3s',
    background: active ? (isDeposit ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'linear-gradient(90deg, #ff1493, #d80073)') : 'transparent',
    color: active ? (isDeposit ? '#050214' : '#ffffff') : (isDeposit ? '#00f0ff' : '#ff99dd'),
    boxShadow: active ? (isDeposit ? '0 4px 15px rgba(0,240,255,0.3)' : '0 4px 15px rgba(255,20,147,0.3)') : 'none'
  })
};

export default function WalletTab({ userData, setUserData, t }) {
  const [activeTab, setActiveTab] = useState('withdraw'); // 'deposit' | 'withdraw'

  // Estados para Retiros
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Estados para Depósitos (Simulación de paquetes)
  const [depositAmount, setDepositAmount] = useState('10');
  const [isDepositing, setIsDepositing] = useState(false);

  const balance = Number(userData?.balance || 0);
  const totalEarnings = Number(userData?.total_earnings || 0);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const handleWithdraw = async () => {
    if (!withdrawAddress.trim()) return toast.error("Ingresa tu billetera TON.");
    if (withdrawAddress.length < 20) return toast.error("Billetera TON inválida.");

    const amount = Number(withdrawAmount);
    // 🔥 CAMBIO APLICADO: Mínimo 0.2 USDT
    if (!amount || amount < 0.2) return toast.error("El retiro mínimo es de 0.2 USDT.");
    if (amount > balance) return toast.error("Saldo insuficiente.");

    setIsWithdrawing(true);
    const tid = toast.loading("Procesando retiro...");

    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ 
          action: 'request-withdrawal', 
          userId: userData.id, 
          address: withdrawAddress, 
          amount: amount 
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "¡Retiro en proceso! Llegará pronto.", { id: tid });
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        setWithdrawAddress('');
        setWithdrawAmount('');
      } else {
        toast.error(data.error || "Error al solicitar retiro.", { id: tid });
      }
    } catch (err) {
      toast.error("Error de conexión.", { id: tid });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = () => {
    toast.error("El módulo de depósitos se activará en la Fase 2.");
  };

  return (
    <div style={neonStyles.container} className="fade-in">
      <Toaster position="top-center" />
      <h2 style={neonStyles.title}>Billetera</h2>

      <div style={neonStyles.balanceCard}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.1 }}>💎</div>
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff99dd', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Disponible</div>
        <div style={{ fontSize: '42px', fontWeight: '900', color: '#ffffff', margin: '10px 0', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
          {balance.toFixed(4)} <span style={{ fontSize: '20px', color: '#00f0ff' }}>USDT</span>
        </div>
        <div style={{ fontSize: '12px', color: '#00ffaa', fontWeight: 'bold' }}>
          Ganancias Históricas: {totalEarnings.toFixed(4)} USDT
        </div>
      </div>

      <div style={neonStyles.tabContainer}>
        <button onClick={() => setActiveTab('withdraw')} style={neonStyles.tabBtn(activeTab === 'withdraw', false)}>
          RETIRAR
        </button>
        <button onClick={() => setActiveTab('deposit')} style={neonStyles.tabBtn(activeTab === 'deposit', true)}>
          DEPOSITAR
        </button>
      </div>

      {activeTab === 'withdraw' && (
        <div className="fade-in" style={neonStyles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px' }}>📤</div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '900' }}>Retirar a TON</h3>
              {/* 🔥 CAMBIO APLICADO: Texto a 0.2 USDT */}
              <div style={{ fontSize: '12px', color: '#aaa' }}>Mínimo de retiro: 0.2 USDT</div>
            </div>
          </div>

          <label style={neonStyles.label}>Tu Dirección de Billetera (TON)</label>
          <input 
            style={neonStyles.input} 
            placeholder="Ej: UQDgJUo4Ycvd9Q_ICUI6..." 
            value={withdrawAddress} 
            onChange={(e) => setWithdrawAddress(e.target.value)} 
          />

          <label style={neonStyles.label}>Cantidad a retirar (USDT)</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input 
              type="number" 
              style={{ ...neonStyles.input, marginBottom: 0 }} 
              placeholder="0.00" 
              value={withdrawAmount} 
              onChange={(e) => setWithdrawAmount(e.target.value)} 
            />
            <button 
              onClick={() => setWithdrawAmount(balance.toString())}
              style={{ background: 'rgba(255, 20, 147, 0.2)', border: '1px solid #ff1493', color: '#ff99dd', borderRadius: '14px', padding: '0 20px', fontWeight: '900', cursor: 'pointer' }}
            >
              MÁX
            </button>
          </div>

          <button onClick={handleWithdraw} disabled={isWithdrawing} style={neonStyles.btnPink}>
            {isWithdrawing ? 'PROCESANDO...' : 'SOLICITAR RETIRO'}
          </button>
        </div>
      )}

      {activeTab === 'deposit' && (
        <div className="fade-in" style={{ ...neonStyles.card, borderColor: '#00f0ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px' }}>📥</div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '900' }}>Recargar Saldo</h3>
              <div style={{ fontSize: '12px', color: '#aaa' }}>Para crear campañas publicitarias</div>
            </div>
          </div>

          <label style={{...neonStyles.label, color: '#00f0ff'}}>Cantidad a Depositar (USDT)</label>
          <input 
            type="number" 
            style={{ ...neonStyles.input, borderColor: '#00f0ff' }} 
            placeholder="10" 
            value={depositAmount} 
            onChange={(e) => setDepositAmount(e.target.value)} 
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button onClick={() => setDepositAmount('5')} style={{ flex: 1, padding: '10px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+5</button>
            <button onClick={() => setDepositAmount('20')} style={{ flex: 1, padding: '10px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+20</button>
            <button onClick={() => setDepositAmount('50')} style={{ flex: 1, padding: '10px', background: 'rgba(0,240,255,0.1)', border: '1px solid #00f0ff', color: '#00f0ff', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+50</button>
          </div>

          <button onClick={handleDeposit} disabled={isDepositing} style={neonStyles.btnCyan}>
            PAGAR CON TONKEEPER
          </button>
        </div>
      )}
    </div>
  );
}
