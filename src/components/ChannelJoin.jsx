import WebApp from '@twa-dev/sdk';
import toast, { Toaster } from 'react-hot-toast';

const modernJoin = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
    backgroundImage: 'radial-gradient(circle at center, #111827 0%, #000000 100%)',
    padding: '24px',
    boxSizing: 'border-box',
    color: '#F3F4F6',
    textAlign: 'center'
  },
  icon: {
    fontSize: '56px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 4px 15px rgba(6, 182, 212, 0.4))'
  },
  title: {
    fontSize: '26px',
    fontWeight: '900',
    color: '#06B6D4',
    textTransform: 'uppercase',
    margin: '0 0 12px 0',
    letterSpacing: '1px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#9CA3AF',
    lineHeight: '1.6',
    marginBottom: '32px',
    fontWeight: '600',
    maxWidth: '340px'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)'
  },
  btnJoin: {
    width: '100%',
    background: 'rgba(6, 182, 212, 0.1)',
    color: '#06B6D4',
    border: '1px solid #06B6D4',
    borderRadius: '14px',
    padding: '14px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease'
  },
  btnVerify: {
    width: '100%',
    maxWidth: '360px',
    background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    padding: '16px',
    fontSize: '15px',
    fontWeight: '900',
    marginTop: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'transform 0.2s ease'
  }
};

export default function ChannelJoin({ channelStatus, setChannelStatus, setMustJoin }) {

  const handleCheckChannels = async () => {
    const tid = toast.loading("Verificando accesos en la red...");
    try {
      const res = await fetch('/api', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' },
        body: JSON.stringify({ action: 'verify-channels' }) // ID extraído en el backend vía HMAC
      });
      const data = await res.json();

      if (data.allJoined) {
        setMustJoin(false);
        toast.success("¡Acceso Concedido! Bienvenido a la plataforma.", { id: tid });
      } else {
        setChannelStatus({ 
           c1: data.channel1, 
           c2: data.channel2, 
           c1_url: data.c1_url, 
           c2_url: data.c2_url 
        });
        toast.error("Aún faltan canales por unirte. Revisa la lista.", { id: tid });
      }
    } catch (e) {
      toast.error("Error de conexión. Intenta de nuevo.", { id: tid });
    }
  };

  return (
    <div className="fade-in" style={modernJoin.wrapper}>

      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#111827',
            color: '#F3F4F6',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
            fontWeight: '600',
            fontSize: '13px'
          }
        }} 
      />

      <div style={modernJoin.icon}>🛡️</div>
      <h2 style={modernJoin.title}>Acceso Restringido</h2>
      <p style={modernJoin.subtitle}>
        Para activar tu cuenta y acceder a las misiones, debes ser miembro de nuestras comunidades estratégicas oficiales.
      </p>

      {/* TARJETA DEL CANAL 1 */}
      {(channelStatus.c1_url && !channelStatus.c1) && (
        <div style={modernJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '22px' }}>📢</span>
            <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#F9FAFB', letterSpacing: '0.5px' }}>Red Primaria</p>
          </div>
          <button 
            style={modernJoin.btnJoin} 
            onClick={() => WebApp.openTelegramLink(channelStatus.c1_url)}
          >
            INGRESAR AL CANAL ➔
          </button>
        </div>
      )}

      {/* TARJETA DEL CANAL 2 */}
      {(channelStatus.c2_url && !channelStatus.c2) && (
        <div style={modernJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '22px' }}>💎</span>
            <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#F9FAFB', letterSpacing: '0.5px' }}>Alianza Estratégica</p>
          </div>
          <button 
            style={modernJoin.btnJoin} 
            onClick={() => WebApp.openTelegramLink(channelStatus.c2_url)}
          >
            INGRESAR AL CANAL ➔
          </button>
        </div>
      )}

      <button 
        style={modernJoin.btnVerify} 
        onClick={handleCheckChannels}
      >
        🔄 YA ME UNÍ, CONTINUAR
      </button>

    </div>
  );
}
