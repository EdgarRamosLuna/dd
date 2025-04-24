// src/pages/Home.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonSpinner,
  IonLoading,
  useIonAlert,
  useIonToast,
  IonButtons,
  IonImg,
  IonButton,
} from "@ionic/react";
import { useHistory } from "react-router-dom";


import { Preferences } from "@capacitor/preferences";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Http } from "@capacitor-community/http";
import { URL_SERVICIOS } from "../config/api";
import "./Home.css";
import { useUsuario } from "../contexts/UsuarioContext";

import { Capacitor } from "@capacitor/core";
import { useDistribucionHook } from "../hooks/useDistribucionHook";

const Home: React.FC = () => {
  // Estados equivalentes a las propiedades de la clase
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<
    {
      dist_inst_id: string;
      institucion: string;
      clave: string;
      save_chofer: string;
    }[]
  >([]);
  const [sinInstituciones, setSinInstituciones] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const mostrarAlerta = (
    mensaje: string,
    tipo: "success" | "error" = "success"
  ) => {
    setAlertMessage(mensaje);
    setAlertType(tipo);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
  };
  // Referencias para manejar timeouts y otros valores que no deben causar re-renders
  const searchTimeout = useRef<any>(null);

  // Hooks de navegación y UI
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  // Hooks personalizados (equivalentes a los providers)

  const { idUsuario, cerrarSesion: cerrarSesionUsuario } = useUsuario();
  const { distDatos, getDatosDist, subirDatosDist, filterItems } =
    useDistribucionHook();


  // Cada vez que cambien distDatos O searchTerm, recalcula la lista.
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    let result: any[];
    
    if (term === "") {
      // Sin filtro, muestro TODO
      result = distDatos;
    } else {
      // Con filtro, uso tu helper filterItems
      result = filterItems(term);
    }

    setItems(result);
    setSinInstituciones(result.length === 0);
  }, [distDatos, searchTerm]);

  // Función para filtrar elementos (equivalente a setFilteredItems)

  // Ahora: si el término es cadena vacía, usamos distDatos completos
  const setFilteredItems = (searchTerm: string) => {
    const term = searchTerm?.trim() ?? "";

    // 1) Si no hay término, muestro TODOS los datos
    const result = term === "" ? distDatos : filterItems(term);

    setItems(result);
    setSinInstituciones(result.length === 0);
  };

  // Manejar cambios en la búsqueda (equivalente a onSearchInput)
  const onSearchInput = (e: CustomEvent) => {
    setSearchTerm(e.detail.value!);
    setSearching(true);

    // Implementación del debounce con setTimeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setSearching(false);
      setFilteredItems(e.detail.value);
    }, 600);
  };

  // Verificar si hay información para guardar (equivalente a checar_info_guardar)
  const checar_info_guardar = async () => {
    const { value } = await Preferences.get({ key: "info_por_guardar" });

    if (value === "0" || value === null || value === undefined) {
      datosDistribucion();
    } else if (value === "1") {
      mostrarAlerta(
        'No puedes actualizar con nueva información ya que tienes datos por subir al servidor. Haz click primero en "Guardar en Sistema".',
        "error"
      );
    }
  };

  // Verificar si hay información para subir (equivalente a checar_info_subir)
  const checar_info_subir = async () => {
    const { value } = await Preferences.get({ key: "info_por_guardar" });

    if (value === "0" || value === null || value === undefined) {
      // mostrarAlerta(
      //   "La base de datos ya está actualizada. No hay datos nuevos para subir al sistema.",
      //   "success"
      // );

      presentAlert({
        header: "No hay datos para subir",
        message:
          "La base de datos ya está actualizada. No hay datos nuevos para subir al sistema.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    } else if (value === "1") {
      const { value: arregloValue } = await Preferences.get({
        key: "distDatos",
      });
      if (arregloValue) {
        const arreglo = JSON.parse(arregloValue);
        subirDatosNube(arreglo);
      }
    }
  };

  // Obtener datos de distribución (equivalente a datosDistribucion)
  const datosDistribucion = async () => {
    if (!idUsuario) return;

    setLoadingMessage("Espere por favor...");
    setShowLoading(true);

    try {
      const data = await getDatosDist(idUsuario);

      if (!data.error && Array.isArray(data.datos)) {
        // 1) Limpio el buscador
        setSearchTerm("");
        // 2) Pinto directamente los datos recién bajados
        setItems(data.datos);
        setSinInstituciones(data.datos.length === 0);
        // 3) Aviso de éxito
        crearToast(
          "Los datos se han descargado de manera exitosa.",
          2500,
          "toastVerde"
        );
      } else {
        // Manejamos el caso de error devuelto por la API
        //       mostrarAlerta(data.mensaje ?? "Ocurrió un error desconocido", "error");

        presentAlert({
          header: "Error al obtener los datos",
          message: data.mensaje ?? "Ocurrió un error desconocido",
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
      }
    } catch (err: any) {
      let mensajeError = "";

      if (err.code === "ECONNABORTED") {
        mensajeError =
          "Tu conexión a internet es baja, trata de conectarte a Wi‑Fi o desde una mejor señal.";
      } else {
        mensajeError =
          "Lo más probable es que estés sin cobertura o tu conexión esté desactivada.";
      }
      //  mostrarAlerta(mensajeError, "error");

      presentAlert({
        header: "Error en la Red",
        message: mensajeError,
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    } finally {
      setShowLoading(false);
    }
  };

  // Subir datos a la nube (equivalente a subirDatosNube)
  const subirDatosNube = async (datosDist: any[]) => {
    if (!idUsuario) return;

    setLoadingMessage("Espere por favor...");
    setShowLoading(true);

    try {
      const data = await subirDatosDist(idUsuario, datosDist);

      if (!data.error) {
        await Preferences.set({ key: "info_por_guardar", value: "0" });
        crearToast(
          "Los datos se han sincronizado con el servidor de manera exitosa.",
          3000,
          "toastVerde"
        );
      } else {
        //  mostrarAlerta(data?.mensaje, "error");

        presentAlert({
          header: "Error al subir los datos al sistema",
          message: data.mensaje,
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
      }
    } catch (err: any) {
      let mensajeError = "";

      if (err.code === "ECONNABORTED") {
        mensajeError =
          "Tu conexión a internet es baja, trata de conectarte a una red Wi-Fi o desde una ubicación con mejor señal.";
      } else {
        mensajeError =
          "Lo mas probable es que estés en una zona sin cobertura a internet, o tu internet esté desactivado.";
      }
      //      mostrarAlerta(mensajeError, "error");
      presentAlert({
        header: "Error en la Red",
        message: mensajeError,
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    } finally {
      setShowLoading(false);
    }
  };

  // En Home.tsx, dentro de la función irInst
  const irInst = (instId: string) => {
    const arregloDist = distDatos.find((x) => x.dist_inst_id === instId);
    const arregloDistCopy = JSON.parse(JSON.stringify(arregloDist));

    // Usar history.push para navegar a la página de institución
    history.push(`/institucion/${instId}`, {
      datosInst: arregloDistCopy,
      dist_inst: instId,
    });
  };

  // Crear toast (equivalente a crearToast)
  const crearToast = (mensaje: string, duracion: number, cssClass: string) => {
    presentToast({
      message: mensaje,
      duration: duracion,
      position: "bottom",
      buttons: [{ text: "Ok", role: "cancel" }],
      cssClass: cssClass,
    });
  };

  // Función para subir imágenes
  // Función para subir imágenes (ejemplo en Home.tsx)
  const subir_imagenes = async () => {
    setLoadingMessage("Subiendo imágenes...");
    setShowLoading(true);

    try {
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      if (!value) {
        throw new Error("No hay imágenes por guardar");
      }
      const list: Array<{ inst_id: string; imagenes: string[] }> =
        JSON.parse(value);
      if (list.length === 0) {
        throw new Error("Lista vacía");
      }

      for (const { inst_id, imagenes } of list) {
        for (const imagePath of imagenes) {
          // 1) extraer nombre
          const fileName = imagePath.substring(imagePath.lastIndexOf("/") + 1);

          // 2) leer base64 del FS
          const file = await Filesystem.readFile({
            path: fileName,
            directory: Directory.Data,
          });
          const base64 = file.data as string; // TS ya sabe que es string

          // 3) convertir Base64 → binary chunks → Blob
          const binary = atob(base64);
          const chunks: Uint8Array[] = [];
          for (let i = 0; i < binary.length; i += 512) {
            const slice = binary.slice(i, i + 512);
            const arr = new Uint8Array(slice.length);
            for (let j = 0; j < slice.length; j++) {
              arr[j] = slice.charCodeAt(j);
            }
            chunks.push(arr);
          }
          const blob = new Blob(chunks, { type: "image/jpeg" });

          // 4) armar FormData y subir con fetch
          const fd = new FormData();
          fd.append("file", blob, fileName);

          const resp = await fetch(
            `${URL_SERVICIOS}usuario/subir_imagenes/${inst_id}`,
            { method: "POST", body: fd }
          );
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Error ${resp.status}: ${text}`);
          }

          // 5) borrar el archivo local
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Data,
          });
        }
      }

      // 6) todo ok
      await Preferences.set({ key: "imagenes_subir", value: "" });
      //mostrarAlerta("Todas las imágenes subidas correctamente.", "success");
      await presentAlert({
        header: "Éxito",
        message: "Todas las imágenes subidas correctamente.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    } catch (e: any) {
      //mostrarAlerta(e.message || "Error desconocido", "error");
      await presentAlert({
        header: "Error imágenes",
        message: e.message || "Error desconocido",
        cssClass: "alert-button-cancel",
        buttons: ["Ok"],
      });
    } finally {
      setShowLoading(false);
    }
  };

  // Cerrar sesión (equivalente a cerrarSesion)
  const cerrarSesion = () => {
    presentAlert({
      header: "Cerrar Sesión",
      message:
        "¿Estás seguro(a) que deseas cerrar la sesión? Al hacer esto se perderán todos los datos que no hayas subido al servidor.",
      cssClass: "alert-android",
      mode: "md",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Cerrar Sesión",
          cssClass: "alert-button-confirm",
          handler: async () => {
            await Preferences.set({ key: "usuario", value: "" });
            await Preferences.set({ key: "usuario_id", value: "" });
            await Preferences.set({ key: "distDatos", value: "[]" });
            await Preferences.set({ key: "imagenes_subir", value: "" });
            await Preferences.set({ key: "info_por_guardar", value: "0" });
            await cerrarSesionUsuario();
            history.replace("/login");
          },
        },
      ],
    });
  };

  return (
    <IonPage>
      <IonHeader
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(56px + env(safe-area-inset-top))",
        }}        
      >
        <IonToolbar className="header-toolbar">
          <IonButtons slot="start">
            <IonImg
              src="assets/imgs/logoDif.png"
              className="logo-header"
              alt="Logo DIF"
            />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              fill="outline"
              style={{
                "--border-color": "#ffffff",
                "--color": "#ffffff",
              }}
              onClick={cerrarSesion}
            >
              Cerrar Sesión
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        className="no-padding"
        style={{
          "--padding-top": "0px",
          "--padding-bottom": "0px",
          "--padding-start": "10px",
          "--padding-end": "10px",
          /* si quieres que el contenido suba bajo el header: */
          "--offset-top": "0px",
          /* y si no quieres offset bottom al aparecer teclado: */
          "--keyboard-offset": "0px",
        }}
      >
        <div className="search-container">
          <IonSearchbar
            value={searchTerm}
            onIonInput={onSearchInput}
            placeholder="Buscar institución..."
            className="custom-searchbar"
          />
          {searching && (
            <div className="spinner-container">
              <IonSpinner name="crescent" />
            </div>
          )}
        </div>

        {sinInstituciones ? (
          <div className="empty-state">
            <p>
              No se tienen Instituciones para mostrar, si aún no lo has hecho,
              da click en "Actualizar Info" para obtener la información del
              servidor.
            </p>
          </div>
        ) : (
          <div className="institutions-container">
            {items &&
              items.map((item, index) => (
                <div
                  key={index}
                  className="institution-card"
                  onClick={() => irInst(item.dist_inst_id)}
                >
                  <div className="institution-info">
                    <p className="institution-name">{item.institucion}</p>
                    <p className="institution-code">Clave: {item.clave}</p>
                  </div>
                  <div className="status-indicator">
                    {item.save_chofer === "1" && (
                      <div className="status-check">
                        <img src="assets/imgs/check.png" alt="Guardado" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="actions-container">
          <button
            className="action-button update-button"
            onClick={checar_info_guardar}
          >
            <img src="assets/imgs/icoDescarga.png" alt="Descargar" />
            <span>Actualizar Info</span>
          </button>

          <button
            className="action-button save-button"
            onClick={checar_info_subir}
          >
            <img src="assets/imgs/nube.png" alt="Nube" />
            <span>Guardar en Sistema</span>
          </button>

          <button
            className="action-button upload-button"
            onClick={subir_imagenes}
          >
            <img src="assets/imgs/icoImagenes.png" alt="Imágenes" />
            <span>Subir Imágenes</span>
          </button>
        </div>

        <IonLoading isOpen={showLoading} message={loadingMessage} />
      </IonContent>
      {showAlert && (
        <div
          style={{
            position: "fixed",
            bottom: "15px",
            left: "10px",
            right: "10px",
            margin: "auto",
            backgroundColor:
              alertType === "success"
                ? "#28a745"
                : alertType === "warning"
                ? "#ff9800"
                : "#dc3545",

            color: "white",
            padding: "12px",
            borderRadius: "8px",
            textAlign: "center",
            zIndex: 9999,
          }}
        >
          {alertMessage}
        </div>
      )}
      {/* BOTONES FIJOS AL PIE, SE ELEVARÁN AL ABRIR TECLADO */}
      {/* <IonFooter>
      <div className="actions-container" keyboard-attach>
        <button
          className="action-button update-button"
          onClick={checar_info_guardar}
        >
          <img src="assets/imgs/icoDescarga.png" alt="Descargar" />
          <span>Actualizar Info</span>
        </button>

        <button
          className="action-button save-button"
          onClick={checar_info_subir}
        >
          <img src="assets/imgs/nube.png" alt="Nube" />
          <span>Guardar en Sistema</span>
        </button>

        <button
          className="action-button upload-button"
          onClick={subir_imagenes}
        >
          <img src="assets/imgs/icoImagenes.png" alt="Imágenes" />
          <span>Subir Imágenes</span>
        </button>
      </div>
    </IonFooter> */}
    </IonPage>
  );
};

export default Home;
