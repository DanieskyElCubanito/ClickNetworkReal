import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import WebApp from '@twa-dev/sdk'
import { Buffer } from 'buffer'

// FIX CRÍTICO: Definir Buffer globalmente para que TON SDK no falle
window.Buffer = window.Buffer || Buffer;

// INICIALIZACIÓN "TOP GLOBAL" - TELEGRAM SDK
WebApp.ready(); // Le avisa a Telegram que la app ya cargó
WebApp.expand(); // Obliga a la Mini App a abrirse en pantalla completa SIEMPRE
WebApp.setHeaderColor('#0a0314'); // Pinta la barra superior del celular con nuestro fondo Neón
WebApp.setBackgroundColor('#0a0314'); // Pinta el fondo base para evitar pantallazos blancos

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
