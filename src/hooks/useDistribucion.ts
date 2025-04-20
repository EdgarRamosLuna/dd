// src/hooks/useDistribucion.ts
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { URL_SERVICIOS } from '../config/api';

interface DistribucionData {
  error: boolean;
  mensaje?: string;
  datos?: any[];
}

export const useDistribucion = () => {
  const [distDatos, setDistDatos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos de distribución desde el storage
  const cargarDatosDistribucion = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: 'distDatos' });
      if (value) {
        const datos = JSON.parse(value);
        setDistDatos(datos);
        return datos;
      }
      return [];
    } catch (err: any) { // Añadir tipo any
      console.error('Error al cargar datos de distribución:', err);
      return [];
    }
  }, []);

  // Obtener datos de distribución del servidor
  const getDatosDist = useCallback(async (usuarioId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Crear FormData para enviar los datos
      const formData = new FormData();
      formData.append('usuario_id', usuarioId);
      
      const url = `${URL_SERVICIOS}usuario/get_ruta`;
      const response = await axios.post<DistribucionData>(url, formData, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (data.error) {
        setError(data.mensaje || 'Error desconocido');
        return { error: true, mensaje: data.mensaje };
      } else {
        // Guardar datos en el estado y en el storage
        if (data.datos) {
          setDistDatos(data.datos);
          await Preferences.set({
            key: 'distDatos',
            value: JSON.stringify(data.datos)
          });
        }
        
        return data;
      }
    } catch (err: any) { // Añadir tipo any
      // Manejar errores de red o timeout
      const errorMessage = err.code === 'ECONNABORTED' 
        ? 'Tiempo de espera agotado. Verifica tu conexión.' 
        : 'Error de conexión';
      
      setError(errorMessage);
      return { error: true, mensaje: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Subir datos de distribución al servidor
  const subirDatosDist = useCallback(async (usuarioId: string, datosDist: any[]) => {
    setLoading(true);
    setError(null);
    
    try {
      // Crear FormData para enviar los datos
      const formData = new FormData();
      formData.append('usuario_id', usuarioId);
      formData.append('datosDist', JSON.stringify(datosDist));
      
      const url = `${URL_SERVICIOS}usuario/subirDatosDist`;
      const response = await axios.post<DistribucionData>(url, formData, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = response.data;
      
      if (data.error) {
        setError(data.mensaje || 'Error desconocido');
        return { error: true, mensaje: data.mensaje };
      } else {
        return data;
      }
    } catch (err: any) { // Añadir tipo any
      // Manejar errores de red o timeout
      const errorMessage = err.code === 'ECONNABORTED' 
        ? 'Tiempo de espera agotado. Verifica tu conexión.' 
        : 'Error de conexión';
      
      setError(errorMessage);
      return { error: true, mensaje: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar elementos por término de búsqueda
  const filterItems = useCallback((searchTerm: string) => {
    return distDatos.filter((item) => {
      return item.institucion.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
    });
  }, [distDatos]);

  const revisarDatosStorage = async () => {
    try {
      const { value: distDatosValue } = await Preferences.get({ key: 'distDatos' });
      console.log('distDatos:', distDatosValue);
  
      const { value: imagenesSubirValue } = await Preferences.get({ key: 'imagenes_subir' });
      console.log('imagenes_subir:', imagenesSubirValue);
    } catch (error) {
      console.error('Error al leer el almacenamiento:', error);
    }
  };

  
  useEffect(() => {
    revisarDatosStorage();
  
    return () => {
      
    }
  }, [])
  

  return {
    distDatos,
    loading,
    error,
    getDatosDist,
    subirDatosDist,
    filterItems,
    cargarDatosDistribucion
  };
};
