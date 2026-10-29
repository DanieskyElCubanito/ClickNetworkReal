export const s = {
  // --- [ ESTADOS DE CARGA Y ERRORES ] ---
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05010a',
    backgroundImage: 'radial-gradient(circle at center, rgba(65, 11, 102, 0.8) 0%, #05010a 70%)',
    color: '#ffffff',
    textAlign: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  loader: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255, 20, 147, 0.15)',
    borderTopColor: '#00f0ff',
    borderRightColor: '#ffe600',
    borderBottomColor: '#ff1493',
    borderRadius: '50%',
    animation: 'spin 0.8s cubic-bezier(0.68, -0.55, 0.26.55) infinite',
    boxShadow: '0 0 25px rgba(0, 240, 255, 0.6), inset 0 0 15px rgba(255, 20, 147, 0.4)',
    marginBottom: '20px'
  },
  errorText: {
    color: '#ff1493',
    fontSize: '15px',
    marginTop: '12px',
    lineHeight: '1.4',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textShadow: '0 0 12px rgba(255, 20, 147, 0.8)'
  },

  // --- [ CONTENEDORES GENERALES ] ---
  container: { 
    backgroundColor: '#05010a', 
    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(43, 11, 71, 0.9) 0%, #05010a 80%)',
    color: '#ffffff', 
    minHeight: '100vh', 
    fontFamily: "'Fredoka', 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif",
    display: 'block', 
    boxSizing: 'border-box'
  },

  main: { 
    display: 'block', 
    padding: '16px 16px 120px 16px', 
    maxWidth: '500px', 
    margin: '0 auto', 
    width: '100%', 
    boxSizing: 'border-box'
  }, 

  // --- [ PERFIL DE USUARIO (GAMER ID) ] ---
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    marginBottom: '20px',
    background: 'linear-gradient(135deg, rgba(58, 20, 97, 0.8), rgba(20, 7, 40, 0.9))',
    border: '2px solid #8a2be2',
    borderBottom: '4px solid #ff1493',
    borderRadius: '24px',
    boxShadow: '0 8px 25px rgba(138, 43, 226, 0.25), inset 0 2px 10px rgba(255, 255, 255, 0.1)'
  },
  profileAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '16px', // Forma más gamer (cuadrado redondeado)
    objectFit: 'cover',
    border: '3px solid #00f0ff',
    boxShadow: '0 0 15px rgba(0, 240, 255, 0.6), inset 0 0 8px rgba(0, 0, 0, 0.5)',
    marginRight: '16px',
    transform: 'rotate(-3deg)'
  },
  profileName: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
  },
  profileId: {
    fontSize: '12px',
    color: '#00f0ff',
    margin: '4px 0 0 0',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '1px'
  },

  // --- [ TARJETAS Y PANELES (UI DE JUEGO) ] ---
  card: { 
    background: 'linear-gradient(145deg, rgba(50, 15, 80, 0.9), rgba(15, 5, 30, 0.95))', 
    padding: '24px 20px', 
    borderRadius: '28px', 
    border: '2px solid #8a2be2', 
    borderTop: '2px solid #ff1493',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 2px 15px rgba(255, 20, 147, 0.15)'
  },
  cardBalance: { 
    background: 'linear-gradient(135deg, #ff1493 0%, #8a2be2 40%, #00f0ff 100%)', 
    padding: '36px 20px', 
    borderRadius: '32px', 
    textAlign: 'center', 
    marginBottom: '24px',
    border: '2px solid rgba(255,255,255,0.4)',
    boxShadow: '0 15px 35px rgba(0, 240, 255, 0.4), inset 0 4px 10px rgba(255,255,255,0.5)',
    color: '#050214',
    textShadow: '0 2px 10px rgba(255,255,255,0.6)'
  },

  // --- [ ACCIONES RÁPIDAS (BOTONES DE HABILIDAD) ] ---
  actionGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '14px',
    marginTop: '20px'
  },
  actionCard: {
    flex: 1, 
    background: 'linear-gradient(145deg, rgba(45, 15, 75, 0.9), rgba(20, 5, 40, 0.95))', 
    borderRadius: '22px',
    padding: '18px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #00f0ff',
    borderBottom: '4px solid #0088ff', // Efecto 3D
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '900',
    textTransform: 'uppercase',
    boxShadow: '0 6px 15px rgba(0, 240, 255, 0.25)',
    transition: 'all 0.15s ease',
    transform: 'translateY(0)'
  },

  // --- [ DISEÑO DE RED Y STATS (MARCADORES) ] ---
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px'
  },
  statCol: {
    background: 'linear-gradient(145deg, rgba(40, 10, 70, 0.9), rgba(15, 5, 30, 0.95))',
    padding: '16px 8px',
    borderRadius: '22px',
    textAlign: 'center',
    border: '2px solid #8a2be2',
    borderBottom: '4px solid #4a0080',
    boxShadow: '0 6px 15px rgba(0,0,0,0.5), inset 0 2px 8px rgba(138, 43, 226, 0.2)'
  },
  statLabel: { 
    fontSize: '10px', 
    color: '#ff99dd', 
    fontWeight: '900', 
    margin: '0 0 6px 0', 
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  statValue: { 
    fontSize: '22px', 
    fontWeight: '900', 
    margin: 0, 
    color: '#ffe600',
    textShadow: '0 0 15px rgba(255, 230, 0, 0.6), 0 2px 4px rgba(0,0,0,0.8)'
  },
  statCom: { 
    fontSize: '11px', 
    margin: '6px 0 0 0', 
    color: '#00f0ff', 
    fontWeight: '900',
    textTransform: 'uppercase'
  },

  row: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    gap: '12px', 
    marginBottom: '20px' 
  },
  box: { 
    flex: 1, 
    padding: '14px 10px', 
    background: 'rgba(20, 5, 35, 0.8)', 
    borderRadius: '18px', 
    fontSize: '12px', 
    fontWeight: '900',
    textAlign: 'center', 
    color: '#00f0ff',
    border: '2px dashed #00f0ff',
    boxShadow: 'inset 0 0 10px rgba(0, 240, 255, 0.1)'
  },
  totalCard: {
    background: 'linear-gradient(90deg, #ff1493 0%, #8a2be2 50%, #00f0ff 100%)',
    padding: '18px 24px',
    borderRadius: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '2px solid rgba(255,255,255,0.4)',
    boxShadow: '0 8px 25px rgba(0, 240, 255, 0.4), inset 0 2px 10px rgba(255,255,255,0.5)'
  },

  // --- [ BOTONES 3D GOMOSOS (ARCADE STYLE) ] ---
  btnGreen: { 
    width: '100%', 
    padding: '18px', 
    background: 'linear-gradient(180deg, #00ffaa 0%, #009966 100%)', 
    color: '#050214', 
    border: 'none', 
    borderRadius: '20px', 
    fontWeight: '900', 
    fontSize: '17px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    boxShadow: '0 6px 0 #005533, 0 12px 25px rgba(0, 255, 170, 0.5), inset 0 2px 5px rgba(255,255,255,0.5)',
    cursor: 'pointer',
    transition: 'all 0.1s active'
  },
  btnWhite: { 
    width: '100%', 
    padding: '18px', 
    background: 'linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%)', 
    color: '#8b004b', 
    borderRadius: '20px', 
    fontWeight: '900',
    fontSize: '16px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    border: 'none',
    boxShadow: '0 6px 0 #a0a0a0, 0 10px 20px rgba(255, 255, 255, 0.3), inset 0 2px 5px #ffffff',
    cursor: 'pointer'
  },
  btnOutline: { 
    width: '100%', 
    padding: '16px', 
    backgroundColor: 'rgba(255, 20, 147, 0.1)', 
    color: '#ff99dd', 
    border: '2px solid #ff1493', 
    borderBottom: '4px solid #b3005f',
    borderRadius: '20px', 
    fontWeight: '900',
    fontSize: '15px',
    letterSpacing: '1px',
    marginTop: '12px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: '0 6px 15px rgba(255, 20, 147, 0.2)'
  },

  // --- [ NAVEGACIÓN FLOTANTE NEÓN ] ---
  bottomNav: { 
    position: 'fixed', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'rgba(5, 2, 15, 0.95)', 
    backdropFilter: 'blur(20px)', 
    display: 'flex', 
    justifyContent: 'space-around', 
    padding: '12px 10px 28px 10px', 
    borderTop: '2px solid #00f0ff', 
    boxShadow: '0 -10px 30px rgba(0, 240, 255, 0.15)',
    zIndex: 100 
  },
  navItem: { 
    color: '#6b4c8a', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '11px', 
    width: '25%', 
    gap: '6px', 
    fontWeight: '800',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: '0.2s ease'
  },
  navItemActive: { 
    color: '#00f0ff', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '12px', 
    width: '25%', 
    gap: '4px', 
    fontWeight: '900',
    textTransform: 'uppercase',
    textShadow: '0 0 12px rgba(0, 240, 255, 0.8)',
    cursor: 'pointer',
    transform: 'translateY(-4px)' // Efecto de botón presionado/elevado
  },

  // --- [ INPUTS & TEXTOS DE AYUDA (HUD STYLE) ] ---
  input: {
    width: '100%',
    padding: '16px 18px',
    background: 'rgba(10, 2, 20, 0.9)',
    border: '2px solid #00f0ff',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '900',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '18px',
    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.8), 0 0 10px rgba(0, 240, 255, 0.2)',
    letterSpacing: '0.5px'
  },
  helpText: {
    fontSize: '13px',
    color: '#ffffff', 
    background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%)', 
    padding: '16px 18px',
    borderRadius: '22px',
    border: '2px dashed #ff1493', 
    marginBottom: '20px',
    lineHeight: '1.6',
    fontWeight: '800',
    boxShadow: '0 6px 20px rgba(255, 20, 147, 0.15)'
  }
};
