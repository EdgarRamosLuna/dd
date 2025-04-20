import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';
import { SplashScreen } from '@capacitor/splash-screen';

const initializeApp = async () => {
  // Reemplaza esta línea con cualquier inicialización necesaria
  console.log('App initialized');

  // Oculta el splash screen
  SplashScreen.hide();
};

initializeApp();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);