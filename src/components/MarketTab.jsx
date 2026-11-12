import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const modernStyles = {
  container: { color: '#F3F4F6', paddingBottom: '20px' },
  title: {
    fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase',
    margin: '10px 0 16px 0', color: '#06B6D4'
  },
  card: {
    background: 'linear-gradient(145deg, #171923, #11131a)',
    border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '24px', padding: '20px', marginBottom: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)'
  },
  btnPrimary: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '13px',
    cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s'
  },
  btnDanger: {
    width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', fontWeight: '800', fontSize: '13px', 
    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s'
  }
};

export default function MarketTab({ t }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-market-contracts' }) // El backend extrae el ID directamente de la firma HMAC
      });
      const data = await res.json();
      if (data.success) setContracts(data.contracts || []);
    } catch (e) {
      toast.error("Error al sincronizar contratos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleApprove = async (contractId, text) => {
    setProcessing(contractId);
    const tid = toast.loading("Autorizando y ejecutando smart-contract...");
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'approve-marketplace-ad', contract_id: contractId, text: text, duration_hours: 24 })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Ejecución exitosa", { id: tid });
        fetchContracts();
      } else {
        toast.error(data.error || "Fallo en ejecución", { id: tid });
      }
    } catch (e) {
      toast.error("Error de conexión a la red", { id: tid });
    } finally {
      setProcessing(null);
    }
  };

  const pendingContracts = contracts.filter(c => c.status === 'pending');
  const activeContracts = contracts.filter(c => c.status === 'active');

  return (
    <div style={modernStyles.container} className="fade-in">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <h2 style={modernStyles.title}>Sistema Escrow</h2>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#9CA3AF', marginBottom: '24px', fontWeight: '500', lineHeight: '1.5' }}>
        Autoriza las campañas publicitarias para tu canal. Los fondos se mantienen seguros en Escrow y se liberan automáticamente en 24 horas.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#06B6D4', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solicitudes Pendientes</h3>
        <button onClick={fetchContracts} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontWeight: 'bold', cursor: 'pointer', padding: '4px' }}>🔄</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#06B6D4', fontWeight: '800', padding: '40px', fontSize: '13px', letterSpacing: '1px' }}>Sincronizando red...</div>
      ) : pendingContracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.8 }}>📭</div>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, fontWeight: '600' }}>Sin solicitudes en cola.</p>
        </div>
      ) : (
        pendingContracts.map(contract => (
          <div key={contract.id} style={modernStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
              <div style={{ fontWeight: '800', color: '#D1D5DB', fontSize: '13px', letterSpacing: '0.5px' }}>ID: {contract.id.split('-')[0].toUpperCase()}</div>
              <div style={{ fontWeight: '900', color: '#10B981', fontSize: '16px' }}>+${contract.price} USDT</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: '#9CA3AF', marginBottom: '18px', wordBreak: 'break-word', border: '1px solid rgba(255,255,255,0.02)' }}>
              Destino: <strong style={{ color: '#F3F4F6' }}>{contract.chat_id}</strong>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={modernStyles.btnDanger}>RECHAZAR</button>
              <button 
                onClick={() => handleApprove(contract.id, "Publicación verificada mediante Smart Contract")} 
                disabled={processing === contract.id}
                style={modernStyles.btnPrimary}
              >
                {processing === contract.id ? 'AUTORIZANDO...' : 'APROBAR (24H)'}
              </button>
            </div>
          </div>
        ))
      )}

      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#F59E0B', margin: '32px 0 16px 0', padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contratos Activos (Locked)</h3>
      {activeContracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: '600' }}>Sin fondos retenidos actualmente.</p>
        </div>
      ) : (
        activeContracts.map(contract => (
          <div key={contract.id} style={{ ...modernStyles.card, borderColor: 'rgba(245, 158, 11, 0.2)', background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.05), rgba(17, 24, 39, 0.9))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '14px' }}>{contract.chat_id}</div>
              <div style={{ fontWeight: '900', color: '#F59E0B', fontSize: '15px' }}>${contract.price} USDT</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></div>
              <div style={{ fontSize: '12px', color: '#D1D5DB', fontWeight: '600' }}>Fondo retenido en Escrow</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
