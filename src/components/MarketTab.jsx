import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neonStyles = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: {
    fontSize: '24px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase',
    margin: '10px 0 16px 0', color: '#ff1493', textShadow: '0 0 20px rgba(255, 20, 147, 0.5)'
  },
  card: {
    background: 'linear-gradient(145deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.95))',
    border: '2px solid #ff1493', borderRadius: '20px', padding: '16px', marginBottom: '16px',
    boxShadow: '0 4px 15px rgba(255, 20, 147, 0.2)'
  },
  btnPrimary: {
    width: '100%', padding: '12px', background: 'linear-gradient(90deg, #00ffaa, #00bb77)',
    color: '#050214', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px',
    cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 255, 170, 0.3)'
  },
  btnDanger: {
    width: '100%', padding: '12px', background: 'transparent', color: '#ff1414',
    border: '2px solid #ff1414', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer'
  }
};

export default function MarketTab({ userData, t }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const fetchContracts = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-market-contracts', userId: userData.id })
      });
      const data = await res.json();
      if (data.success) setContracts(data.contracts || []);
    } catch (e) {
      toast.error("Error al cargar contratos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [userData?.id]);

  const handleApprove = async (contractId, text) => {
    setProcessing(contractId);
    const tid = toast.loading("Aprobando y publicando...");
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'approve-marketplace-ad', contract_id: contractId, text: text, duration_hours: 24 })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Publicado con éxito", { id: tid });
        fetchContracts();
      } else {
        toast.error(data.error || "Error al publicar", { id: tid });
      }
    } catch (e) {
      toast.error("Error de conexión", { id: tid });
    } finally {
      setProcessing(null);
    }
  };

  const pendingContracts = contracts.filter(c => c.status === 'pending');
  const activeContracts = contracts.filter(c => c.status === 'active');

  return (
    <div style={neonStyles.container} className="fade-in">
      <Toaster position="top-center" />
      <h2 style={neonStyles.title}>Panel de Escrow</h2>
      <p style={{ textAlign: 'center', fontSize: '12px', color: '#ff99dd', marginBottom: '20px' }}>
        Aprueba las campañas pagadas para publicarlas en tu canal. El saldo se liberará en 24 horas.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#00f0ff', margin: 0 }}>SOLICITUDES PENDIENTES</h3>
        <button onClick={fetchContracts} style={{ background: 'transparent', border: 'none', color: '#ff99dd', fontWeight: 'bold' }}>🔄</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#ff1493', fontWeight: 'bold', padding: '20px' }}>Buscando contratos...</div>
      ) : pendingContracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px dashed rgba(255,20,147,0.3)', marginBottom: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
          <p style={{ color: '#ff99dd', fontSize: '13px', margin: 0 }}>No tienes solicitudes publicitarias pendientes.</p>
        </div>
      ) : (
        pendingContracts.map(contract => (
          <div key={contract.id} style={neonStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontWeight: '900', color: '#fff', fontSize: '15px' }}>ID: {contract.id.split('-')[0]}</div>
              <div style={{ fontWeight: '900', color: '#00ffaa', fontSize: '15px' }}>+{contract.price} USDT</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', fontSize: '13px', color: '#ccc', marginBottom: '14px', wordBreak: 'break-word' }}>
              Canal destino: <strong style={{ color: '#00f0ff' }}>{contract.chat_id}</strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={neonStyles.btnDanger}>RECHAZAR</button>
              <button 
                onClick={() => handleApprove(contract.id, "Publicación desde TeleGem")} 
                disabled={processing === contract.id}
                style={neonStyles.btnPrimary}
              >
                {processing === contract.id ? 'ENVIANDO...' : 'APROBAR (24H)'}
              </button>
            </div>
          </div>
        ))
      )}

      <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#ffe600', margin: '24px 0 12px 0' }}>CONTRATOS ACTIVOS</h3>
      {activeContracts.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>No hay anuncios corriendo actualmente.</p>
      ) : (
        activeContracts.map(contract => (
          <div key={contract.id} style={{ ...neonStyles.card, borderColor: '#ffe600', opacity: 0.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>{contract.chat_id}</div>
              <div style={{ fontWeight: '900', color: '#ffe600', fontSize: '14px' }}>{contract.price} USDT</div>
            </div>
            <div style={{ fontSize: '11px', color: '#00ffaa', fontWeight: 'bold' }}>En ejecución (Fondo retenido en Escrow)</div>
          </div>
        ))
      )}
    </div>
  );
}
