// src/hooks/useInstitucion.ts
'use client';

import { useEffect, useState } from "react";
import { useIonAlert } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { useHistory } from "react-router-dom";
import {
  ensureInSandbox,
  readBase64Smart,
  saveCopyToGalleryFromBase64,
  DIF_DIR,
} from "../utils/files";

export const useInstitucion = (institucionData: any, instId: string) => {
  // Estados principales
  const [datosInst, setDatosInst] = useState<any>(institucionData || {});
  const [arregloProductos, setArregloProductos] = useState<any[]>([]);
  const [imagenPreview, setImagenPreview] = useState<string[]>([]);
  const [imagenesStorage, setImagenesStorage] = useState<string[]>([]);
  const [imagenesGuardadas, setImagenesGuardadas] = useState<string[]>([]);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [numImagenes, setNumImagenes] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Hooks auxiliares
  const [presentAlert] = useIonAlert();
  const history = useHistory();

  // ============================================================
  // Helpers: carpeta dif (sandbox) + normalizaciÃ³n de rutas
  // ============================================================
  const ensureDifDir = async () => {
    try {
      await Filesystem.mkdir({
        path: DIF_DIR,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (err: any) {
      // Si ya existe, ignorar
      const msg = String(err?.message || "");
      if (!msg.includes("exists") && !msg.includes("AlreadyExists")) {
        console.warn("mkdir dif:", err);
      }
    }
  };

  const inDif = (name: string) => {
    const trimmed = (name || "").replace(/^file:\/\//, "").replace(/^\/+/, "");
    return trimmed.startsWith(`${DIF_DIR}/`) ? trimmed : `${DIF_DIR}/${trimmed}`;
  };

  // ---------- helpers robustos ----------
  const statInSandbox = async (name: string) => {
    try {
      await Filesystem.stat({ path: inDif(name), directory: Directory.Data });
      return true;
    } catch {
      return false;
    }
  };

  // Lee base64 de sandbox (para subida)
  const readFromSandbox = async (name: string) => readBase64Smart(inDif(name));

  // ---------- init productos ----------
  useEffect(() => {
    if (institucionData) {
      const productosAgregar: any[] = [];
      institucionData.productos?.forEach((item: any) => {
        const producto: any = {};
        producto.uid = item.dipid;
        producto.nombre = item.producto;
        producto.cantidad = item.cantidad;
        producto.entregado = item.entregado;
        productosAgregar.push(producto);
      });
      setArregloProductos(productosAgregar);
    }
  }, [institucionData]);

  // ---------- cargar imágenes guardadas ----------
  const cargarImagenesGuardadas = async () => {
    try {
      await ensureDifDir();
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      if (!value) {
        setImagenesGuardadas([]);
        setNumImagenes(0);
        return;
      }

      const imagenesSubir = JSON.parse(value);
      const imagenesInst = imagenesSubir.find((x: any) => x.inst_id === instId);
      if (!imagenesInst) {
        setImagenesGuardadas([]);
        setFirmaPreview(null);
        setNumImagenes(0);
        return;
      }

      const dirListing = await Filesystem.readdir({
        path: DIF_DIR,
        directory: Directory.Data,
      }).catch(() => ({ files: [] as any[] }));
      const nombresEnDir = new Set(
        (dirListing.files || []).map((entry: any) =>
          typeof entry === "string" ? entry : entry?.name
        )
      );

      const nuevasImagenes: string[] = [];
      const previews: string[] = [];
      let needsUpdate = false;

      for (let i = 0; i < (imagenesInst.imagenes || []).length; i++) {
        const rawPath = imagenesInst.imagenes[i];
        const baseName =
          rawPath?.substring(rawPath.lastIndexOf("/") + 1) ||
          `${instId}_${Date.now()}_${i}.jpg`;

        let finalPath = rawPath;
        if (!rawPath || !rawPath.startsWith(`${DIF_DIR}/`)) {
          try {
            finalPath = await ensureInSandbox(rawPath || "", baseName);
            needsUpdate = true;
          } catch (copyErr) {
            console.warn("No se pudo normalizar imagen:", rawPath, copyErr);
            continue;
          }
        }

        const fileNameOnly = finalPath.replace(`${DIF_DIR}/`, "");
        if (!nombresEnDir.has(fileNameOnly)) {
          const exists = await statInSandbox(finalPath);
          if (!exists) {
            console.warn("Imagen faltante; se omite:", finalPath);
            needsUpdate = true;
            continue;
          }
          nombresEnDir.add(fileNameOnly);
        }

        nuevasImagenes.push(finalPath);
        if (previews.length < 2) {
          const base64 = await readFromSandbox(finalPath);
          previews.push(`data:image/jpeg;base64,${base64}`);
        }
      }

      if (needsUpdate) {
        const index = imagenesSubir.findIndex((item: any) => item.inst_id === instId);
        if (index !== -1) {
          imagenesSubir[index] = {
            ...imagenesInst,
            imagenes: nuevasImagenes,
            imagenes_mostrar: previews,
          };
          await Preferences.set({
            key: "imagenes_subir",
            value: JSON.stringify(imagenesSubir),
          });
        }
      }

      setImagenesGuardadas(previews);
      setNumImagenes(Math.min(nuevasImagenes.length, 2));
    } catch (err) {
      console.error("Error al cargar imágenes y firma guardadas:", err);
    }
  };

  // ============================================================
  // FIRMAS: guarda en estado, sandbox /dif y galería álbum "dif"
  // ============================================================
  const handleGuardarFirma = (dataUrl: string) => {
    setFirmaPreview(dataUrl);
    setDatosInst((prev: any) => ({ ...prev, firma: dataUrl }));

    (async () => {
      try {
        const claveRaw = (datosInst && (datosInst as any).clave) ?? "";
        const safeClave = String(claveRaw).replace(/[^a-zA-Z0-9_-]/g, "");
        const ts = Date.now();

        const m = dataUrl.match(/^data:image\/(.+?);base64,(.+)$/);
        const ext0 = m?.[1] || "png";
        const base64 = m?.[2] || dataUrl.replace(/^data:.*;base64,/, "");
        const ext = ext0 === "jpeg" ? "jpg" : ext0;
        const fileName = `Firma-${safeClave}-${ts}.${ext}`;

        await ensureInSandbox(dataUrl, fileName);
        await saveCopyToGalleryFromBase64(base64, `Firma-${safeClave}-${ts}`);
      } catch (e) {
        console.warn("Error al guardar la firma. Ya está en sandbox /dif. Detalle:", e);
      }
    })();
  };

  // Rellenar con valor máximo
  const llenarMaximo = (index: number) => {
    if (!datosInst?.productos) return;
    const newDatosInst = { ...datosInst };
    newDatosInst.productos[index].entregado = newDatosInst.productos[index].cantidad;
    setDatosInst(newDatosInst);
  };

  // Actualizar valor de producto
  const updateList = (event: CustomEvent, index: number) => {
    const format = /^\d*\.?\d*$/;
    const value = (event as any).detail?.value ?? "";
    if (format.test(value) && datosInst?.productos) {
      const newDatosInst = { ...datosInst };
      newDatosInst.productos[index].entregado = value;
      setDatosInst(newDatosInst);
    }
  };
  // ============================================================
  // FOTOS: captura + persistencia en sandbox /dif y álbum "dif"
  // ============================================================
  const takePhotoAndPersist = async (): Promise<{
    previewUrl: string;
    dataFilename: string;
    galleryPath?: string;
  }> => {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: true,
      correctOrientation: true,
    });

    const fmt0 = photo.format || "jpeg";
    const fmt = fmt0 === "jpeg" ? "jpg" : fmt0;
    const claveRawForPhoto = (datosInst && (datosInst as any).clave) ?? "";
    const safeClaveForPhoto = String(claveRawForPhoto).replace(/[^a-zA-Z0-9_-]/g, "");
    const ts = Date.now();
    const fileName = `Evidencia-${safeClaveForPhoto}-${ts}.${fmt}`;

    const originPath =
      photo.path ||
      photo.webPath ||
      (photo.base64String ? `data:image/${fmt0};base64,${photo.base64String}` : "");

    if (!originPath) {
      throw new Error("No path returned by Camera");
    }

    const dataFilename = await ensureInSandbox(originPath, fileName);
    const base64Data = await readBase64Smart(dataFilename);
    const previewUrl = `data:image/${fmt0};base64,${base64Data}`;

    await saveCopyToGalleryFromBase64(base64Data, `Evidencia-${safeClaveForPhoto}-${ts}`);

    return {
      previewUrl,
      dataFilename,
      galleryPath: originPath,
    };
  };

  // ---------- guardar productos ----------
  const guardarProductos = async () => {
    if (numImagenes < 2) {
      presentAlert({
        header: "Faltan imÃ¡genes",
        message: "Debes capturar al menos dos imÃ¡genes antes de guardar.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    const today = new Date();
    const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
    const dateTime = `${date} ${time}`;

    // Validar firma obligatoria
    if (!firmaPreview && !datosInst?.firma) {
      presentAlert({
        header: "Falta firma",
        message: "Debes capturar y guardar la firma de quien recibe antes de continuar.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    if (!datosInst.quien_recibe || datosInst.quien_recibe === "") {
      presentAlert({
        header: "Falta informaciÃ³n",
        message: "No has ingresado la persona que estÃ¡ recibiendo los productos.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    for (let i = 0; i < (datosInst.productos?.length || 0); i++) {
      if (isNaN(datosInst.productos[i].entregado)) {
        presentAlert({
          header: "InformaciÃ³n incorrecta",
          message: "Alguna cantidad tiene un mal formato.",
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
        return;
      }
      if (+datosInst.productos[i].entregado > +datosInst.productos[i].cantidad) {
        presentAlert({
          header: "InformaciÃ³n incorrecta",
          message: "Alguna cantidad entregada es mayor a la cantidad a entregar.",
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
        return;
      }
    }

    const newDatosInst = {
      ...datosInst,
      save_chofer: "1",
      fecha_guardado: dateTime,
      ...(firmaPreview ? { firma: firmaPreview } : datosInst?.firma ? { firma: datosInst.firma } : {}),
    };
    setDatosInst(newDatosInst);
    await guardar_storage_productos(newDatosInst);
  };

  // ---------- guardar en Preferences ----------
  const guardar_storage_productos = async (datosActualizados: any) => {
    try {
      const { value: distDatosValue } = await Preferences.get({ key: "distDatos" });
      const distDatos = distDatosValue ? JSON.parse(distDatosValue) : [];

      const index = distDatos.findIndex((item: any) => item.dist_inst_id === instId);
      if (index !== -1) distDatos[index] = datosActualizados;

      await Preferences.set({ key: "info_por_guardar", value: "1" });
      await Preferences.set({ key: "distDatos", value: JSON.stringify(distDatos) });

      // Merge con imÃ¡genes previas y NUEVAS, respetando mÃ¡ximo 2
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      let arregloImagenes: any[] = value && value !== "" ? JSON.parse(value) : [];
      const existingIndex = arregloImagenes.findIndex((item: any) => item.inst_id === instId);

      const prevImagenes = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes || []) : [];
      const prevImagenesMostrar = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes_mostrar || []) : [];

      // ðŸ”’ filtra nombres inexistentes en sandbox (evita â€œFile does not existâ€ despuÃ©s)
      const prevFiltradas: string[] = [];
      const prevMostrarFiltradas: string[] = [];
      for (let i = 0; i < prevImagenes.length; i++) {
        const normalizedPrev = inDif(prevImagenes[i]);
        if (await statInSandbox(normalizedPrev)) {
          prevFiltradas.push(normalizedPrev);
          prevMostrarFiltradas.push(prevImagenesMostrar[i]);
        }
      }

      const nuevasEnMemoria = imagenesStorage.map((img) => inDif(img));
      const combinadasImagenes = [...prevFiltradas, ...nuevasEnMemoria].slice(0, 2);
      const combinadasImagenesMostrar = [...prevMostrarFiltradas, ...imagenPreview].slice(0, 2);

      const objetoImagenes: any = {
        imagenes: combinadasImagenes,
        imagenes_mostrar: combinadasImagenesMostrar,
        inst_id: instId,
      };
      if (firmaPreview) objetoImagenes.firma = firmaPreview;

      if (existingIndex !== -1) {
        arregloImagenes[existingIndex] = objetoImagenes;
      } else {
        arregloImagenes.push(objetoImagenes);
      }

      await Preferences.set({ key: "imagenes_subir", value: JSON.stringify(arregloImagenes) });

      presentAlert({
        header: "Datos almacenados en el dispositivo",
        message: "Recuerda subir los datos a la nube cuando tengas internet.",
        cssClass: "alert-android",
        buttons: [{ text: "OK", handler: () => history.goBack() }],
      });
    } catch (err) {
      console.error("Error al guardar productos:", err);
      presentAlert({
        header: "Error",
        message: "OcurriÃ³ un error al guardar los datos.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    }
  };

  const eliminarImagen = (index: number) => {
    setImagenPreview((prev) => prev.filter((_, idx) => idx !== index));
    setImagenesStorage((prev) => prev.filter((_, idx) => idx !== index));
    setNumImagenes((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const eliminarImagenGuardada = async (index: number) => {
    try {
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      if (value && value !== "") {
        const arregloImagenes = JSON.parse(value);
        const instIndex = arregloImagenes.findIndex((item: any) => item.inst_id === instId);
        if (instIndex !== -1) {
          const imagenesInst = arregloImagenes[instIndex];
          const nuevasImagenes = [...(imagenesInst.imagenes || [])];
          const nuevasImagenesMostrar = [...(imagenesInst.imagenes_mostrar || [])];
          const [removed] = nuevasImagenes.splice(index, 1);
          nuevasImagenesMostrar.splice(index, 1);
          arregloImagenes[instIndex] = {
            ...imagenesInst,
            imagenes: nuevasImagenes,
            imagenes_mostrar: nuevasImagenesMostrar,
          };
          await Preferences.set({ key: "imagenes_subir", value: JSON.stringify(arregloImagenes) });

          if (removed) {
            try {
              await Filesystem.deleteFile({ path: inDif(removed), directory: Directory.Data });
            } catch (deleteErr) {
              console.warn("No se pudo borrar imagen guardada:", deleteErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error al eliminar imagen guardada:", err);
    }
    setImagenesGuardadas((prev) => prev.filter((_, idx) => idx !== index));
    setImagenPreview([]);
    setImagenesStorage([]);
    setNumImagenes((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // ---------- cÃ¡mara ----------
  const mostrar_camara = async () => {
    if (numImagenes >= 2) {
      presentAlert({
        header: "MÃ¡ximo de imÃ¡genes",
        message: "Solo puedes tomar hasta dos fotos. Elimina alguna para capturar otra.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    try {
      const { previewUrl, dataFilename } = await takePhotoAndPersist();
      setImagenPreview((prev) => [...prev, previewUrl]);     // para UI
      setImagenesStorage((prev) => [...prev, dataFilename]); // nombre en sandbox (/dif/â€¦)
      setNumImagenes((n) => n + 1);
    } catch (err) {
      console.error("Error al tomar/guardar la foto:", err);
      presentAlert({
        header: "Error",
        message: "No se pudo guardar la foto.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
    }
  };

  // ---------- inputs ----------
  const handleObservacionesChange = (event: CustomEvent) => {
    const newDatosInst = { ...datosInst, observaciones: (event as any).detail?.value };
    setDatosInst(newDatosInst);
  };
  const handleQuienRecibeChange = (event: CustomEvent) => {
    const newDatosInst = { ...datosInst, quien_recibe: (event as any).detail?.value };
    setDatosInst(newDatosInst);
  };

  return {
    datosInst,
    arregloProductos,
    imagenPreview,
    imagenesGuardadas,
    firmaPreview,
    numImagenes,
    cargarImagenesGuardadas,
    llenarMaximo,
    updateList,
    guardarProductos,
    mostrar_camara,
    eliminarImagen,
    eliminarImagenGuardada,
    handleObservacionesChange,
    handleQuienRecibeChange,
    handleGuardarFirma,
    showAlert,
    setShowAlert,
    alertMessage,
    // helpers opcionales
    readFromSandbox,
    statInSandbox,
  };
};






