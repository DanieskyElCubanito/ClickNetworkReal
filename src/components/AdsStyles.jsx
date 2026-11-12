import React from 'react';

export const neon = {
  // Contenedores principales: Limpios, oscuros (obsidiana) con bordes de cristal y sombras suaves
  card: { background: '#13151f', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  cardInteractive: { background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '20px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.3s ease', backdropFilter: 'blur(10px)' },
  
  // Botones: Gradientes premium (Índigo a Púrpura), bordes redondeados y texto limpio
  btnPrimary: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)', textTransform: 'uppercase', letterSpacing: '1px', transition: 'transform 0.2s ease' },
  btnSecondary: { width: '100%', padding: '14px', background: 'transparent', color: '#9CA3AF', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' },
  
  // Inputs: Fondo oscuro plano, sin bordes agresivos, enfocado en la tipografía
  input: { width: '100%', background: '#0B0D14', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '14px 16px', fontSize: '15px', color: '#F3F4F6', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s ease' },
  
  // Barras de progreso
  progressBox: { display: 'flex', justifyContent: 'center', gap: '6px', margin: '15px 0 25px 0' },
  progressStep: (active) => ({ width: '40px', height: '4px', background: active ? 'linear-gradient(90deg, #06B6D4, #3B82F6)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', boxShadow: active ? '0 0 12px rgba(6, 182, 212, 0.5)' : 'none', transition: 'all 0.4s ease' }),
  
  // Tarjetas de misiones (Bounty Cards)
  taskCard: { background: 'linear-gradient(145deg, #171923, #11131a)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)' },
  taskIconBox: { width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.05)', flexShrink: 0 },
  
  // Botones pequeños de acción
  taskButton: { background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 16px', fontWeight: '800', fontSize: '13px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' },
  taskButtonRejoin: { background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid #10B981', borderRadius: '12px', padding: '10px 16px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  taskButtonDisabled: { background: 'rgba(255, 255, 255, 0.03)', color: '#6B7280', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '10px 16px', fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'not-allowed' },
  taskButtonCheck: { background: '#F59E0B', color: '#111827', border: 'none', borderRadius: '12px', padding: '10px 16px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' },
  
  // Calculadora y Resúmenes
  calcContainer: { background: '#13151f', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '24px', color: '#F3F4F6', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  pillButton: (active) => ({ flex: 1, padding: '12px 0', fontSize: '13px', fontWeight: '800', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.3s', background: active ? '#ffffff' : 'rgba(255, 255, 255, 0.05)', color: active ? '#111827' : '#9CA3AF', border: 'none', boxShadow: active ? '0 4px 15px rgba(255, 255, 255, 0.15)' : 'none' }),
  label: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '8px', display: 'block', letterSpacing: '0.8px' },
  btnActionCalc: { width: '45px', height: '45px', background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', fontWeight: '500', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },
  inputCalc: { flex: 1, background: '#0B0D14', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '12px', fontSize: '20px', fontWeight: '800', color: '#ffffff', outline: 'none', boxSizing: 'border-box', textAlign: 'center' },
  summaryBox: { background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '18px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  
  // Botones de acción general
  actionBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)', cursor: 'pointer', transition: 'transform 0.2s ease', textTransform: 'uppercase', letterSpacing: '1px' },
  actionBtnDisabled: { width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', color: '#4B5563', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '1px' },
  actionBtnDanger: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' },
  
  // Tabs superiores
  subTabBtn: (active) => ({ flex: 1, padding: '12px 6px', fontSize: '12px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', borderRadius: '14px', transition: 'all 0.3s ease', background: active ? '#ffffff' : 'rgba(255, 255, 255, 0.03)', color: active ? '#111827' : '#9CA3AF', border: 'none', boxShadow: active ? '0 4px 15px rgba(255, 255, 255, 0.1)' : 'none', textTransform: 'uppercase', letterSpacing: '0.5px'})
};

// Iconos más finos (strokeWidth: 1.8) para un look más sofisticado
export const TaskIcons = {
  group: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  channel: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  bot: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8.01" y2="16" /><line x1="16" y1="16" x2="16.01" y2="16" /></svg>,
  promo: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  daily: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  crypto: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/><path d="M12 22v-6.5"/><path d="M22 8.5l-10 7-10-7"/><path d="M2 15.5l10-7 10 7"/></svg>,
  game: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><path d="M6 12h4"></path><path d="M8 10v4"></path><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line></svg>,
  money: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  web3: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
};
