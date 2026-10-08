// src/config/api.ts

// Configuración de URLs para la API
export const API_CONFIG = {
    // URL base para los servicios de la API
    // TEST
     BASE_URL: "https://phpstack-358253-5234722.cloudwaysapps.com/api/",
    // PROD Staging
    // BASE_URL: "https://phpstack-358253-5935770.cloudwaysapps.com/api/",
   // BASE_URL: "https://desayunosdifcoah.com/api/",
    
    // URLs comentadas para entornos de desarrollo/pruebas
    // DEV_URL: "http://10.122.161.70:8888/Despensas/api/",
    // IMAGES_URL: "http://192.168.1.69:8888/TakeEatEasy3/files/cropped/",
    // IMAGES_PROD_URL: "https://dobleslash.com/TakeEatEasy3/files/cropped/",
  };

  export const API_TIMEOUTS = {
    LOGIN: 20000,
    DISTRIBUCION: 60000,
  };
 
  export const FORM_URLENCODED_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  export const buildFormBody = (values: Record<string, string>): URLSearchParams => {
    const body = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      body.append(key, value);
    });

    return body;
  };

  // Función auxiliar para construir URLs completas
  export const buildUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
  };

  // Exportación directa para compatibilidad con código existente
  export const URL_SERVICIOS = API_CONFIG.BASE_URL;
