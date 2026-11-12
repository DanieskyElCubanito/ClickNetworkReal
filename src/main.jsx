import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import WebApp from '@twa-dev/sdk';
import { Buffer } from 'buffer';

// FIX CRÍTICO: Definir Buffer globalmente para que TON SDK y operaciones criptográficas no fallen
window.Buffer = window.Buffer || Buffer;

// INICIALIZACIÓN "TOP GLOBAL" - TELEGRAM SDK
WebApp.ready(); // Le avisa a Telegram que la app ya cargó
WebApp.expand(); // Obliga a la Mini App a abrirse en pantalla completa SIEMPRE

// 🔥 ADAPTACIÓN FINTECH: Sincronizamos la barra nativa del móvil con el nuevo fondo oscuro
WebApp.setHeaderColor('#050505'); // Pinta la barra superior del celular (hora, batería) con nuestro fondo de obsidiana
WebApp.setBackgroundColor('#050505'); // Pinta el fondo base nativo para evitar pantallazos blancos en la carga

// Opcional pero recomendado: Bloquear el cierre accidental al deslizar hacia abajo
if (WebApp.disableVerticalSwipes) {
  WebApp.disableVerticalSwipes();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
