// src/contexts/DistribucionContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

interface DistribucionContextProps {
  distDatos: any[];
  setDistDatos: (datos: any[]) => void;
  actualizarElemento: (id: string, nuevosDatos: any) => Promise<{ distDatos: any[] }>;
  cargarDatos: () => Promise<void>;
  guardarDatos: () => Promise<void>;
}

const DistribucionContext = createContext<DistribucionContextProps | undefined>(undefined);

export const DistribucionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [distDatos, setDistDatos] = useState<any[]>([]);

  // Cargar datos desde el almacenamiento al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar datos desde el almacenamiento
  const cargarDatos = async () => {
    try {
      const { value } = await Preferences.get({ key: 'distDatos' });
      if (value) {
        setDistDatos(JSON.parse(value));
      }
    } catch (error) {
      console.error('Error al cargar datos de distribución:', error);
    }
  };

  // Guardar datos en el almacenamiento
  const guardarDatos = async () => {
    try {
      await Preferences.set({ key: 'distDatos', value: JSON.stringify(distDatos) });
    } catch (error) {
      console.error('Error al guardar datos de distribución:', error);
    }
  };

  // Actualizar un elemento específico
  const actualizarElemento = async (id: string, nuevosDatos: any) => {
    const nuevosDatosDist = [...distDatos];
    const index = nuevosDatosDist.findIndex(item => item.dist_inst_id === id);
    
    if (index !== -1) {
      nuevosDatosDist[index] = nuevosDatos;
      setDistDatos(nuevosDatosDist);
      await guardarDatos();
    }
    
    return { distDatos: nuevosDatosDist };
  };

  return (
    <DistribucionContext.Provider value={{ 
      distDatos, 
      setDistDatos, 
      actualizarElemento,
      cargarDatos,
      guardarDatos
    }}>
      {children}
    </DistribucionContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useDistribucion = () => {
  const context = useContext(DistribucionContext);
  if (context === undefined) {
    throw new Error('useDistribucion debe ser usado dentro de un DistribucionProvider');
  }
  return context;
};
