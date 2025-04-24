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
import "./Institucion.css";
import CustomAlert from "../components/CustomAlert";

interface InstitucionParams {
  id: string;
}

const Institucion: React.FC = () => {
  // Obtener parámetros de la URL y datos de la ubicación
  const { id } = useParams<InstitucionParams>();
  const location = useLocation();
  console.log("🚀 ~ location:", location)
  const { datosInst: institucionData } = (location.state as any) || {};

  // Usar el hook personalizado
  const {
    datosInst,
    imagenPreview,
    imagenesGuardadas,
    cargarImagenesGuardadas,
    llenarMaximo,
    updateList,
    guardarProductos,
    mostrar_camara,
    handleObservacionesChange,
    handleQuienRecibeChange,
    showAlert,
    setShowAlert,
    alertMessage,
  } = useInstitucion(institucionData, id);

  // Cargar imágenes guardadas cuando se muestra la vista
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
      <IonHeader className="institucionHeader"
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
                  <span className="spanHeaderBold">Direccion: </span>
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
                  <span className="spanHeaderBold">Telefono: </span>
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
        className=""
        style={{
          "--padding-top": "9em",
          "--padding-bottom": "0px",
          "--padding-start": "10px",
          "--padding-end": "10px",
          /* si quieres que el contenido suba bajo el header: */
          "--offset-top": "0px",
          /* y si no quieres offset bottom al aparecer teclado: */
          "--keyboard-offset": "0px",
        }}
      >
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

        {imagenPreview && imagenPreview.length > 0 && (
          <div className="contImagenes">
            {imagenPreview.map((imagen, index) => (
              <img
                key={`preview-${index}`}
                src={imagen}
                className="imgPreview"
                alt={`Preview ${index}`}
              />
            ))}
          </div>
        )}

        {imagenesGuardadas && imagenesGuardadas.length > 0 && (
          <div className="contImagenesGuardadas">
            {imagenesGuardadas.map((imagen, index) => (
              <img
                key={`saved-${index}`}
                src={imagen}
                className="imgPreview"
                alt={`Saved ${index}`}
              />
            ))}
          </div>
        )}

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
