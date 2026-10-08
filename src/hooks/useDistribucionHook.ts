// src/hooks/useDistribucion.ts
import { useState, useCallback, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { API_TIMEOUTS } from "../config/api";
import { postForm } from "../services/apiClient";
import { useDistribucion } from "../contexts/DistribucionContext";
import { useLocation } from "react-router";

interface DistribucionData {
  error: boolean;
  mensaje?: string;
  datos?: any[];
}

export const useDistribucionHook = () => {
  //const [distDatos, setDistDatos] = useState<any[]>([]);
  const { distDatos, setDistDatos } = useDistribucion();
  console.log("🚀 ~ useDistribucionHook ~ distDatos:", distDatos)
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos de distribución desde el storage
  const cargarDatosDistribucion = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: "distDatos" });
      if (value) {
        const datos = JSON.parse(value);
        setDistDatos(datos);
        return datos;
      }
      return [];
    } catch (err: any) {
      // Añadir tipo any
      console.error("Error al cargar datos de distribución:", err);
      return [];
    }
  }, []);

  // Obtener datos de distribución del servidor
  const getDatosDist = useCallback(async (usuarioId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await postForm<DistribucionData>("usuario/get_ruta", {
        usuario_id: usuarioId
      }, API_TIMEOUTS.DISTRIBUCION);

      if (data.error) {
        setError(data.mensaje || "Error desconocido");
        return { error: true, mensaje: data.mensaje };
      } else {
        // Respuesta exitosa: distinguir entre con datos y sin datos
        const lista = Array.isArray(data.datos) ? data.datos : [];

        // Persistimos siempre un arreglo (incluso vacío)
        setDistDatos(lista);
        await Preferences.set({ key: "distDatos", value: JSON.stringify(lista) });

        if (lista.length === 0) {
          // Éxito sin datos: devolvemos mensaje específico sin marcar error
          return { error: false, datos: [], mensaje: "No hay información disponible" };
        }

        return { error: false, datos: lista };
      }
    } catch (err: any) {
      // Añadir tipo any
      // Manejar errores de red o timeout
      const errorMessage =
        err.code === "ECONNABORTED"
          ? "Tiempo de espera agotado. Verifica tu conexión."
          : "Error de conexión";

      setError(errorMessage);
      return { error: true, mensaje: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Subir datos de distribución al servidor
  const subirDatosDist = useCallback(
    async (usuarioId: string, datosDist: any[]) => {
      setLoading(true);
      setError(null);

      try {
        const data = await postForm<DistribucionData>("usuario/subirDatosDist", {
          usuario_id: usuarioId,
          datosDist: JSON.stringify(datosDist)
        }, API_TIMEOUTS.DISTRIBUCION);

        if (data.error) {
          setError(data.mensaje || "Error desconocido");
          return { error: true, mensaje: data.mensaje };
        } else {
          return data;
        }
      } catch (err: any) {
        // Añadir tipo any
        // Manejar errores de red o timeout
        const errorMessage =
          err.code === "ECONNABORTED"
            ? "Tiempo de espera agotado. Verifica tu conexión."
            : "Error de conexión";

        setError(errorMessage);
        return { error: true, mensaje: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Filtrar elementos por término de búsqueda
  const filterItems = useCallback(
    (searchTerm: string) => {
      return distDatos.filter((item) => {
        return (
          item.institucion.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1
        );
      });
    },
    [distDatos]
  );

  const revisarDatosStorage = async () => {
    try {
      const { value: distDatosValue } = await Preferences.get({
        key: "distDatos",
      });      
      setDistDatos(JSON.parse(distDatosValue || "[]"));
      // const { value: imagenesSubirValue } = await Preferences.get({
      //   key: "imagenes_subir",
      // });
      
    } catch (error) {
      console.error("Error al leer el almacenamiento:", error);
    }
  };
  const location = useLocation();
  const { pathname } = location;
  useEffect(() => {    
    revisarDatosStorage();
  }, [pathname]); // Execute when distDatos changes

  return {
    distDatos,
    loading,
    error,
    getDatosDist,
    subirDatosDist,
    filterItems,
    cargarDatosDistribucion,
  };
};
