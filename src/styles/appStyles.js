export const s = {
  // --- [ ESTADOS DE CARGA Y ERRORES ] ---
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0314',
    backgroundImage: 'radial-gradient(circle at center, #260b3f 0%, #0a0314 85%)',
    color: '#ffffff',
    textAlign: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  loader: {
    width: '46px',
    height: '46px',
    border: '4px solid rgba(255, 65, 180, 0.2)',
    borderTopColor: '#00f0ff',
    borderRightColor: '#ff1493',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.45)',
    marginBottom: '15px'
  },
  errorText: {
    color: '#ff41b4',
    fontSize: '14px',
    marginTop: '10px',
    lineHeight: '1.4',
    fontWeight: '800',
    textShadow: '0 0 10px rgba(255, 65, 180, 0.4)'
  },

  // --- [ CONTENEDORES GENERALES ] ---
  container: { 
    backgroundColor: '#0a0314', 
    backgroundImage: 'radial-gradient(circle at 50% 10%, #2b0b47 0%, #0a0314 80%)',
    color: '#ffffff', 
    minHeight: '100vh', 
    fontFamily: "'Fredoka', 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif",
    display: 'block', 
    boxSizing: 'border-box'
  },

  main: { 
    display: 'block', 
    padding: '16px 16px 110px 16px', 
    maxWidth: '500px', 
    margin: '0 auto', 
    width: '100%', 
    boxSizing: 'border-box'
  }, 

  // --- [ PERFIL DE USUARIO ] ---
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    marginBottom: '18px',
    background: 'linear-gradient(135deg, rgba(46, 16, 77, 0.75), rgba(18, 7, 36, 0.85))',
    border: '2px solid rgba(255, 65, 180, 0.4)',
    borderRadius: '22px',
    boxShadow: '0 4px 15px rgba(255, 65, 180, 0.2)'
  },
  profileAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2.5px solid #00f0ff',
    boxShadow: '0 0 12px rgba(0, 240, 255, 0.5)',
    marginRight: '14px'
  },
  profileName: {
    fontSize: '17px',
    fontWeight: '900',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '0.3px'
  },
  profileId: {
    fontSize: '11px',
    color: '#ff99dd',
    margin: '2px 0 0 0',
    fontWeight: '800'
  },

  // --- [ TARJETAS Y PANELES ] ---
  card: { 
    background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.85), rgba(20, 8, 38, 0.95))', 
    padding: '20px', 
    borderRadius: '24px', 
    border: '2px solid #ff41b4', 
    marginBottom: '16px',
    boxShadow: '0 8px 24px rgba(255, 65, 180, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
  },
  cardBalance: { 
    background: 'linear-gradient(135deg, #ff1493 0%, #8a2be2 50%, #00f0ff 100%)', 
    padding: '32px 20px', 
    borderRadius: '28px', 
    textAlign: 'center', 
    marginBottom: '22px',
    boxShadow: '0 12px 28px rgba(255, 20, 147, 0.4), inset 0 2px 0 rgba(255,255,255,0.3)',
    color: '#ffffff'
  },

  // --- [ ACCIONES RÁPIDAS ] ---
  actionGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '18px'
  },
  actionCard: {
    flex: 1, 
    background: 'linear-gradient(145deg, rgba(38, 14, 66, 0.95), rgba(18, 7, 36, 0.95))', 
    borderRadius: '20px',
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #8a2be2',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '800',
    boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
    transition: 'transform 0.1s ease'
  },

  // --- [ DISEÑO DE RED (AFILIADOS) ] ---
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '18px'
  },
  statCol: {
    background: 'linear-gradient(145deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))',
    padding: '14px 6px',
    borderRadius: '20px',
    textAlign: 'center',
    border: '2px solid rgba(255, 65, 180, 0.35)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  statLabel: { 
    fontSize: '10px', 
    color: '#ff99dd', 
    fontWeight: '900', 
    margin: '0 0 5px 0', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: { 
    fontSize: '20px', 
    fontWeight: '900', 
    margin: 0, 
    color: '#ffe600',
    textShadow: '0 0 10px rgba(255, 230, 0, 0.4)'
  },
  statCom: { 
    fontSize: '10px', 
    margin: '4px 0 0 0', 
    color: '#00f0ff', 
    fontWeight: '800' 
  },

  row: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    gap: '10px', 
    marginBottom: '18px' 
  },
  box: { 
    flex: 1, 
    padding: '12px 8px', 
    background: 'rgba(15, 5, 28, 0.8)', 
    borderRadius: '16px', 
    fontSize: '11px', 
    textAlign: 'center', 
    color: '#ff99dd',
    border: '1.5px dashed #8a2be2'
  },
  totalCard: {
    background: 'linear-gradient(90deg, #ff1493 0%, #8a2be2 100%)',
    padding: '16px 20px',
    borderRadius: '22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '2px solid #ffffff33',
    boxShadow: '0 6px 20px rgba(255, 20, 147, 0.35)'
  },

  // --- [ BOTONES 3D GOMOSOS ] ---
  btnGreen: { 
    width: '100%', 
    padding: '16px', 
    background: 'linear-gradient(180deg, #00ffaa 0%, #00bb77 100%)', 
    color: '#050214', 
    border: 'none', 
    borderRadius: '18px', 
    fontWeight: '900', 
    fontSize: '16px',
    letterSpacing: '0.5px',
    boxShadow: '0 5px 0 #007744, 0 10px 20px rgba(0, 255, 170, 0.4)',
    cursor: 'pointer'
  },
  btnWhite: { 
    width: '100%', 
    padding: '16px', 
    background: 'linear-gradient(180deg, #ffffff 0%, #ffe6ff 100%)', 
    color: '#8b004b', 
    borderRadius: '18px', 
    fontWeight: '900',
    fontSize: '15px',
    border: 'none',
    boxShadow: '0 5px 0 #ccaacc, 0 8px 18px rgba(255, 255, 255, 0.3)',
    cursor: 'pointer'
  },
  btnOutline: { 
    width: '100%', 
    padding: '14px', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    color: '#ff99dd', 
    border: '2px solid rgba(255, 65, 180, 0.4)', 
    borderRadius: '18px', 
    fontWeight: '800',
    fontSize: '14px',
    marginTop: '10px',
    cursor: 'pointer'
  },

  // --- [ NAVEGACIÓN FLOTANTE NEÓN ] ---
  bottomNav: { 
    position: 'fixed', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'rgba(10, 3, 20, 0.92)', 
    backdropFilter: 'blur(16px)', 
    display: 'flex', 
    justifyContent: 'space-around', 
    padding: '10px 10px 26px 10px', 
    borderTop: '2px solid #8a2be2', 
    boxShadow: '0 -4px 20px rgba(138, 43, 226, 0.3)',
    zIndex: 100 
  },
  navItem: { 
    color: '#7a5a99', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '11px', 
    width: '25%', // Updated for 4 items
    gap: '4px', 
    fontWeight: '800',
    cursor: 'pointer' 
  },
  navItemActive: { 
    color: '#00f0ff', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '11px', 
    width: '25%', // Updated for 4 items
    gap: '4px', 
    fontWeight: '900',
    textShadow: '0 0 10px rgba(0, 240, 255, 0.6)',
    cursor: 'pointer' 
  },

  // --- [ INPUTS & TEXTOS DE AYUDA ] ---
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(15, 5, 28, 0.85)',
    border: '2px solid #8a2be2',
    borderRadius: '18px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '15px',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
  },
  helpText: {
    fontSize: '12px',
    color: '#ffffff', 
    background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.25) 0%, rgba(0, 240, 255, 0.18) 100%)', 
    padding: '14px 16px',
    borderRadius: '20px',
    border: '2px solid rgba(0, 240, 255, 0.4)', 
    marginBottom: '16px',
    lineHeight: '1.5',
    boxShadow: '0 4px 15px rgba(0, 240, 255, 0.15)'
  }
};
