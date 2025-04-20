// src/config/api.ts

// Configuración de URLs para la API
export const API_CONFIG = {
    // URL base para los servicios de la API
    // BASE_URL: "https://phpstack-1445940-5416935.cloudwaysapps.com/api/",
     BASE_URL: "https://desayunosdifcoah.com/api/",
    
    // URLs comentadas para entornos de desarrollo/pruebas
    // DEV_URL: "http://10.122.161.70:8888/Despensas/api/",
    // IMAGES_URL: "http://192.168.1.69:8888/TakeEatEasy3/files/cropped/",
    // IMAGES_PROD_URL: "https://dobleslash.com/TakeEatEasy3/files/cropped/",
  };
  
  // Función auxiliar para construir URLs completas
  export const buildUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
  };
  
  // Exportación directa para compatibilidad con código existente
  export const URL_SERVICIOS = API_CONFIG.BASE_URL;
  