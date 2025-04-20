// src/hooks/useUsuario.ts
import { useState, useCallback } from 'react';
import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { URL_SERVICIOS } from '../config/api';

interface LoginResponse {
  error: boolean;
  mensaje?: string;
  id_usuario?: string;
  usuario?: string;
}

export const useUsuario = () => {
  const [idUsuario, setIdUsuario] = useState<string | null>(null);
  console.log("🚀 ~ useUsuario ~ idUsuario:", idUsuario)
  const [ingresando, setIngresando] = useState<boolean>(false);
  const [correo, setCorreo] = useState<string>('');
  const [usuario, setUsuario] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del usuario desde el storage al inicializar
  const cargarDatosUsuario = useCallback(async () => {
    try {
      const usuarioValue = await Preferences.get({ key: 'usuario' });
      const idUsuarioValue = await Preferences.get({ key: 'usuario_id' });
      
      if (usuarioValue.value) {
        setUsuario(usuarioValue.value);
      }
      
      if (idUsuarioValue.value) {
        setIdUsuario(idUsuarioValue.value);
      }
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
    }
  }, []);

  // Función para iniciar sesión
  const ingresar = useCallback(async (usuarioInput: string, contrasena: string) => {
    setIngresando(true);
    setError(null);
    
    try {
      // Crear FormData para enviar los datos (equivalente a URLSearchParams)
      const formData = new FormData();
      formData.append('usuario', usuarioInput);
      formData.append('contrasena', contrasena);
      
      // Configurar timeout
      const url = `${URL_SERVICIOS}usuario/login`;
      const response = await axios.post<LoginResponse>(url, formData, {
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
        // Guardar datos del usuario
        setIdUsuario(data.id_usuario || null);
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
      // Manejar errores de red o timeout
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
    setIdUsuario(null);
    setUsuario('');
    setCorreo('');
    
    // Limpiar el storage
    await Preferences.remove({ key: 'usuario' });
    await Preferences.remove({ key: 'usuario_id' });
  }, []);

  return {
    idUsuario,
    ingresando,
    correo,
    usuario,
    error,
    ingresar,
    cerrarSesion,
    cargarDatosUsuario
  };
};
