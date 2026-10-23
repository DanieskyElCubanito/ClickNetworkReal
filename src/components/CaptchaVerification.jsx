import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';

// --- ESTILOS NEÓN PARA EL CAPTCHA ---
const neonCaptcha = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0314',
    backgroundImage: 'radial-gradient(circle at center, #2b0b47 0%, #0a0314 85%)',
    padding: '24px',
    boxSizing: 'border-box',
    color: '#ffffff',
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#00f0ff',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
  },
  subtitle: {
    fontSize: '13px',
    color: '#ff99dd',
    fontWeight: 'bold',
    marginBottom: '30px'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))',
    border: '2px solid #8a2be2',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
    width: '100%',
    maxWidth: '340px',
    boxSizing: 'border-box'
  }
};

export default function CaptchaVerification({ userData, setIsHuman }) {
  const [step, setStep] = useState(1);

  // --- ESTADO PARA EL PASO 1 (CHECKBOX) ---
  const [isChecked, setIsChecked] = useState(false);

  // --- ESTADOS PARA EL PASO 2 (PUZZLE) ---
  const [targetPosition, setTargetPosition] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);

  // --- ESTADOS PARA EL PASO 3 (ICONOS) ---
  const [targetIcons, setTargetIcons] = useState([]);
  const [shuffledIcons, setShuffledIcons] = useState([]);
  const [selectedIcons, setSelectedIcons] = useState([]);

  useEffect(() => {
    setTargetPosition(Math.floor(Math.random() * 40) + 40);

    const allIcons = ['⭐', '💎', '🚀', '⚡', '🤖', '🎮', '🔥', '🛡️'];
    const shuffledAll = [...allIcons].sort(() => 0.5 - Math.random());

    const targets = shuffledAll.slice(0, 3);
    setTargetIcons(targets);

    const displayIcons = shuffledAll.slice(0, 6).sort(() => 0.5 - Math.random());
    setShuffledIcons(displayIcons);
  }, []);

  // --- LÓGICA PASO 1 ---
  const handleCheckboxClick = () => {
    setIsChecked(true);
    setTimeout(() => {
      setStep(2);
    }, 500);
  };

  // --- LÓGICA PASO 2 ---
  const handleSliderRelease = () => {
    if (Math.abs(sliderValue - targetPosition) < 5) {
      toast.success("¡Desbloqueo completado!", { icon: '🔓' });
      setTimeout(() => setStep(3), 500);
    } else {
      toast.error("Posición incorrecta, recargando...");
      setSliderValue(0);
      setTargetPosition(Math.floor(Math.random() * 40) + 40);
    }
  };

  // --- LÓGICA PASO 3 ---
  const handleIconSelect = async (icon) => {
    if (selectedIcons.includes(icon)) return;

    const newSelection = [...selectedIcons, icon];
    setSelectedIcons(newSelection);

    if (newSelection.length === 3) {
      const isCorrect = newSelection.every((val, index) => val === targetIcons[index]);

      if (isCorrect) {
        const tid = toast.loading("Verificando protocolo de seguridad...");
        try {
          const res = await botApi.verifyHuman(userData?.id, 'app-verified-3step');
          if (res?.success) {
            setIsHuman(true);
            toast.success("¡Identidad Confirmada!", { id: tid });
          } else {
            toast.error(res?.error || "Falló la verificación en servidor.", { id: tid });
            resetStep3();
          }
        } catch (e) {
          toast.error("Error en el servidor.", { id: tid });
          resetStep3();
        }
      } else {
        toast.error("Secuencia incorrecta. Intenta de nuevo.");
        resetStep3();
      }
    }
  };

  const resetStep3 = () => {
    setTimeout(() => {
      setSelectedIcons([]);
      setShuffledIcons((prev) => [...prev].sort(() => 0.5 - Math.random()));
    }, 1000);
  };

  return (
    <div className="fade-in" style={neonCaptcha.container}>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: { background: '#1d0833', color: '#fff', border: '2px solid #ff1493', fontWeight: '800' }
        }} 
      />
      
      <div style={{ fontSize: '50px', marginBottom: '10px', filter: 'drop-shadow(0 0 15px rgba(0, 240, 255, 0.4))' }}>
        🛡️
      </div>
      <h2 style={neonCaptcha.title}>Control de Acceso</h2>
      <p style={neonCaptcha.subtitle}>Completa la verificación para demostrar que no eres un bot.</p>

      {/* --- PASO 1: CHECKBOX --- */}
      {step === 1 && (
        <div className="fade-in" style={neonCaptcha.card}>
          <div 
            onClick={handleCheckboxClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', 
              padding: '16px', background: 'rgba(15, 5, 28, 0.8)', borderRadius: '14px', 
              border: '2px solid #8a2be2', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: isChecked ? 'inset 0 0 15px rgba(0, 240, 255, 0.3)' : 'none'
            }}
          >
            <div 
              style={{ 
                width: '32px', height: '32px', border: isChecked ? '2px solid #00f0ff' : '2px solid #7a5a99', 
                borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                background: isChecked ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {isChecked && <span style={{ color: '#00f0ff', fontWeight: '900', fontSize: '20px', textShadow: '0 0 5px #00f0ff' }}>✓</span>}
            </div>

            <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Soy Humano
            </span>
          </div>
        </div>
      )}

      {/* --- PASO 2: PUZZLE SLIDER --- */}
      {step === 2 && (
        <div className="fade-in" style={neonCaptcha.card}>
          <p style={{ color: '#00f0ff', fontSize: '13px', fontWeight: '900', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
            Alinea el láser
          </p>

          <div style={{ 
            width: '100%', height: '120px', background: 'linear-gradient(45deg, #120724, #1a0b33)', 
            borderRadius: '14px', position: 'relative', overflow: 'hidden', border: '2px dashed #8a2be2',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}>
            {/* Destino (Hueco oscuro) */}
            <div style={{
              width: '44px', height: '44px', background: 'rgba(0,0,0,0.8)', 
              position: 'absolute', top: '38px', left: `${targetPosition}%`, 
              boxShadow: 'inset 0 0 10px #000', borderRadius: '8px', border: '1px solid #333'
            }}></div>

            {/* Bloque Neón Deslizable */}
            <div style={{
              width: '44px', height: '44px', background: '#00f0ff', 
              position: 'absolute', top: '38px', left: `${sliderValue}%`, 
              boxShadow: '0 0 15px #00f0ff', borderRadius: '8px',
              transition: 'left 0.1s ease-out'
            }}></div>
          </div>

          <input 
            type="range" 
            min="0" 
            max="85" 
            value={sliderValue} 
            onChange={(e) => setSliderValue(Number(e.target.value))}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            style={{ width: '100%', marginTop: '20px', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* --- PASO 3: ORDEN DE ICONOS --- */}
      {step === 3 && (
        <div className="fade-in" style={neonCaptcha.card}>
          <div style={{ background: 'rgba(15, 5, 28, 0.6)', padding: '12px', borderRadius: '14px', border: '1px solid #8a2be2', marginBottom: '20px' }}>
            <p style={{ color: '#ff99dd', margin: '0 0 8px 0', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Secuencia requerida:</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '24px' }}>
              {targetIcons.map((icon, i) => (
                <span key={i} style={{ opacity: selectedIcons.length > i ? 0.2 : 1, filter: selectedIcons.length > i ? 'grayscale(100%)' : 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.4))', transition: 'all 0.3s' }}>
                  {icon}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {shuffledIcons.map((icon, i) => {
              const isSelected = selectedIcons.includes(icon);
              return (
                <button
                  key={i}
                  onClick={() => handleIconSelect(icon)}
                  disabled={isSelected}
                  style={{
                    fontSize: '28px', padding: '16px 0', borderRadius: '14px',
                    background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(38, 14, 66, 0.9)',
                    border: isSelected ? '2px solid #00f0ff' : '2px solid #7a5a99',
                    opacity: isSelected ? 0.6 : 1, cursor: isSelected ? 'default' : 'pointer', transition: 'all 0.2s',
                    position: 'relative', boxShadow: isSelected ? 'inset 0 0 10px rgba(0, 240, 255, 0.3)' : '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  {icon}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '-6px', right: '-6px', background: '#ff1493',
                      color: '#ffffff', borderRadius: '50%', width: '22px', height: '22px',
                      fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900',
                      boxShadow: '0 0 10px #ff1493'
                    }}>
                      {selectedIcons.indexOf(icon) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
