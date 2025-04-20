import React, { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Preferences } from '@capacitor/preferences';
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
import { UsuarioProvider } from './contexts/UsuarioContext';
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Estilo del status bar
        await StatusBar.setStyle({ style: Style.Default });

        // Configuración de teclado (ahora usando el enum)
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });   // ← aquí
        await Keyboard.setScroll({ isDisabled: false });

        // Validar usuario
        const { value: usuarioId } = await Preferences.get({ key: 'usuario_id' });

        // Espera breve antes de ocultar splash
        await new Promise(resolve => setTimeout(resolve, 300));
        await SplashScreen.hide();

        setIsAuthenticated(usuarioId !== null && usuarioId !== '' && usuarioId !== '0');
      } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        setIsAuthenticated(false);
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

  // Mientras se carga el estado de autenticación
  if (isAuthenticated === null) {
    return <IonApp />;
  }

  return (
    <IonApp>
      <UsuarioProvider>
        <DistribucionProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route exact path="/home" component={Home} />
              <Route exact path="/login" component={Login} />
              <Route exact path="/institucion/:id" component={Institucion} />
              <Route exact path="/">
                <Redirect to={isAuthenticated ? "/home" : "/login"} />
              </Route>
            </IonRouterOutlet>
          </IonReactRouter>
        </DistribucionProvider>
      </UsuarioProvider>
    </IonApp>
  );
};

export default App;
