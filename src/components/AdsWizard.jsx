import React from 'react';
import toast from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';
import { neon, TaskIcons } from './AdsStyles.jsx';

export default function AdsWizard({ props }) {
  const { 
    currentStepIndex, totalSteps, stepsFlow, currentStepId,
    taskType, setTaskType, targetUrl, setTargetUrl, botToken, setBotToken, validationCode, setValidationCode,
    completions, setCompletions, rewardPerGema, setRewardPerGema, isVerifying, handleVerifyUrl, 
    depositBalanceUsdt, campaignCostUsdt, baseCostGemas, referralFeeGemas, adminFeeGemas, totalGemasCost,
    handleCreateTaskWithVault, isGenerating, setRechargeAmount, setRecharging, nextStep, prevStep, closeWizard, TASK_TYPES, t,
    recharging, rechargeMethod, setRechargeMethod, rechargeAmount, checkoutView, tempWallet, intentId, liveGramUsd, handleStartRecharge, handleVerifyPayment, cancelCheckout
  } = props;

  const copyWallet = (wallet) => { navigator.clipboard.writeText(wallet); toast.success("Dirección copiada al portapapeles."); };
  const openTonkeeper = () => { 
      try { WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor((rechargeAmount/liveGramUsd) * 1e9)}`); } 
      catch (e) { toast.error("Aplicación Tonkeeper no detectada."); } 
  };

  const safeSetReward = (val) => {
      const num = Number(val);
      if (!Number.isFinite(num)) return;
      setRewardPerGema(Math.min(2.5, Math.max(1, Number(num.toFixed(1)))));
  };

  if (recharging) {
    return (
      <div className="fade-in">
        {checkoutView ? (
          <div className="fade-in" style={neon.calcContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#06B6D4', textTransform: 'uppercase' }}>Pasarela Segura</h3>
              <button onClick={cancelCheckout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '12px', width: '32px', height: '32px', color: '#EF4444', fontWeight: '800', cursor: 'pointer' }}>✕</button>
            </div>

            {rechargeMethod === 'gram' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfiera monto exacto</div>
                  <div style={{ fontSize: '38px', fontWeight: '900', color: '#06B6D4', margin: '12px 0', textShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>{(rechargeAmount/liveGramUsd).toFixed(2)} GRAM</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#F3F4F6' }}>A la dirección asignada:</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '18px', borderRadius: '16px', border: '1px dashed #3B82F6', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', marginBottom: '24px', color: '#ffffff' }}>
                  {tempWallet}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '14px', background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4', border: '1px solid #06B6D4', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>COPIAR</button>
                  <button onClick={openTonkeeper} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>TONKEEPER</button>
                </div>
                <button onClick={handleVerifyPayment} disabled={isGenerating} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isGenerating ? 'VERIFICANDO...' : <>{TaskIcons.check} CONFIRMAR PAGO</>}
                </button>
              </>
            )}

            {rechargeMethod === 'usdt' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfiera (BSC/BEP20)</div>
                  <div style={{ fontSize: '38px', fontWeight: '900', color: '#10B981', margin: '12px 0', textShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>${rechargeAmount.toFixed(2)} USDT</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#F3F4F6' }}>Contrato generado:</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '18px', borderRadius: '16px', border: '1px dashed #10B981', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', marginBottom: '20px', color: '#ffffff' }}>
                  {tempWallet}
                </div>
                <button onClick={() => copyWallet(tempWallet)} style={{ width: '100%', padding: '14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid #10B981', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginBottom: '24px' }}>📋 COPIAR DIRECCIÓN</button>
                <button onClick={handleVerifyPayment} disabled={isGenerating} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                  {isGenerating ? 'VERIFICANDO...' : 'VALIDAR PAGO'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button onClick={() => setRecharging(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '8px 14px', color: '#F3F4F6', fontWeight: '800', cursor: 'pointer' }}>◀ VOLVER</button>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#06B6D4', letterSpacing: '1px' }}>DEPÓSITO</div>
            </div>
            <div style={neon.calcContainer}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>Bóveda Publicitaria</h2>
              <div style={{ textAlign: 'center', marginBottom: '24px', color: '#9CA3AF', fontSize: '12px' }}>
                Balance actual: <b style={{color:'#10B981'}}>${depositBalanceUsdt.toFixed(2)} USDT</b>. (No retirable).
              </div>

              <span style={neon.label}>Volumen USDT</span>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button onClick={() => setRechargeAmount(p => Math.max(5, p - 5))} style={neon.btnActionCalc}>-</button>
                <input type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value) || 0)} style={neon.inputCalc} />
                <button onClick={() => setRechargeAmount(p => p + 5)} style={neon.btnActionCalc}>+</button>
              </div>

              <span style={neon.label}>Protocolo</span>
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
                <button onClick={() => setRechargeMethod('gram')} style={{ flex: 1, padding: '14px', border: 'none', background: rechargeMethod === 'gram' ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'transparent', color: rechargeMethod === 'gram' ? '#ffffff' : '#9CA3AF', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>GRAM (TON)</button>
                <button onClick={() => setRechargeMethod('usdt')} style={{ flex: 1, padding: '14px', borderLeft: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', borderRight: 'none', borderBottom: 'none', background: rechargeMethod === 'usdt' ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'transparent', color: rechargeMethod === 'usdt' ? '#ffffff' : '#9CA3AF', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>USDT (BEP20)</button>
              </div>

              <div style={neon.summaryBox}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: '800', fontSize: '13px', color: '#D1D5DB' }}>TOTAL ORDEN:</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '900', fontSize: '22px', color: '#06B6D4' }}>
                    {rechargeMethod === 'gram' ? `${(rechargeAmount/liveGramUsd).toFixed(2)} GRAM` : `$${rechargeAmount.toFixed(2)} USDT`}
                  </div>
                </div>
              </div>
              <button onClick={handleStartRecharge} disabled={isGenerating} style={neon.actionBtn}>{isGenerating ? 'INICIALIZANDO...' : 'PROCESAR DEPÓSITO'}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        {currentStepIndex > 0 ? (
          <button onClick={prevStep} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', color: '#F3F4F6', fontWeight: '800', cursor: 'pointer' }}>◀</button>
        ) : <div style={{width: '35px'}} />}
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#06B6D4', letterSpacing: '1.5px' }}>PASO {currentStepIndex + 1} DE {totalSteps}</div>
        <button onClick={closeWizard} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '10px', padding: '6px 12px', color: '#EF4444', fontWeight: '800', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={neon.progressBox}>{stepsFlow.map((step, idx) => <div key={idx} style={neon.progressStep(idx <= currentStepIndex)} />)}</div>

      {currentStepId === 'type' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#F9FAFB', marginBottom: '16px', letterSpacing: '0.5px' }}>SELECCIONE EL OBJETIVO</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TASK_TYPES.map((type) => (
              <div key={type.id} onClick={() => { setTaskType(type.id); nextStep(); }}
                style={{ ...neon.cardInteractive, borderColor: taskType === type.id ? type.color : 'rgba(255,255,255,0.06)', background: taskType === type.id ? `linear-gradient(135deg, ${type.color}15, rgba(17, 24, 39, 0.9))` : neon.cardInteractive.background }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{type.icon}</div>
                <div>
                  <div style={{ color: '#F3F4F6', fontSize: '15px', fontWeight: '800', lineHeight: '1.2' }}>{type.title}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentStepId === 'url' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#F9FAFB', marginBottom: '16px', letterSpacing: '0.5px' }}>ENLACE DE DESTINO</h3>
          <div style={neon.card}>
            <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '18px', lineHeight: '1.5', fontWeight: '500' }}>
              {taskType === 'bot' && (t('ads_url_desc_bot') || 'URL del Bot (Ej: @MiBot)')}
              {taskType === 'channel' && (t('ads_url_desc_channel') || 'URL del Canal (Ej: @MiCanal)')}
              {taskType === 'promo' && 'Dirige tráfico a tu sitio web, video o app.'}
            </p>
            <input style={neon.input} placeholder="https://..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />

            {taskType === 'promo' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <label style={neon.label}>Código de Validación (Opcional)</label>
                <input style={{...neon.input, background: 'rgba(0,0,0,0.3)'}} placeholder="Ej: VERIFICADO2026" value={validationCode} onChange={(e) => setValidationCode(e.target.value)} />
                <p style={{ fontSize: '11px', color: '#06B6D4', marginTop: '8px', fontWeight: '600', lineHeight: '1.4' }}>Obliga a los usuarios a buscar este código oculto en tu web para cobrar (Anti-Bots).</p>
              </div>
            )}
          </div>
          <button onClick={handleVerifyUrl} disabled={isVerifying} style={neon.btnPrimary}>{isVerifying ? 'VERIFICANDO...' : 'CONTINUAR ➔'}</button>
        </div>
      )}

      {currentStepId === 'token' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#F9FAFB', marginBottom: '16px', letterSpacing: '0.5px' }}>AUTENTICACIÓN DEL BOT</h3>
          <div style={neon.card}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>Si tu enlace es de un bot, puedes proporcionar el token para automatizar verificaciones profundas (Opcional).</p>
            <input style={neon.input} placeholder="Token de @BotFather" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={nextStep} style={{...neon.btnSecondary, flex: 1}}>OMITIR</button>
            <button onClick={nextStep} style={{...neon.btnPrimary, flex: 1}}>CONTINUAR ➔</button>
          </div>
        </div>
      )}

      {currentStepId === 'budget' && (
        <div className="fade-in" style={neon.calcContainer}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>PRESUPUESTO DE CAMPAÑA</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button onClick={() => setCompletions(100)} style={neon.pillButton(completions === 100)}>100</button>
            <button onClick={() => setCompletions(500)} style={neon.pillButton(completions === 500)}>500</button>
            <button onClick={() => setCompletions(1000)} style={neon.pillButton(completions === 1000)}>1K</button>
            <button onClick={() => setCompletions(5000)} style={neon.pillButton(completions === 5000)}>5K</button>
          </div>

          <span style={neon.label}>USUARIOS A CONTRATAR</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button onClick={() => setCompletions(p => Math.max(10, Number(p) - 10))} style={neon.btnActionCalc}>-</button>
            <input 
              type="number" 
              value={completions} 
              onChange={(e) => setCompletions(e.target.value === '' ? '' : Number(e.target.value))} 
              onBlur={(e) => setCompletions(Math.max(10, Number(e.target.value) || 10))} 
              style={neon.inputCalc} 
            />
            <button onClick={() => setCompletions(p => Number(p) + 10)} style={neon.btnActionCalc}>+</button>
          </div>

          <span style={neon.label}>PAGO POR USUARIO (GEMAS)</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button onClick={() => safeSetReward(Number(rewardPerGema) - 0.1)} style={neon.btnActionCalc}>-</button>
            <input 
              type="number" 
              step="0.1" 
              min="1" 
              max="2.5" 
              value={rewardPerGema} 
              onChange={(e) => setRewardPerGema(e.target.value === '' ? '' : Number(e.target.value))} 
              onBlur={(e) => safeSetReward(e.target.value)} 
              style={neon.inputCalc} 
            />
            <button onClick={() => safeSetReward(Number(rewardPerGema) + 0.1)} style={neon.btnActionCalc}>+</button>
          </div>

          <div style={neon.summaryBox}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>1. Asignación a red: <b style={{color:'#D1D5DB'}}>{baseCostGemas} 💎</b></div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>2. Distribución matriz (20%): <b style={{color:'#D1D5DB'}}>{referralFeeGemas} 💎</b></div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '12px', fontWeight: '500' }}>3. Gastos operativos (10%): <b style={{color:'#D1D5DB'}}>{adminFeeGemas} 💎</b></div>
              <div style={{ fontWeight: '800', fontSize: '11px', color: '#F3F4F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inversión Requerida:</div>
            </div>
            <div style={{ textAlign: 'right', paddingLeft: '10px' }}>
              <div style={{ fontWeight: '900', fontSize: '22px', color: '#06B6D4' }}>{totalGemasCost} 💎</div>
              <div style={{ fontSize: '12px', color: '#3B82F6', fontWeight: '700' }}>${campaignCostUsdt.toFixed(2)} USDT</div>
            </div>
          </div>

          {depositBalanceUsdt >= campaignCostUsdt ? (
            <button onClick={handleCreateTaskWithVault} disabled={isGenerating} style={neon.actionBtn}>
              {isGenerating ? 'PROCESANDO...' : 'ACTIVAR CAMPAÑA'}
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '13px', color: '#EF4444', fontWeight: '700' }}>Saldo USDT Insuficiente</div>
              <button onClick={() => { setRechargeAmount(Math.ceil(campaignCostUsdt)); setRecharging(true); }} style={neon.actionBtnDanger}>RECARGAR BÓVEDA</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
