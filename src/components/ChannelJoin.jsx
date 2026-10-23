import WebApp from '@twa-dev/sdk';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';

// --- ESTILOS LOCALES NEÓN PARA LA PANTALLA DE ACCESO ---
const neonJoin = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0314',
    backgroundImage: 'radial-gradient(circle at center, #2b0b47 0%, #0a0314 85%)',
    padding: '24px',
    boxSizing: 'border-box',
    color: '#ffffff',
    textAlign: 'center'
  },
  icon: {
    fontSize: '56px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.5))'
  },
  title: {
    fontSize: '26px',
    fontWeight: '900',
    color: '#00f0ff',
    textTransform: 'uppercase',
    margin: '0 0 10px 0',
    textShadow: '0 0 15px rgba(0, 240, 255, 0.5)'
  },
  subtitle: {
    fontSize: '14px',
    color: '#ff99dd',
    lineHeight: '1.5',
    marginBottom: '32px',
    fontWeight: 'bold',
    maxWidth: '340px'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))',
    border: '2px solid #8a2be2',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '16px',
    boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)'
  },
  btnJoin: {
    width: '100%',
    background: 'linear-gradient(90deg, #ff1493, #d80073)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    padding: '14px',
    fontSize: '13px',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(255, 20, 147, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  btnVerify: {
    width: '100%',
    maxWidth: '360px',
    background: 'linear-gradient(180deg, #00f0ff 0%, #0099ff 100%)',
    color: '#050214',
    border: 'none',
    borderRadius: '18px',
    padding: '16px',
    fontSize: '15px',
    fontWeight: '900',
    marginTop: '24px',
    cursor: 'pointer',
    boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};

export default function ChannelJoin({ channelStatus, setChannelStatus, userData, setMustJoin }) {

  const handleCheckChannels = async () => {
    const tid = toast.loading("Escaneando accesos...");
    try {
      const res = await botApi.checkChannels(userData.id);
      if (res.allJoined) {
        setMustJoin(false);
        toast.success("¡Acceso Concedido! Bienvenido a la red.", { id: tid });
      } else {
        setChannelStatus({ c1: res.channel1, c2: res.channel2 });
        toast.error("Aún faltan canales por unirte. Revisa la lista.", { id: tid });
      }
    } catch (e) {
      toast.error("Error de comunicación. Intenta de nuevo.", { id: tid });
    }
  };

  return (
    <div className="fade-in" style={neonJoin.wrapper}>
      
      {/* Notificaciones estilo neón adaptadas desde App.jsx */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1d0833',
            color: '#fff',
            border: '2px solid #00f0ff',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
            fontWeight: '800',
            fontSize: '13px'
          }
        }} 
      />

      <div style={neonJoin.icon}>🛡️</div>
      <h2 style={neonJoin.title}>Acceso Restringido</h2>
      <p style={neonJoin.subtitle}>
        Para activar tu cuenta y comenzar a generar tráfico, debes ser miembro de nuestras comunidades oficiales.
      </p>

      {/* TARJETA DEL GRUPO 1 */}
      {!channelStatus.c1 && (
        <div style={neonJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>📢</span>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '15px', color: '#ffffff' }}>Airdrops Crypto</p>
          </div>
          <button 
            style={neonJoin.btnJoin} 
            onClick={() => WebApp.openTelegramLink('https://t.me/AirdropsCriptoES')}
          >
            Únete al Grupo 1 ➔
          </button>
        </div>
      )}

      {/* TARJETA DEL GRUPO 2 */}
      {!channelStatus.c2 && (
        <div style={neonJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>💎</span>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '15px', color: '#ffffff' }}>Airdrops TON</p>
          </div>
          <button 
            style={neonJoin.btnJoin} 
            onClick={() => WebApp.openTelegramLink('https://t.me/TONAirdropsES')}
          >
            Únete al Grupo 2 ➔
          </button>
        </div>
      )}

      <button 
        style={neonJoin.btnVerify} 
        onClick={handleCheckChannels}
      >
        🔄 YA ME UNÍ, VERIFICAR
      </button>

    </div>
  );
}
