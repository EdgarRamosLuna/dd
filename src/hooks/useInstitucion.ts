// src/hooks/useInstitucion.ts
import { useEffect, useState } from "react";
import { useIonAlert } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useHistory } from "react-router-dom";

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

  // Inicializar datos de productos
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

  // Cargar imágenes y firma guardadas
  const cargarImagenesGuardadas = async () => {
    try {
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      if (value && value !== "") {
        const imagenesSubir = JSON.parse(value);
        const imagenesInst = imagenesSubir.find((x: any) => x.inst_id === instId);
        if (imagenesInst) {
          const imagenesParaMostrar = (imagenesInst.imagenes_mostrar || []).slice(0, 2);
          setImagenesGuardadas(imagenesParaMostrar);
          setNumImagenes(imagenesParaMostrar.length);
          setImagenPreview([]);
          setImagenesStorage([]);
        } else {
          setImagenesGuardadas([]);
          setFirmaPreview(null);
        }
      }
    } catch (err) {
      console.error("Error al cargar imágenes y firma guardadas:", err);
    }
  };

  // Firma desde componente hijo
  const handleGuardarFirma = (dataUrl: string) => {
    setFirmaPreview(dataUrl);
    setDatosInst((prev: any) => ({ ...prev, firma: dataUrl }));
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

  // Guardar productos (y firma) en Preferences
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
        message:
          "Debes capturar y guardar la firma de quien recibe antes de continuar.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    if (!datosInst.quien_recibe || datosInst.quien_recibe === "") {
      presentAlert({
        header: "Falta información",
        message:
          "No has ingresado la persona que está recibiendo los productos. Este campo es necesario para continuar.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    for (let i = 0; i < (datosInst.productos?.length || 0); i++) {
      if (isNaN(datosInst.productos[i].entregado)) {
        presentAlert({
          header: "Información incorrecta",
          message:
            "Alguna o algunas de las cantidades que ingresaste tienen un mal formato. Verifica que solo contengan números y decimales.",
          cssClass: "alert-android",
          buttons: ["Ok"],
        });
        return;
      }
      if (+datosInst.productos[i].entregado > +datosInst.productos[i].cantidad) {
        presentAlert({
          header: "Información incorrecta",
          message:
            "Alguna de tus cantidades entregadas es mayor a la cantidad a entregar. Favor de verificar la información.",
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
      ...(firmaPreview
        ? { firma: firmaPreview }
        : datosInst?.firma
        ? { firma: datosInst.firma }
        : {}),
    };
    setDatosInst(newDatosInst);
    await guardar_storage_productos(newDatosInst);
  };

  // Guardar en Preferences
  const guardar_storage_productos = async (datosActualizados: any) => {
    try {
      const { value: distDatosValue } = await Preferences.get({ key: "distDatos" });
      const distDatos = distDatosValue ? JSON.parse(distDatosValue) : [];

      const index = distDatos.findIndex((item: any) => item.dist_inst_id === instId);
      if (index !== -1) {
        distDatos[index] = datosActualizados;
      }

      await Preferences.set({ key: "info_por_guardar", value: "1" });
      await Preferences.set({ key: "distDatos", value: JSON.stringify(distDatos) });

      // Merge con imágenes previamente guardadas para esta institución y limitar a 2
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      let arregloImagenes: any[] = value && value !== "" ? JSON.parse(value) : [];
      const existingIndex = arregloImagenes.findIndex((item: any) => item.inst_id === instId);

      const prevImagenes = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes || []) : [];
      const prevImagenesMostrar = existingIndex !== -1 ? (arregloImagenes[existingIndex].imagenes_mostrar || []) : [];

      // Combinar previas + nuevas, respetando máximo 2
      const combinadasImagenes = [...prevImagenes, ...imagenesStorage].slice(0, 2);
      const combinadasImagenesMostrar = [...prevImagenesMostrar, ...imagenPreview].slice(0, 2);

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
        message:
          "Recuerda subir los datos a la nube lo antes posible cuando estés en un lugar con internet.",
        cssClass: "alert-android",
        buttons: [
          {
            text: "OK",
            handler: () => {
              history.goBack();
            },
          },
        ],
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

  // Mostrar la cámara para tomar fotos
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
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (image.webPath) {
        setNumImagenes((prevNum) => prevNum + 1);
        const tempFilename = `image_${Date.now()}.jpg`;
        try {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File([blob], tempFilename, { type: "image/jpeg" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const dataUrl = typeof reader.result === "string" ? reader.result : "";
              if (!dataUrl) throw new Error("No se pudo leer el contenido de la imagen");
              const commaIndex = dataUrl.indexOf(",");
              const base64Image = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;

              // Intenta guardar en almacenamiento externo en carpeta por fecha
              const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
              const now = new Date();
              const dateFolder = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
              const baseFolder = `Pictures/Distribuciones/${dateFolder}`; // Carpeta destino

              // Asegura permisos para almacenamiento público (Android)
              try {
                const perms: any = await Filesystem.checkPermissions();
                if (perms.publicStorage !== "granted") {
                  const req: any = await Filesystem.requestPermissions();
                  if (req.publicStorage !== "granted") {
                    throw new Error("Permiso de almacenamiento público denegado");
                  }
                }

                // Crea carpeta y guarda el archivo
                await Filesystem.mkdir({
                  path: baseFolder,
                  directory: Directory.ExternalStorage,
                  recursive: true,
                }).catch(() => {});

                const externalPath = `${baseFolder}/${tempFilename}`;
                const savedExternal = await Filesystem.writeFile({
                  path: externalPath,
                  data: base64Image,
                  directory: Directory.ExternalStorage,
                  recursive: true,
                });

                const { uri } = await Filesystem.getUri({
                  directory: Directory.ExternalStorage,
                  path: externalPath,
                });

                const filePath = uri || savedExternal.uri || `${Directory.ExternalStorage}/${externalPath}`;
                const previewPath = Capacitor.convertFileSrc(filePath);
                const resolvedPreviewPath = previewPath ?? image.webPath;
                setImagenPreview((prev) => [...prev, resolvedPreviewPath]);

                // Además, guarda una copia en el almacenamiento interno de la app
                await Filesystem.writeFile({
                  path: tempFilename,
                  data: base64Image,
                  directory: Directory.Data,
                });
                // Para el flujo de subida, almacenamos solo el nombre de archivo
                setImagenesStorage((prev) => [...prev, tempFilename]);
              } catch (externalErr) {
                // Fallback: guarda en almacenamiento interno de la app
                const saved = await Filesystem.writeFile({
                  path: tempFilename,
                  data: base64Image,
                  directory: Directory.Data,
                });

                const filePath = saved.uri || `${Directory.Data}/${tempFilename}`;
                const previewPath = Capacitor.convertFileSrc(filePath);
                const resolvedPreviewPath = previewPath ?? image.webPath;
                setImagenPreview((prev) => [...prev, resolvedPreviewPath]);
                // Para el flujo de subida, almacenamos solo el nombre de archivo
                setImagenesStorage((prev) => [...prev, tempFilename]);
              }
            } catch (saveError) {
              console.error("Error al guardar la imagen:", saveError);
            }
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error("Error al guardar la imagen:", err);
        }
      }
    } catch (err) {
      console.error("Error al tomar foto:", err);
    }
  };

  // Actualizar observaciones
  const handleObservacionesChange = (event: CustomEvent) => {
    const newDatosInst = { ...datosInst, observaciones: (event as any).detail?.value };
    setDatosInst(newDatosInst);
  };

  // Actualizar quien recibe
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
  };
};
