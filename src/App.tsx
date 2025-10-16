import React, { useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'; // ← Importa también el enum
import './app.css';

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Institucion from './pages/Institucion';

// Contextos
import { UsuarioProvider, useUsuario } from './contexts/UsuarioContext';
import { DistribucionProvider } from './contexts/DistribucionContext';

// Estilos Ionic
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

const AppRoutes: React.FC = () => {
  const { idUsuario, sesionCargada } = useUsuario();

  useEffect(() => {
    const hideSplash = async () => {
      try {
        if (sesionCargada) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          await SplashScreen.hide();
        }
      } catch (error) {
        console.error('Error al ocultar el splash screen:', error);
      }
    };

    hideSplash();
  }, [sesionCargada]);

  if (!sesionCargada) {
    return null;
  }

  return (
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home" component={Home} />
        <Route exact path="/login" component={Login} />
        <Route exact path="/institucion/:id" component={Institucion} />
        <Route exact path="/">
          <Redirect to={idUsuario ? "/home" : "/login"} />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const initApp = async () => {
      try {
        // Estilo del status bar
        await StatusBar.setStyle({ style: Style.Default });

        // Configuración de teclado (ahora usando el enum)
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });   // ← aquí
        await Keyboard.setScroll({ isDisabled: false });
      } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
      }
    };

    initApp();
  }, []);

  // Manejo del botón de retroceso en Android
  useEffect(() => {
    let listenerCleanup: (() => void) | undefined;
    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('backButton', () => {
        // Definir acción al presionar "atrás"
      });
      listenerCleanup = () => listener.remove();
    };
    setupListener();
    return () => listenerCleanup && listenerCleanup();
  }, []);

  return (
    <IonApp>
      <UsuarioProvider>
        <DistribucionProvider>
          <AppRoutes />
        </DistribucionProvider>
      </UsuarioProvider>
    </IonApp>
  );
};

export default App;
