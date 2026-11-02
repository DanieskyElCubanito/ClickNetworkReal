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
  const openTonkeeper = () => { try { WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor((rechargeAmount/liveGramUsd) * 1e9)}`); } catch (e) { toast.error("Aplicación no detectada."); } };

  if (recharging) {
    return (
      <div className="fade-in">
        {checkoutView ? (
          <div className="fade-in" style={neon.calcContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#00f0ff', textTransform: 'uppercase' }}>Pasarela Segura</h3>
              <button onClick={cancelCheckout} style={{ background: 'rgba(255, 65, 180, 0.2)', border: '1px solid #ff1493', borderRadius: '10px', width: '30px', height: '30px', color: '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>✕</button>
            </div>

            {rechargeMethod === 'gram' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff99dd', textTransform: 'uppercase' }}>Transfiera monto exacto</div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#00f0ff', margin: '8px 0' }}>{(rechargeAmount/liveGramUsd).toFixed(2)} GRAM</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>A la dirección asignada:</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '16px', border: '1px dashed #ff1493', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', color: '#ffffff' }}>
                  {tempWallet}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button onClick={() => copyWallet(tempWallet)} style={{ flex: 1, padding: '14px', background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '2px solid #00f0ff', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>COPIAR</button>
                  <button onClick={openTonkeeper} style={{ flex: 1, padding: '14px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>TONKEEPER</button>
                </div>
                <button onClick={handleVerifyPayment} style={{ width: '100%', padding: '16px', background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'pointer' }}>
                  {TaskIcons.check} CONFIRMAR PAGO
                </button>
              </>
            )}

            {rechargeMethod === 'usdt' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff99dd', textTransform: 'uppercase' }}>Transfiera (BSC/BEP20)</div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#00ffaa', margin: '8px 0' }}>${rechargeAmount.toFixed(2)} USDT</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>Contrato generado:</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '16px', border: '1px dashed #00ffaa', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', color: '#ffffff' }}>
                  {tempWallet}
                </div>
                <button onClick={() => copyWallet(tempWallet)} style={{ width: '100%', padding: '12px', background: 'rgba(0, 255, 170, 0.1)', color: '#00ffaa', border: '1px solid #00ffaa', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>📋 COPIAR DIRECCIÓN</button>
                <button onClick={handleVerifyPayment} disabled={isGenerating} style={{ width: '100%', padding: '16px', background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'pointer' }}>
                  {isGenerating ? 'VERIFICANDO...' : 'VALIDAR PAGO'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button onClick={() => setRecharging(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '6px 12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>◀ REGRESAR</button>
              <div style={{ fontSize: '12px', fontWeight: '900', color: '#00f0ff' }}>FONDOS</div>
            </div>
            <div style={neon.calcContainer}>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>Bóveda Publicitaria</h2>
              <div style={{ textAlign: 'center', marginBottom: '20px', color: '#aaa', fontSize: '12px' }}>
                Balance actual: <b style={{color:'#00ffaa'}}>${depositBalanceUsdt.toFixed(2)} USDT</b>. (No retirable).
              </div>

              <span style={neon.label}>Volumen USDT</span>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setRechargeAmount(p => Math.max(5, p - 5))} style={neon.btnActionCalc}>-</button>
                <input type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value) || 0)} style={neon.inputCalc} />
                <button onClick={() => setRechargeAmount(p => p + 5)} style={neon.btnActionCalc}>+</button>
              </div>

              <span style={neon.label}>Protocolo</span>
              <div style={{ display: 'flex', background: 'rgba(15, 5, 28, 0.8)', borderRadius: '12px', border: '2px solid #8a2be2', overflow: 'hidden', marginBottom: '20px' }}>
                <button onClick={() => setRechargeMethod('gram')} style={{ flex: 1, padding: '12px', border: 'none', background: rechargeMethod === 'gram' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: rechargeMethod === 'gram' ? '#ffffff' : '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>GRAM (TON)</button>
                <button onClick={() => setRechargeMethod('usdt')} style={{ flex: 1, padding: '12px', borderLeft: '1px solid #8a2be2', border: 'none', background: rechargeMethod === 'usdt' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: rechargeMethod === 'usdt' ? '#ffffff' : '#ff99dd', fontWeight: '900', cursor: 'pointer' }}>USDT (BEP20)</button>
              </div>

              <div style={neon.summaryBox}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff' }}>TOTAL ORDEN:</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '900', fontSize: '20px', color: '#00f0ff' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {currentStepIndex > 0 ? (
          <button onClick={prevStep} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '6px 12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>◀</button>
        ) : <div />}
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#00f0ff', letterSpacing: '1px' }}>PASO {currentStepIndex + 1} DE {totalSteps}</div>
        <button onClick={closeWizard} style={{ background: '#ff1493', border: 'none', borderRadius: '10px', padding: '6px 12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={neon.progressBox}>{stepsFlow.map((step, idx) => <div key={idx} style={neon.progressStep(idx <= currentStepIndex)} />)}</div>

      {currentStepId === 'type' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Seleccione el objetivo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TASK_TYPES.map((type) => (
              <div key={type.id} onClick={() => { setTaskType(type.id); nextStep(); }}
                style={{ ...neon.cardInteractive, borderColor: taskType === type.id ? type.color : '#8a2be2', background: taskType === type.id ? `linear-gradient(135deg, ${type.color}22, rgba(18, 7, 36, 0.9))` : neon.cardInteractive.background }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{type.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900', lineHeight: '1.2' }}>{type.title}</div>
                  <div style={{ color: '#ff99dd', fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentStepId === 'url' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Enlace Destino</h3>
          <div style={neon.card}>
            <p style={{ color: '#ff99dd', fontSize: '13px', marginBottom: '16px', lineHeight: '1.4', fontWeight: 'bold' }}>
              {taskType === 'bot' && (t('ads_url_desc_bot') || 'URL del Bot')}
              {taskType === 'channel' && (t('ads_url_desc_channel') || 'URL del Canal')}
              {taskType === 'promo' && 'Dirige tráfico a tu sitio web, video o app.'}
            </p>
            <input style={neon.input} placeholder="https://t.me/..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
            
            {taskType === 'promo' && (
              <div style={{ marginTop: '16px', borderTop: '1px dashed #8a2be2', paddingTop: '16px' }}>
                <label style={neon.label}>Código de Validación (Opcional)</label>
                <input style={{...neon.input, background: 'rgba(0,0,0,0.4)', borderColor: '#00f0ff'}} placeholder="Ej: MIBOT2026" value={validationCode} onChange={(e) => setValidationCode(e.target.value)} />
                <p style={{ fontSize: '11px', color: '#00f0ff', marginTop: '6px', fontWeight: 'bold' }}>Obliga a los usuarios a buscar este código en tu web para cobrar.</p>
              </div>
            )}
          </div>
          <button onClick={handleVerifyUrl} disabled={isVerifying} style={neon.btnPrimary}>{isVerifying ? 'VERIFICANDO...' : 'VALIDAR ➔'}</button>
        </div>
      )}

      {currentStepId === 'token' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Autenticación del Bot</h3>
          <div style={{...neon.card, borderColor: '#ff41b4'}}>
            <input style={{...neon.input, borderColor: '#ff41b4'}} placeholder="Token de @BotFather" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={nextStep} style={{...neon.btnSecondary, flex: 1, border: '1px solid #8a2be2', color: '#8a2be2'}}>OMITIR</button>
            <button onClick={nextStep} style={{...neon.btnPrimary, flex: 1}}>CONTINUAR ➔</button>
          </div>
        </div>
      )}

      {currentStepId === 'budget' && (
        <div className="fade-in" style={neon.calcContainer}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>Configuración Final</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => setCompletions(100)} style={neon.pillButton(completions === 100)}>100</button>
            <button onClick={() => setCompletions(500)} style={neon.pillButton(completions === 500)}>500</button>
            <button onClick={() => setCompletions(1000)} style={neon.pillButton(completions === 1000)}>1K</button>
            <button onClick={() => setCompletions(5000)} style={neon.pillButton(completions === 5000)}>5K</button>
          </div>

          <span style={neon.label}>Usuarios a contratar</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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

          <span style={neon.label}>Pago por usuario (Gemas)</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setRewardPerGema(p => Math.max(1, Number((Number(p) - 0.1).toFixed(1))))} style={neon.btnActionCalc}>-</button>
            <input 
              type="number" 
              step="0.1" 
              min="1" 
              max="2.5" 
              value={rewardPerGema} 
              onChange={(e) => setRewardPerGema(e.target.value === '' ? '' : Number(e.target.value))} 
              onBlur={(e) => setRewardPerGema(Math.min(2.5, Math.max(1, Number(e.target.value) || 1)))} 
              style={neon.inputCalc} 
            />
            <button onClick={() => setRewardPerGema(p => Math.min(2.5, Number((Number(p) + 0.1).toFixed(1))))} style={neon.btnActionCalc}>+</button>
          </div>

          <div style={neon.summaryBox}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '2px' }}>1. Asignación a usuarios: {baseCostGemas} 💎</div>
              <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '2px' }}>2. Distribución a red (20%): {referralFeeGemas} 💎</div>
              <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '6px' }}>3. Comisión operativa (10%): {adminFeeGemas} 💎</div>
              <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff' }}>INVERSIÓN TOTAL REQUERIDA:</div>
            </div>
            <div style={{ textAlign: 'right', paddingLeft: '10px' }}>
              <div style={{ fontWeight: '900', fontSize: '20px', color: '#00f0ff' }}>{totalGemasCost} 💎</div>
              <div style={{ fontSize: '12px', color: '#00f0ff', opacity: 0.8 }}>${campaignCostUsdt.toFixed(2)} USDT</div>
            </div>
          </div>

          {depositBalanceUsdt >= campaignCostUsdt ? (
            <button onClick={handleCreateTaskWithVault} disabled={isGenerating} style={neon.actionBtn}>
              {isGenerating ? 'PROCESANDO...' : '✔️ ACTIVAR CAMPAÑA'}
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '12px', color: '#ff4b4b', fontWeight: 'bold' }}>Faltan USDT en la Bóveda</div>
              <button onClick={() => { setRechargeAmount(Math.ceil(campaignCostUsdt)); setRecharging(true); }} style={neon.actionBtnDanger}>RECARGAR BÓVEDA</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
