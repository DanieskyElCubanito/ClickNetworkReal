import WebApp from '@twa-dev/sdk';
import toast, { Toaster } from 'react-hot-toast';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const Icons = {
  shield: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#E2C290" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  channel: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  diamond: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E2C290" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 18 3 22 9 12 21 2 9 6 3" />
      <path d="M11 3 8 9l4 12 4-12-3-6" />
      <path d="M2 9h20" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
};

const modernJoin = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1117',
    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 122, 0.08) 0%, #0E151C 72%)',
    padding: '24px',
    boxSizing: 'border-box',
    color: '#F3F4F6',
    textAlign: 'center'
  },
  iconBadge: {
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    background: slateCard,
    border: goldBorder,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.5), inset 0 1px 0 rgba(226, 194, 144, 0.16)'
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#F3F4F6',
    textTransform: 'uppercase',
    margin: '0 0 10px 0',
    letterSpacing: '0.8px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    lineHeight: '1.55',
    marginBottom: '24px',
    fontWeight: '500',
    maxWidth: '340px'
  },
  card: {
    background: slateCard,
    border: goldBorder,
    borderRadius: '18px',
    padding: '18px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '12px',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)',
    boxSizing: 'border-box'
  },
  btnJoin: {
    width: '100%',
    background: '#0E151C',
    color: '#F3F4F6',
    border: goldBorder,
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease'
  },
  btnVerify: {
    width: '100%',
    maxWidth: '360px',
    background: champagneGrad,
    color: '#0E151C',
    border: '1px solid rgba(226, 194, 144, 0.65)',
    borderRadius: '14px',
    padding: '14px 16px',
    fontSize: '13px',
    fontWeight: '900',
    marginTop: '16px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box'
  }
};

export default function ChannelJoin({ channelStatus, setChannelStatus, setMustJoin }) {
  const handleCheckChannels = async () => {
    const tid = toast.loading('Verificando accesos en la red...');
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': WebApp.initData || ''
        },
        body: JSON.stringify({ action: 'verify-channels' })
      });
      const data = await res.json();

      if (data.allJoined) {
        setMustJoin(false);
        toast.success('¡Acceso Concedido! Bienvenido a la plataforma.', { id: tid });
      } else {
        setChannelStatus({
          c1: data.channel1,
          c2: data.channel2,
          c1_url: data.c1_url,
          c2_url: data.c2_url
        });
        toast.error('Aún faltan canales por unirte. Revisa la lista.', { id: tid });
      }
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.', { id: tid });
    }
  };

  return (
    <div className="fade-in" style={modernJoin.wrapper}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#141D26',
            color: '#F3F4F6',
            border: goldBorder,
            fontWeight: '600',
            fontSize: '13px'
          }
        }}
      />

      <div style={modernJoin.iconBadge}>{Icons.shield}</div>
      <h2 style={modernJoin.title}>Acceso Restringido</h2>
      <p style={modernJoin.subtitle}>
        Para activar tu cuenta y acceder a las misiones, debes ser miembro de nuestras comunidades estratégicas oficiales.
      </p>

      {channelStatus.c1_url && !channelStatus.c1 && (
        <div style={modernJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            {Icons.channel}
            <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#F3F4F6', letterSpacing: '0.4px' }}>
              Red Primaria
            </p>
          </div>
          <button
            type="button"
            style={modernJoin.btnJoin}
            onClick={() => WebApp.openTelegramLink(channelStatus.c1_url)}
          >
            INGRESAR AL CANAL
          </button>
        </div>
      )}

      {channelStatus.c2_url && !channelStatus.c2 && (
        <div style={modernJoin.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            {Icons.diamond}
            <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#F3F4F6', letterSpacing: '0.4px' }}>
              Alianza Estratégica
            </p>
          </div>
          <button
            type="button"
            style={modernJoin.btnJoin}
            onClick={() => WebApp.openTelegramLink(channelStatus.c2_url)}
          >
            INGRESAR AL CANAL
          </button>
        </div>
      )}

      <button type="button" style={modernJoin.btnVerify} onClick={handleCheckChannels}>
        {Icons.refresh}
        <span>YA ME UNÍ, CONTINUAR</span>
      </button>
    </div>
  );
}
