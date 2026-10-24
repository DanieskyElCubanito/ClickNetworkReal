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

// 🔥 Importamos la nueva Billetera para la Fase 1
import WalletTab from './components/WalletTab'; 

// 🛑 Componentes de Fase 2 (Ocultos temporalmente para el lanzamiento MVP)
// import PublishTab from './components/PublishTab';
// import MarketTab from './components/MarketTab';

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
        setErrorMessage(data?.message || data?.error || "Error");
        setStatus('error');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || "Error");
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
      } catch (e) { setErrorMessage("Error SDK"); setStatus('error'); }
    }, 150);
    return () => clearTimeout(initTimer);
  }, []);

  const handleShare = () => {
    const inviteLink = `https://t.me/ClickNetworkbot/app?startapp=${userData?.id}`;
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
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>⚠️</div>
          <h2 style={{ color: '#ffe600', margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900' }}>{t('access_interrupted')}</h2>
          <p style={{ color: '#ff99dd', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{errorMessage}</p>
          <button style={neonTheme.btnRetry} onClick={() => window.location.reload()}>🔄 {t('retry')}</button>
        </div>
      </div>
    );
  }

  if (!isHuman && status === 'member') return <CaptchaVerification userData={userData} setIsHuman={setIsHuman} />;

  return (
    <div style={neonTheme.container}>
      {/* 🔥 FIX APLICADO: duration: 3000 añadido aquí */}
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#1d0833', color: '#fff', border: '2px solid #00f0ff', boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)', fontWeight: '800', fontSize: '13px' } }} />
      <div style={neonTheme.main}>
        {activeTab === 'home' && <div className="fade-in"><ProfileHeader userData={userData} t={t} lang={lang} setLang={setLang} /><HomeTab userData={userData} setUserData={setUserData} setActiveTab={setActiveTab} t={t} /></div>}
        {activeTab === 'tasks' && <div className="fade-in"><AdsTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'referrals' && <div className="fade-in"><ShareTab stats={stats} handleShare={handleShare} userId={userData?.id} totalReferralEarnings={userData?.referral_earnings} t={t} /></div>}
        {activeTab === 'wallet' && <div className="fade-in"><WalletTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'admin' && <div className="fade-in"><AdminDashboard userData={userData} t={t} /></div>}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} userData={userData} t={t} />
    </div>
  );
}

export default App;
