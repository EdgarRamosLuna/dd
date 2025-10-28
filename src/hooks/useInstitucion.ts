// src/hooks/useInstitucion.ts
'use client';

import { useEffect, useState } from "react";
import { useIonAlert } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useHistory } from "react-router-dom";
// ✅ fallback a MediaStore para Galería
import { Media } from "@capacitor-community/media";

export const useInstitucion = (institucionData: any, instId: string) => {
  // Estados principales
  const [datosInst, setDatosInst] = useState<any>(institucionData || {});
  const [arregloProductos, setArregloProductos] = useState<any[]>([]);
  const [imagenPreview, setImagenPreview] = useState<string[]>([]);
  const [imagenesStorage, setImagenesStorage] = useState<string[]>([]);
  const [imagenesGuardadas, setImagenesGuardadas] = useState<string[]>([]);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [numImagenes, setNumImagenes] = useState(0);

  // Hooks auxiliares
  const [presentAlert] = useIonAlert();
  const history = useHistory();

  // ============================================================
  // Helpers: carpeta dif (sandbox) + normalización de rutas
  // ============================================================
  const ensureDifDir = async () => {
    try {
      await Filesystem.mkdir({
        path: "dif",
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

  const inDif = (name: string) => (name.startsWith("dif/") ? name : `dif/${name}`);

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
  const readFromSandbox = async (name: string) => {
    const { data } = await Filesystem.readFile({ path: inDif(name), directory: Directory.Data });
    return data as string; // base64
  };

  // ============================================================
  // Self-check opcional (logs de permisos y plugin)
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        const canUseMedia = typeof (Media as any)?.savePhoto === "function";
        console.log("[Media plugin] savePhoto disponible:", canUseMedia);
        const perm = await (Media as any)?.checkPermissions?.();
        console.log("[Media plugin] permisos actuales:", perm);
      } catch (e) {
        console.log("[Media plugin] no disponible o error al checar permisos:", e);
      }
    })();
  }, []);

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
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      if (!value) return;

      const imagenesSubir = JSON.parse(value);
      const imagenesInst = imagenesSubir.find((x: any) => x.inst_id === instId);
      if (!imagenesInst) {
        setImagenesGuardadas([]);
        setFirmaPreview(null);
        return;
      }

      // ⚠️ Filtra previews cuya contraparte en sandbox ya no exista
      const imgsMostrar: string[] = [];

      for (let i = 0; i < (imagenesInst.imagenes || []).length && imgsMostrar.length < 2; i++) {
        const name = imagenesInst.imagenes[i]; // nombre (sandbox)
        const prev = imagenesInst.imagenes_mostrar?.[i]; // preview (dataURL o fileSrc)
        if (await statInSandbox(name)) {
          imgsMostrar.push(prev);
        }
      }

      setImagenesGuardadas(imgsMostrar);
      setNumImagenes(imgsMostrar.length);
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

        // DataURL -> ext + base64 (sin encabezado)
        const m = dataUrl.match(/^data:image\/(.+?);base64,(.+)$/);
        const ext0 = (m && m[1]) ? m[1] : "png";
        const base64 = (m && m[2]) ? m[2] : dataUrl.replace(/^data:.*;base64,/, "");
        const ext = ext0 === "jpeg" ? "jpg" : ext0;
        const fileName = `Firma-${safeClave}-${ts}.${ext}`;

        await ensureDifDir();

        // 1) Guarda en sandbox siempre (no perdemos la firma aunque Galería falle)
        await Filesystem.writeFile({
          path: inDif(fileName),
          data: base64,              // base64 puro
          directory: Directory.Data, // sandbox de la app
          recursive: true,
        });

        // 2) Intenta guardar en Galería si el plugin está disponible
        const canUseMedia = typeof (Media as any)?.savePhoto === "function";
        if (!canUseMedia) {
          console.warn("Media plugin no disponible en runtime. Se guardó en sandbox /dif.");
          return;
        }

        // 3) Permisos Android 13+ y iOS de forma explícita
        const perm = await (Media as any).checkPermissions?.();
        if (!perm || perm.photos !== "granted") {
          const req = await (Media as any).requestPermissions?.({ permissions: ["photos"] });
          if (!req || req.photos !== "granted") {
            console.warn("Permiso de fotos no concedido. Se guardó en sandbox /dif.");
            return;
          }
        }

        // 4) Guarda en galería con álbum “dif”
        const result = await (Media as any).savePhoto({
          // Usa dataURL completo por compatibilidad
          path: `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${base64}`,
          fileName,
          album: "dif", // álbum de la galería
        });

        if (!result || !result.path) {
          console.warn("Media.savePhoto no regresó path. Ya está en sandbox /dif.");
        }
      } catch (e) {
        console.warn("Error al guardar la firma. Ya está en sandbox /dif. Detalle:", e);
        // Ya escribimos en sandbox; no hacemos nada más aquí
      }
    })();
  };

  // Rellenar con valor máximo
  const llenarMaximo = (index: number) => {
    const newDatosInst = { ...datosInst };
    newDatosInst.productos[index].entregado = newDatosInst.productos[index].cantidad;
    setDatosInst(newDatosInst);
  };

  // Actualizar valor de producto
  const updateList = (event: CustomEvent, index: number) => {
    const format = /^\d*\.?\d*$/;
    const value = (event as any).detail?.value ?? "";
    if (format.test(value)) {
      const newDatosInst = { ...datosInst };
      newDatosInst.productos[index].entregado = value;
      setDatosInst(newDatosInst);
    }
  };

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // ============================================================
  // FOTOS: captura + persistencia en sandbox /dif y álbum "dif"
  // ============================================================
  const takePhotoAndPersist = async (): Promise<{
    previewUrl: string;
    dataFilename: string;
    galleryPath?: string;
  }> => {
    const isAndroid = Capacitor.getPlatform() === "android";

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: isAndroid ? CameraResultType.Base64 : CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: true, // el OEM puede publicarla; igual forzaremos con Media
      correctOrientation: true,
    });

    let previewUrl: string;
    let base64Data: string;

    if (isAndroid && photo.base64String) {
      base64Data = photo.base64String; // sin encabezado
      const fmt = photo.format || "jpeg";
      previewUrl = `data:image/${fmt};base64,${base64Data}`;
    } else {
      const srcPath = photo.path ?? photo.webPath;
      if (!srcPath) throw new Error("No path returned by Camera");
      previewUrl = Capacitor.convertFileSrc(srcPath);
      // Lee y pasa a base64 (iOS/webview)
      try {
        const read = await Filesystem.readFile({ path: srcPath });
        if (typeof read.data === "string") {
          base64Data = read.data;
        } else {
          const blobFromFs = read.data as Blob;
          base64Data = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => {
              const s = (r.result as string) || "";
              const i = s.indexOf(",");
              resolve(i >= 0 ? s.slice(i + 1) : s);
            };
            r.onerror = reject;
            r.readAsDataURL(blobFromFs);
          });
        }
      } catch {
        const resp = await fetch(srcPath);
        const blob = await resp.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => {
            const s = (r.result as string) || "";
            const i = s.indexOf(",");
            resolve(i >= 0 ? s.slice(i + 1) : s);
          };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      }
    }

    const claveRawForPhoto = (datosInst && (datosInst as any).clave) ?? "";
    const safeClaveForPhoto = String(claveRawForPhoto).replace(/[^a-zA-Z0-9_-]/g, "");
    const ts = Date.now();
    const dataFilename = `Evidencia-${safeClaveForPhoto}-${ts}.jpg`;

    await ensureDifDir();

    // Siempre persistimos en sandbox /dif
    await Filesystem.writeFile({
      path: inDif(dataFilename),
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });

    // ✅ Fallback garantizado a Galería (MediaStore) → álbum "dif"
    try {
      const canUseMedia = typeof (Media as any)?.savePhoto === "function";
      if (canUseMedia) {
        const perm = await (Media as any).checkPermissions?.();
        if (!perm || perm.photos !== "granted") {
          await (Media as any).requestPermissions?.({ permissions: ["photos"] });
        }
        await (Media as any).savePhoto({
          path: `data:image/jpeg;base64,${base64Data}`,
          fileName: `Evidencia-${safeClaveForPhoto}-${ts}.jpg`,
          album: "dif",
        });
      } else {
        console.warn("Media plugin no disponible. Foto guardada en sandbox /dif.");
      }
    } catch (e) {
      console.warn("No se pudo publicar en MediaStore (se mantiene en sandbox /dif):", e);
    }

    return {
      previewUrl,
      dataFilename: inDif(dataFilename), // guardamos la ruta con prefijo dif/
      galleryPath: photo.path || photo.webPath,
    };
  };

  // ---------- guardar productos ----------
  const guardarProductos = async () => {
    if (numImagenes < 2) {
      presentAlert({
        header: "Faltan imágenes",
        message: "Debes capturar al menos dos imágenes antes de guardar.",
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
        header: "Falta información",
        message: "No has ingresado la persona que está recibiendo los productos.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    for (let i = 0; i < (datosInst.productos?.length || 0); i++) {
      if (isNaN(datosInst.productos[i].entregado)) {
        presentAlert({
          header: "Información incorrecta",
          message: "Alguna cantidad tiene un mal formato.",
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
        return;
      }
      if (+datosInst.productos[i].entregado > +datosInst.productos[i].cantidad) {
        presentAlert({
          header: "Información incorrecta",
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

      // Merge con imágenes previas y NUEVAS, respetando máximo 2
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      let arregloImagenes: any[] = value && value !== "" ? JSON.parse(value) : [];
      const existingIndex = arregloImagenes.findIndex((item: any) => item.inst_id === instId);

      const prevImagenes = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes || []) : [];
      const prevImagenesMostrar = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes_mostrar || []) : [];

      // 🔒 filtra nombres inexistentes en sandbox (evita “File does not exist” después)
      const prevFiltradas: string[] = [];
      const prevMostrarFiltradas: string[] = [];
      for (let i = 0; i < prevImagenes.length; i++) {
        if (await statInSandbox(prevImagenes[i])) {
          prevFiltradas.push(prevImagenes[i]);
          prevMostrarFiltradas.push(prevImagenesMostrar[i]);
        }
      }

      const combinadasImagenes = [...prevFiltradas, ...imagenesStorage].slice(0, 2);
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
        message: "Ocurrió un error al guardar los datos.",
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
          nuevasImagenes.splice(index, 1);
          nuevasImagenesMostrar.splice(index, 1);
          arregloImagenes[instIndex] = {
            ...imagenesInst,
            imagenes: nuevasImagenes,
            imagenes_mostrar: nuevasImagenesMostrar,
          };
          await Preferences.set({ key: "imagenes_subir", value: JSON.stringify(arregloImagenes) });
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

  // ---------- cámara ----------
  const mostrar_camara = async () => {
    if (numImagenes >= 2) {
      presentAlert({
        header: "Máximo de imágenes",
        message: "Solo puedes tomar hasta dos fotos. Elimina alguna para capturar otra.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    try {
      const { previewUrl, dataFilename } = await takePhotoAndPersist();
      setImagenPreview((prev) => [...prev, previewUrl]);     // para UI
      setImagenesStorage((prev) => [...prev, dataFilename]); // nombre en sandbox (/dif/…)
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
