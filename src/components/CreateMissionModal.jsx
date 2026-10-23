import { useState } from 'react';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';

// --- ESTILOS LOCALES NEÓN PARA EL MODAL ---
const neonModal = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 2, 20, 0.85)',
    backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100000
  },
  card: {
    background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.95), rgba(20, 8, 38, 0.98))',
    border: '2px solid #00f0ff',
    borderRadius: '24px',
    width: '90%', maxWidth: '400px',
    padding: '24px 20px',
    boxShadow: '0 10px 30px rgba(0, 240, 255, 0.25)'
  },
  input: {
    width: '100%', padding: '12px 14px', background: 'rgba(15, 5, 28, 0.8)',
    border: '2px solid #8a2be2', borderRadius: '16px', color: '#ffffff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  },
  totalBox: {
    background: 'linear-gradient(90deg, #ff1493, #8a2be2)',
    padding: '14px', borderRadius: '16px', textAlign: 'center', marginTop: '12px',
    boxShadow: '0 4px 15px rgba(255, 20, 147, 0.3)', border: '1px solid rgba(255,255,255,0.2)'
  },
  btnCancel: {
    padding: '14px', background: 'rgba(255, 255, 255, 0.05)', color: '#ff99dd',
    border: '2px solid rgba(255, 65, 180, 0.4)', borderRadius: '16px', fontWeight: '900',
    fontSize: '14px', cursor: 'pointer', flex: 1
  },
  btnSubmit: {
    padding: '14px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214',
    border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase',
    cursor: 'pointer', flex: 1, boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)'
  }
};

export default function CreateMissionModal({ userData, setUserData, onClose }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [totalClicks, setTotalClicks] = useState(20); // Mínimo inicial por defecto: 20
  const [rewardPerClick, setRewardPerClick] = useState(5); // Mínimo inicial por defecto: 5
  const [loading, setLoading] = useState(false);

  const totalCost = totalClicks * rewardPerClick;

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      return toast.error("Completa todos los campos");
    }

    if (!url.startsWith("https://t.me/")) {
      return toast.error("El enlace debe comenzar con https://t.me/");
    }

    // --- RESTRICCIONES ESTRICTAS ---
    if (totalClicks < 20) {
      return toast.error("El número mínimo de usuarios es 20");
    }

    if (rewardPerClick < 5) {
      return toast.error("El pago mínimo por usuario es 5 CLICK");
    }

    if (totalCost < 100) {
      return toast.error("El costo total mínimo de la misión debe ser 100 CLICK");
    }

    if ((userData?.balance || 0) < totalCost) {
      return toast.error(`Saldo insuficiente. Necesitas ${totalCost} CLICK y tienes ${Number(userData?.balance || 0).toFixed(2)} CLICK.`);
    }

    setLoading(true);
    const tid = toast.loading("Procesando campaña...");

    try {
      const res = await botApi.createMission({
        userId: userData.id,
        title,
        url,
        totalClicks,
        rewardPerClick,
        totalCost
      });

      if (res.success) {
        toast.success("¡Campaña publicada con éxito!", { id: tid });
        // Se descuenta del balance localmente para reflejar el cambio al instante
        setUserData(prev => ({ ...prev, balance: prev.balance - totalCost }));
        onClose();
      } else {
        toast.error(res.message || "Error al crear la campaña", { id: tid });
      }
    } catch (err) {
      toast.error("Ocurrió un error inesperado de conexión", { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={neonModal.overlay}>
      <div style={neonModal.card}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>
            ➕ PROMOCIONAR ENLACE
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff1493', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900', marginBottom: '6px', display: 'block' }}>TÍTULO DE LA CAMPAÑA</label>
            <input
              type="text"
              placeholder="Ej: Únete a mi Canal Web3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={neonModal.input}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900', marginBottom: '6px', display: 'block' }}>ENLACE DE TELEGRAM</label>
            <input
              type="url"
              placeholder="https://t.me/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={neonModal.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900', marginBottom: '6px', display: 'block' }}>TRÁFICO (Mín. 20)</label>
              <input
                type="number"
                min="20"
                value={totalClicks}
                onChange={(e) => setTotalClicks(Number(e.target.value))}
                style={neonModal.input}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900', marginBottom: '6px', display: 'block' }}>PAGO (Mín. 5 CLICK)</label>
              <input
                type="number"
                min="5"
                value={rewardPerClick}
                onChange={(e) => setRewardPerClick(Number(e.target.value))}
                style={neonModal.input}
              />
            </div>
          </div>

          {/* CAJA DE TOTAL */}
          <div style={neonModal.totalBox}>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#ffffff', fontWeight: '900', textTransform: 'uppercase' }}>
              Costo de la Campaña
            </p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#ffe600', textShadow: '0 0 10px rgba(255, 230, 0, 0.5)' }}>
              {totalCost} <span style={{ fontSize: '14px', color: '#ffffff' }}>CLICK</span>
            </p>
          </div>

          {/* BOTONES */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={neonModal.btnCancel}>
              CANCELAR
            </button>
            <button type="submit" disabled={loading} style={{ ...neonModal.btnSubmit, opacity: loading ? 0.7 : 1 }}>
              {loading ? "CREANDO..." : "PUBLICAR 🚀"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
