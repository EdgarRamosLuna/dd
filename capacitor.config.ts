import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'desayunos',
  appName: 'Desayunos',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#E94B35',
      style: 'DARK'
    },
    SplashScreen: {
      // Duración en ms que se muestra al inicio antes de ocultarse
      launchShowDuration: 3000,
      // Si true, se oculta automáticamente pasado el tiempo anterior
      launchAutoHide: true,
      // Color de fondo detrás de la imagen (en ARGB)
      backgroundColor: '#ffffff',
      // Nombre del recurso drawable (res/drawable/splash.png)
      androidSplashResourceName: 'splash',
      // Nombre del recurso para iOS
      iosSplashResourceName: 'Default',
      // No mostrar spinner por defecto
      showSpinner: false
    }
  }
};

export default config;
