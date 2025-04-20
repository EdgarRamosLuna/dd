// src/contexts/UsuarioContext.tsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useContext
  } from 'react';
  import axios from 'axios';
  import { Preferences } from '@capacitor/preferences';
  import { URL_SERVICIOS } from '../config/api';
  
  interface UsuarioContextProps {
    idUsuario: string | null;
    usuario: string;
    correo: string;
    ingresando: boolean;
    error: string | null;
    ingresar: (usuarioInput: string, contrasena: string) => Promise<any>;
    cerrarSesion: () => Promise<void>;
    cargarDatosUsuario: () => Promise<void>;
    setidUsuario: (id: string) => void;
  }
  
  const UsuarioContext = createContext<UsuarioContextProps | undefined>(undefined);
  
  export const UsuarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [idUsuario, setidUsuario] = useState<string | null>(null);
    const [usuario, setUsuario] = useState<string>('');
    const [correo, setCorreo] = useState<string>('');
    const [ingresando, setIngresando] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
  
    // Cargar datos del usuario desde el storage al iniciar
    const cargarDatosUsuario = useCallback(async () => {
      try {
        const usuarioValue = await Preferences.get({ key: 'usuario' });
        const idUsuarioValue = await Preferences.get({ key: 'usuario_id' });
        
        if (usuarioValue.value) {
          setUsuario(usuarioValue.value);
        }
        
        if (idUsuarioValue.value) {
          setidUsuario(idUsuarioValue.value);
        }
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err);
      }
    }, []);
  
    useEffect(() => {
      cargarDatosUsuario();
    }, [cargarDatosUsuario]);
  
    // Guardar el ID de usuario en el storage cuando cambie
    useEffect(() => {
      const saveidUsuario = async () => {
        try {
          if (idUsuario) {
            await Preferences.set({ key: 'usuario_id', value: idUsuario });
          }
        } catch (error) {
          console.error('Error al guardar el ID de usuario:', error);
        }
      };
  
      saveidUsuario();
    }, [idUsuario]);
  
    // Función para iniciar sesión
    const ingresar = useCallback(async (usuarioInput: string, contrasena: string) => {
      setIngresando(true);
      setError(null);
  
      try {
        // Crear FormData para enviar los datos
        const formData = new FormData();
        formData.append('usuario', usuarioInput);
        formData.append('contrasena', contrasena);
  
        const url = `${URL_SERVICIOS}usuario/login`;
        const response = await axios.post(url, formData, {
          timeout: 8000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
  
        const data = response.data;
  
        if (data.error) {
          setError(data.mensaje || 'Error desconocido');
          return { error: true, mensaje: data.mensaje };
        } else {
          // Actualizamos el estado con los datos del usuario
          setidUsuario(data.id_usuario || null);
          setUsuario(data.usuario || '');
  
          // Guardar en el Storage
          if (data.usuario) {
            await Preferences.set({ key: 'usuario', value: data.usuario });
          }
  
          if (data.id_usuario) {
            await Preferences.set({ key: 'usuario_id', value: data.id_usuario });
          }
  
          return data;
        }
      } catch (err: any) {
        const errorMessage = err.code === 'ECONNABORTED'
          ? 'Tiempo de espera agotado. Verifica tu conexión.'
          : 'Error de conexión';
  
        setError(errorMessage);
        return { error: true, mensaje: errorMessage };
      } finally {
        setIngresando(false);
      }
    }, []);
  
    // Función para cerrar sesión
    const cerrarSesion = useCallback(async () => {
      setidUsuario(null);
      setUsuario('');
      setCorreo('');
  
      // Limpiar el storage
      await Preferences.remove({ key: 'usuario' });
      await Preferences.remove({ key: 'usuario_id' });
    }, []);
  
    return (
      <UsuarioContext.Provider
        value={{
          idUsuario,
          usuario,
          correo,
          ingresando,
          error,
          ingresar,
          cerrarSesion,
          cargarDatosUsuario,
          setidUsuario
        }}
      >
        {children}
      </UsuarioContext.Provider>
    );
  };
  
  export const useUsuario = () => {
    const context = useContext(UsuarioContext);
    if (!context) {
      throw new Error('useUsuario debe ser usado dentro de un UsuarioProvider');
    }
    return context;
  };
  