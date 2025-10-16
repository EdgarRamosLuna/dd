// src/hooks/useInstitucion.ts
import { useState, useEffect } from "react";
import { useIonAlert } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  Filesystem,
  Directory,
  PermissionStatus,
} from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useHistory } from "react-router-dom";

export const useInstitucion = (institucionData: any, instId: string) => {
  // -----------------------------
  // 👥 Estados principales
  // -----------------------------
  const [datosInst, setDatosInst] = useState<any>(institucionData || {});
  const [arregloProductos, setArregloProductos] = useState<any[]>([]);
  const [imagenPreview, setImagenPreview] = useState<string[]>([]);
  const [imagenesStorage, setImagenesStorage] = useState<string[]>([]);
  const [imagenesGuardadas, setImagenesGuardadas] = useState<string[]>([]);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [numImagenes, setNumImagenes] = useState(0);

  // -----------------------------
  // 🔔 Hooks auxiliares
  // -----------------------------
  const [presentAlert] = useIonAlert();
  const history = useHistory();

  // -----------------------------
  // 🔧 Inicializar datos de productos
  // -----------------------------
  useEffect(() => {
    if (institucionData) {
      const productosAgregar: any[] = [];

      institucionData.productos.forEach((item: any) => {
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

  // -----------------------------
  // 📥 Cargar imágenes y firma guardadas
  // -----------------------------
  const cargarImagenesGuardadas = async () => {
    try {
      const { value } = await Preferences.get({ key: "imagenes_subir" });

      if (value && value !== "") {
        const imagenesSubir = JSON.parse(value);
        const imagenesInst = imagenesSubir.find(
          (x: any) => x.inst_id === instId
        );

        if (imagenesInst) {
          const imagenesParaMostrar = (
            imagenesInst.imagenes_mostrar || []
          ).slice(0, 1);
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

  // -----------------------------
  // ✍️ Función para que el componente de firma guarde el dataURL
  // -----------------------------
  const handleGuardarFirma = (dataUrl: string) => {
    setFirmaPreview(dataUrl);
    // También inyectamos en datosInst para que lo muestre la UI
    setDatosInst((prev: any) => ({
      ...prev,
      firma: dataUrl,
    }));
  };

  // -----------------------------
  // 🖋️ Rellenar con valor máximo
  // -----------------------------
  const llenarMaximo = (index: number) => {
    const newDatosInst = { ...datosInst };
    newDatosInst.productos[index].entregado =
      newDatosInst.productos[index].cantidad;
    setDatosInst(newDatosInst);
  };

  // -----------------------------
  // 🔢 Actualizar valor de producto
  // -----------------------------
  const updateList = (event: CustomEvent, index: number) => {
    const format = /^\d*\.?\d*$/;
    const value = event.detail.value;

    if (format.test(value)) {
      const newDatosInst = { ...datosInst };
      newDatosInst.productos[index].entregado = value;
      setDatosInst(newDatosInst);
    }
  };

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // -----------------------------
  // 💾 Guardar productos (y firma) en Preferences
  // -----------------------------
  const guardarProductos = async () => {
    // Verificar que haya al menos una imagen
    if (numImagenes < 1) {
      presentAlert({
        header: "Sin imágenes",
        message:
          "No puedes guardar sin antes haber tomado al menos una imagen.",
        cssClass: "alert-android",
        buttons: ["Ok"],
      });
      return;
    }

    // Obtener fecha y hora actual
    const today = new Date();
    const date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    const time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const dateTime = date + " " + time;

    // Verificar que se haya ingresado quien recibe
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

    // Validar los productos
    for (let i = 0; i < datosInst.productos.length; i++) {
      // Verificar que sea un número
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

      // Verificar que no sea mayor a la cantidad a entregar
      if (
        +datosInst.productos[i].entregado > +datosInst.productos[i].cantidad
      ) {
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

    // Incluir la firma en los datos guardados
    const newDatosInst = {
      ...datosInst,
      save_chofer: "1",
      fecha_guardado: dateTime,
      ...(firmaPreview ? { firma: firmaPreview } : {}),
    };
    setDatosInst(newDatosInst);

    // Guardar en el almacenamiento
    await guardar_storage_productos(newDatosInst);
  };

  // -----------------------------
  // 💾 Lógica para guardar en Preferences
  // -----------------------------
  const guardar_storage_productos = async (datosActualizados: any) => {
    try {
      // Obtener datos actuales de instituciones guardadas
      const { value: distDatosValue } = await Preferences.get({
        key: "distDatos",
      });
      const distDatos = distDatosValue ? JSON.parse(distDatosValue) : [];

      // Actualizar el elemento correspondiente
      const index = distDatos.findIndex(
        (item: any) => item.dist_inst_id === instId
      );
      if (index !== -1) {
        distDatos[index] = datosActualizados;
      }

      // Marcar que hay información por guardar
      await Preferences.set({ key: "info_por_guardar", value: "1" });

      // Guardar los datos actualizados
      await Preferences.set({
        key: "distDatos",
        value: JSON.stringify(distDatos),
      });

      // Preparar objeto de imágenes y firma para guardar
      const objetoImagenes: any = {
        imagenes: imagenesStorage,
        imagenes_mostrar: imagenPreview,
        inst_id: instId,
      };
      // Si existe firma, la agregamos
      if (firmaPreview) {
        objetoImagenes.firma = firmaPreview;
      }

      // Guardar imágenes (y firma) en Preferences
      const { value } = await Preferences.get({ key: "imagenes_subir" });
      let arregloImagenes: any[] = [];

      if (!value || value === "") {
        arregloImagenes.push(objetoImagenes);
      } else {
        arregloImagenes = JSON.parse(value);

        // Verificar si ya existe un registro para esta institución
        const existingIndex = arregloImagenes.findIndex(
          (item: any) => item.inst_id === instId
        );

        if (existingIndex !== -1) {
          arregloImagenes[existingIndex] = objetoImagenes;
        } else {
          arregloImagenes.push(objetoImagenes);
        }
      }

      await Preferences.set({
        key: "imagenes_subir",
        value: JSON.stringify(arregloImagenes),
      });

      // Mostrar alerta de éxito y regresar
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

  const ensureExternalStoragePermission = async () => {
    try {
      const permissions: PermissionStatus = await Filesystem.checkPermissions();

      if (permissions.publicStorage !== "granted") {
        const requestResult = await Filesystem.requestPermissions();

        if (requestResult.publicStorage !== "granted") {
          throw new Error("Permiso de almacenamiento denegado");
        }
      }
    } catch (permissionError) {
      console.error("Error al verificar permisos de almacenamiento:", permissionError);
      throw permissionError;
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
        const instIndex = arregloImagenes.findIndex(
          (item: any) => item.inst_id === instId
        );

        if (instIndex !== -1) {
          const imagenesInst = arregloImagenes[instIndex];
          const nuevasImagenes = [...(imagenesInst.imagenes || [])];
          const nuevasImagenesMostrar = [
            ...(imagenesInst.imagenes_mostrar || []),
          ];

          nuevasImagenes.splice(index, 1);
          nuevasImagenesMostrar.splice(index, 1);

          arregloImagenes[instIndex] = {
            ...imagenesInst,
            imagenes: nuevasImagenes,
            imagenes_mostrar: nuevasImagenesMostrar,
          };

          await Preferences.set({
            key: "imagenes_subir",
            value: JSON.stringify(arregloImagenes),
          });
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
    if (numImagenes >= 1) {
      presentAlert({
        header: "Máximo de imágenes",
        message:
          "Solo se puede tomar una foto. Elimina la imagen actual para capturar una nueva.",
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
        // Incrementar el contador de imágenes
        setNumImagenes((prevNum) => prevNum + 1);

        // Generar un nombre de archivo único
        const tempFilename = `image_${Date.now()}.jpg`;

        try {
          // Convertir la URI a un blob
          const response = await fetch(image.webPath);
          const blob = await response.blob();

          // Crear un objeto File
          const file = new File([blob], tempFilename, { type: "image/jpeg" });

          // Guardar el archivo en el sistema de archivos
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const dataUrl =
                typeof reader.result === "string" ? reader.result : "";

              if (!dataUrl) {
                throw new Error("No se pudo leer el contenido de la imagen");
              }

              const commaIndex = dataUrl.indexOf(",");

              if (commaIndex === -1) {
                throw new Error(
                  "El contenido de la imagen no tiene el formato esperado"
                );
              }

              const base64Image = dataUrl.substring(commaIndex + 1);

              if (Capacitor.getPlatform() === "android") {
                try {
                  await ensureExternalStoragePermission();
                } catch (permissionError) {
                  console.error(
                    "Permiso de almacenamiento denegado:",
                    permissionError
                  );
                  presentAlert({
                    header: "Permiso requerido",
                    message:
                      "No se otorgó permiso para almacenar imágenes en la galería.",
                    cssClass: "alert-android",
                    buttons: ["Ok"],
                  });
                  return;
                }

                const today = new Date();
                const padNumber = (value: number) =>
                  value.toString().padStart(2, "0");
                const todayFolder = `${today.getFullYear()}-${padNumber(
                  today.getMonth() + 1
                )}-${padNumber(today.getDate())}`;
                const galleryFolder = `Pictures/Desayunos/${todayFolder}`;

                try {
                  await Filesystem.mkdir({
                    path: galleryFolder,
                    directory: Directory.ExternalStorage,
                    recursive: true,
                  });
                } catch (mkdirError: any) {
                  const message = mkdirError?.message || "";
                  if (
                    !message.includes("EEXIST") &&
                    !message.includes("exists")
                  ) {
                    console.error(
                      "Error al crear la carpeta de la galería:",
                      mkdirError
                    );
                  }
                }

                const galleryPath = `${galleryFolder}/${tempFilename}`;
                try {
                  await Filesystem.writeFile({
                    path: galleryPath,
                    data: base64Image,
                    directory: Directory.ExternalStorage,
                    recursive: true,
                  });

                  const { uri } = await Filesystem.getUri({
                    directory: Directory.ExternalStorage,
                    path: galleryPath,
                  });

                  const filePath =
                    uri || `${Directory.ExternalStorage}/${galleryPath}`;
                  const previewPath = Capacitor.convertFileSrc(filePath);
                  const resolvedPreviewPath =
                    previewPath ?? image.webPath ?? dataUrl;

                  if (!resolvedPreviewPath) {
                    throw new Error("No se pudo resolver la ruta de la imagen");
                  }

                  setImagenPreview([resolvedPreviewPath]);
                  setImagenesStorage([filePath]);
                } catch (saveError) {
                  console.error(
                    "Error al guardar la imagen en la galería:",
                    saveError
                  );
                  presentAlert({
                    header: "Error",
                    message:
                      "No se pudo guardar la imagen en la galería del dispositivo.",
                    cssClass: "alert-android",
                    buttons: ["Ok"],
                  });
                }
              } else {
                const savedFile = await Filesystem.writeFile({
                  path: tempFilename,
                  data: base64Image,
                  directory: Directory.Data,
                });

                const filePath =
                  savedFile.uri || `${Directory.Data}/${tempFilename}`;
                const previewPath = Capacitor.convertFileSrc(filePath);
                const resolvedPreviewPath = previewPath ?? image.webPath;

                if (!resolvedPreviewPath) {
                  throw new Error("No se pudo resolver la ruta de la imagen");
                }

                setImagenPreview([resolvedPreviewPath]);
                setImagenesStorage([filePath]);
              }
            } catch (imageProcessingError) {
              console.error(
                "Error al procesar la imagen capturada:",
                imageProcessingError
              );
              presentAlert({
                header: "Error",
                message: "No se pudo procesar la imagen capturada.",
                cssClass: "alert-android",
                buttons: ["Ok"],
              });

              const filePath =
                savedFile.uri || `${Directory.Data}/${tempFilename}`;
              const previewPath = Capacitor.convertFileSrc(filePath);
              const resolvedPreviewPath = previewPath ?? image.webPath;

              if (!resolvedPreviewPath) {
                throw new Error("No se pudo resolver la ruta de la imagen");
              }

              setImagenPreview([resolvedPreviewPath]);
              setImagenesStorage([filePath]);
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

  // -----------------------------
  // ✏️ Actualizar observaciones
  // -----------------------------
  const handleObservacionesChange = (event: CustomEvent) => {
    const newDatosInst = { ...datosInst, observaciones: event.detail.value };
    setDatosInst(newDatosInst);
  };

  // -----------------------------
  // 👤 Actualizar quien recibe
  // -----------------------------
  const handleQuienRecibeChange = (event: CustomEvent) => {
    const newDatosInst = { ...datosInst, quien_recibe: event.detail.value };
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
