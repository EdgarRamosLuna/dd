// src/pages/Institucion.tsx
import React, { useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonTextarea,
  IonButton,
  IonBackButton,
  IonButtons,
  useIonViewDidEnter,
} from "@ionic/react";
import { useParams, useLocation } from "react-router-dom";
import { useInstitucion } from "../hooks/useInstitucion";
import FirmaCanvas from "../components/FirmaCanvas";
import "./Institucion.css";
import CustomAlert from "../components/CustomAlert";

interface InstitucionParams {
  id: string;
}

const Institucion: React.FC = () => {
  // Obtener parámetro "id" y data de la ubicación
  const { id } = useParams<InstitucionParams>();
  const location = useLocation();
  const { datosInst: institucionData } = (location.state as any) || {};

  // Usar nuestro hook personalizado
  const {
    datosInst,
    imagenPreview,
    imagenesGuardadas,
    cargarImagenesGuardadas,
    llenarMaximo,
    updateList,
    guardarProductos,
    mostrar_camara,
    eliminarImagen,
    eliminarImagenGuardada,
    handleObservacionesChange,
    handleQuienRecibeChange,
    showAlert,
    setShowAlert,
    alertMessage,
    firmaPreview,
    handleGuardarFirma,
  } = useInstitucion(institucionData, id);

  // Cuando entremos a la vista, cargamos imágenes y firma previas
  useIonViewDidEnter(() => {
    cargarImagenesGuardadas();
  });

  return (
    <IonPage>
      <CustomAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        message={alertMessage}
        buttons={["Ok"]}
        cssClass="alertaSuccess"
      />
      <IonHeader
        className="institucionHeader"
        translucent={false}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(56px + env(safe-area-inset-top))",
        }}
      >
        <IonToolbar className="tituloHomeInstitucion">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text={""} />
          </IonButtons>
          <IonTitle></IonTitle>
          <div className="textHeaderContainer">
            <div className="nomEscCont">
              <div className="nomEscTxt">
                {datosInst.institucion} -{" "}
                <span className="spanClave">{datosInst.clave}</span>
              </div>
              <div className="linea"></div>
            </div>
            <div className="dataEscCont">
              <div className="datEscCont_1">
                <div className="datEscTxt">
                  <span className="spanHeaderBold">Dirección: </span>
                  <span className="spanHeaderRegular">
                    {datosInst.domicilio}
                  </span>
                </div>
                <div className="datEscTxt">
                  <span className="spanHeaderBold">Municipio: </span>
                  <span className="spanHeaderRegular">
                    {datosInst.municipio}
                  </span>
                </div>
                <div className="datEscTxt">
                  <span className="spanHeaderBold">Teléfono: </span>
                  <span className="spanHeaderRegular">
                    {datosInst.telefono}
                  </span>
                </div>
              </div>
              <div className="datEscCont_2">
                <div className="datEscTxt2">
                  <span className="spanHeaderBold">Localidad: </span>
                  <span>{datosInst.localidad}</span>
                </div>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={{
          "--padding-top": "9em",
          "--padding-bottom": "0px",
          "--padding-start": "10px",
          "--padding-end": "10px",
          "--offset-top": "0px",
          "--keyboard-offset": "0px",
        }}
      >
        {/* Tabla de productos */}
        <div className="contTabla">
          <table id="tablaProductos">
            <thead>
              <tr>
                <td>Producto</td>
                <td>Marca</td>
                <td>U.M.</td>
                <td>Cant.</td>
                <td>Ent.</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {datosInst.productos &&
                datosInst.productos.map((producto: any, index: number) => (
                  <tr key={index}>
                    <td className="tdProducto">{producto.producto}</td>
                    <td>{producto.marca}</td>
                    <td>{producto.unidad_medida}</td>
                    <td>{producto.cantidad}</td>
                    <td>
                      <IonInput
                        type="tel"
                        value={producto.entregado}
                        onIonInput={(e) => updateList(e, index)}
                        className="textInputProducto"
                        disabled={datosInst.save_chofer === "1"}
                      />
                    </td>
                    <td>
                      <IonButton
                        onClick={() => llenarMaximo(index)}
                        className="btnMax"
                        disabled={datosInst.save_chofer === "1"}
                      >
                        Max
                      </IonButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Observaciones y quien recibe */}
        <div className="contDatosExtra">
          <label className="lblObs">Observaciones:</label>
          <IonTextarea
            value={datosInst.observaciones}
            onIonInput={handleObservacionesChange}
            className="textObservaciones"
            disabled={datosInst.save_chofer === "1"}
          />

          <label className="lblObs">Nombre de la persona que recibe:</label>
          <IonInput
            type="text"
            value={datosInst.quien_recibe}
            onIonInput={handleQuienRecibeChange}
            className="inputQuienRecibe"
            disabled={datosInst.save_chofer === "1"}
          />
        </div>

        {/* Aquí mostramos la firmaCanvas y la vista previa de la firma */}
        {/* <div className="firmaCanvasContainer">
          <label className="lblObs">Firma de quien recibe:</label>
          <FirmaCanvas onGuardarFirma={handleGuardarFirma} />
          {firmaPreview && (
            <img
              src={firmaPreview}
              alt="Firma guardada"
              style={{
                marginTop: 10,
                border: "1px solid #ccc",
                maxWidth: "100%",
              }}
            />
          )}
        </div> */}

        {/* Vista previa de las imágenes tomadas */}
        {imagenPreview && imagenPreview.length > 0 && (
          <div className="contImagenes">
            {imagenPreview.map((imagen, index) => (
              <div className="imagenPreviewWrapper" key={`preview-${index}`}>
                <img src={imagen} className="imgPreview" alt={`Preview ${index}`} />
                {datosInst.save_chofer === "0" && (
                  <IonButton
                    color="danger"
                    className="btnEliminarImagen"
                    onClick={() => eliminarImagen(index)}
                  >
                    Eliminar
                  </IonButton>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Imágenes que ya estaban guardadas */}
        {imagenesGuardadas && imagenesGuardadas.length > 0 && (
          <div className="contImagenesGuardadas">
            {imagenesGuardadas.map((imagen, index) => (
              <div
                className="imagenPreviewWrapper"
                key={`saved-${index}`}
              >
                <img src={imagen} className="imgPreview" alt={`Saved ${index}`} />
                {datosInst.save_chofer === "0" && (
                  <IonButton
                    color="danger"
                    className="btnEliminarImagen"
                    onClick={() => eliminarImagenGuardada(index)}
                  >
                    Eliminar
                  </IonButton>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botón Guardar (solo si save_chofer === "0") */}
        {datosInst.save_chofer === "0" && (
          <div className="contBotonCentrado">
            <IonButton
              className="btnGuardarProductos"
              onClick={guardarProductos}
            >
              Guardar
            </IonButton>
          </div>
        )}

        {/* Botón Cámara (solo si save_chofer === "0") */}
        {datosInst.save_chofer === "0" && (
          <div className="contBotonCentrado contAbajo">
            <IonButton className="btnCamara" onClick={mostrar_camara}>
              <img
                src="assets/imgs/icoCamara.png"
                className="icoCamara"
                alt="Cámara"
              />
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Institucion;
