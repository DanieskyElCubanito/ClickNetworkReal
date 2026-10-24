import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import toast, { Toaster } from 'react-hot-toast';  
import { botApi } from './api/botApi';
import { translations } from './translations'; 

import ProfileHeader from './components/ProfileHeader';
import HomeTab from './components/HomeTab';
import AdsTab from './components/AdsTab';
import ShareTab from './components/ShareTab';
import BottomNav from './components/BottomNav';
import CaptchaVerification from './components/CaptchaVerification';
import AdminDashboard from './components/AdminDashboard';
import WalletTab from './components/WalletTab'; 
import MarketTab from './components/MarketTab';

const neonTheme = {
  container: { backgroundColor: '#0a0314', backgroundImage: 'radial-gradient(circle at 50% 10%, #2b0b47 0%, #0a0314 80%)', minHeight: '100vh', height: 'var(--tg-viewport-height, 100vh)', color: '#ffffff', fontFamily: "'Fredoka', 'Quicksand', system-ui, -apple-system, sans-serif", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  main: { flex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', padding: '16px 16px 110px 16px', boxSizing: 'border-box', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0314', backgroundImage: 'radial-gradient(circle at center, #260b3f 0%, #0a0314 85%)', padding: '24px', textAlign: 'center', boxSizing: 'border-box' },
  loaderGlow: { width: '56px', height: '56px', borderRadius: '50%', border: '4px solid rgba(255, 65, 180, 0.2)', borderTopColor: '#00f0ff', borderRightColor: '#ff1493', animation: 'spin 0.9s linear infinite', boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)' },
  errorCard: { background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.9), rgba(20, 8, 38, 0.95))', border: '2px solid #ff41b4', borderRadius: '24px', padding: '28px 20px', maxWidth: '340px', boxShadow: '0 0 25px rgba(255, 65, 180, 0.35)' },
  btnRetry: { marginTop: '20px', padding: '12px 28px', background: 'linear-gradient(180deg, #00f0ff 0%, #0099ff 100%)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '14px', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 0 #0066aa, 0 8px 18px rgba(0, 240, 255, 0.45)' }
};

function App() {
  const [status, setStatus] = useState('loading'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ n1: 0, c1: "0.000" });
  const [isHuman, setIsHuman] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [lang, setLang] = useState(localStorage.getItem('click_lang') || 'es');
  const initialized = useRef(false);
  const t = (key) => translations[lang][key] || key;

  // 🔥 Helper para limpiar mensajes de error tipo Object
  const safeErrorMessage = (errorPayload, fallbackMsg) => {
    if (!errorPayload) return fallbackMsg;
    if (typeof errorPayload === 'string') return errorPayload;
    if (errorPayload.message) return errorPayload.message;
    if (errorPayload.error) return errorPayload.error;
    try {
      return JSON.stringify(errorPayload);
    } catch {
      return fallbackMsg;
    }
  };

  const verifyUser = async (teleUser, startParam) => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const generatedDeviceId = result.visitorId;
      const storedFirstUser = localStorage.getItem('xpro_linked_user');
      let previousAccount = null;

      if (!storedFirstUser) { localStorage.setItem('xpro_linked_user', String(teleUser.id)); } 
      else if (storedFirstUser !== String(teleUser.id)) { previousAccount = storedFirstUser; }

      const userPayload = { ...teleUser, deviceId: generatedDeviceId, previousAccountDetected: previousAccount };
      const data = await botApi.verifyUser(userPayload, startParam);

      if (data && data.success && data.user) {
        setUserData(data.user);
        setStats(data.stats || { n1: 0, c1: "0.000" });
        setStatus('member');
        if (data.user?.is_human) setIsHuman(true);
      } else {
        // 🔥 Uso del Helper para evitar "[object Object]"
        setErrorMessage(safeErrorMessage(data, "Error al sincronizar con el servidor."));
        setStatus('error');
      }
    } catch (err) {
        // 🔥 Uso del Helper para errores Axios / Red
        const errPayload = err.response?.data || err;
        setErrorMessage(safeErrorMessage(errPayload, "Fallo de conexión o base de datos."));
        setStatus('error');
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    const initTimer = setTimeout(() => {
      try {
        WebApp.ready(); WebApp.expand();
        if (WebApp.disableVerticalSwipes) WebApp.disableVerticalSwipes();
        const user = WebApp.initDataUnsafe?.user;
        const initData = WebApp.initData;
        const inviterId = WebApp.initDataUnsafe?.start_param;

        if (!localStorage.getItem('click_lang') && user?.language_code) {
          const detectedLang = user.language_code.startsWith('es') ? 'es' : 'en';
          setLang(detectedLang);
          localStorage.setItem('click_lang', detectedLang);
        }

        if (!user || !initData) { 
            setErrorMessage(t('access_denied')); 
            setStatus('error'); 
            return; 
        }

        initialized.current = true;
        verifyUser(user, inviterId);
      } catch (e) { 
          setErrorMessage("Error de compatibilidad con Telegram."); 
          setStatus('error'); 
      }
    }, 150);
    return () => clearTimeout(initTimer);
  }, []);

  const handleShare = () => {
    const inviteLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(t('share_text'))}`);
  };

  if (status === 'loading') {
    return (
      <div style={neonTheme.center}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={neonTheme.loaderGlow}></div>
        <p style={{ marginTop: '22px', fontSize: '15px', fontWeight: '900', color: '#ff66cc', letterSpacing: '1px' }}>{t('loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={neonTheme.center}>
        <div style={neonTheme.errorCard}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>
            {/* Ícono de Alerta en Vector (Sin Emojis) */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(255,230,0,0.5))' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ color: '#ffe600', margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900', textTransform: 'uppercase' }}>{t('access_interrupted')}</h2>
          
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 65, 180, 0.4)', marginBottom: '16px' }}>
             <p style={{ color: '#ff99dd', fontSize: '13px', lineHeight: '1.5', margin: 0, wordBreak: 'break-word', fontFamily: 'monospace' }}>
               {errorMessage}
             </p>
          </div>

          <button style={neonTheme.btnRetry} onClick={() => window.location.reload()}>REINTENTAR</button>
        </div>
      </div>
    );
  }

  if (!isHuman && status === 'member') return <CaptchaVerification userData={userData} setIsHuman={setIsHuman} />;

  return (
    <div style={neonTheme.container}>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#1d0833', color: '#fff', border: '2px solid #00f0ff', boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)', fontWeight: '800', fontSize: '13px' } }} />
      <div style={neonTheme.main}>
        {activeTab === 'home' && <div className="fade-in"><ProfileHeader userData={userData} t={t} lang={lang} setLang={setLang} /><HomeTab userData={userData} setUserData={setUserData} setActiveTab={setActiveTab} t={t} /></div>}
        {activeTab === 'tasks' && <div className="fade-in"><AdsTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'market' && <div className="fade-in"><MarketTab userData={userData} t={t} /></div>}
        {activeTab === 'referrals' && <div className="fade-in"><ShareTab stats={stats} handleShare={handleShare} userId={userData?.id} totalReferralEarnings={userData?.referral_earnings} t={t} /></div>}
        {activeTab === 'wallet' && <div className="fade-in"><WalletTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'admin' && <div className="fade-in"><AdminDashboard userData={userData} t={t} /></div>}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} userData={userData} t={t} />
    </div>
  );
}

export default App;
