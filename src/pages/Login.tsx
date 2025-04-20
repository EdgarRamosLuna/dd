// src/pages/Login.tsx
import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonLoading,
  useIonAlert,
  IonButtons,
  IonImg,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { useUsuario } from "../contexts/UsuarioContext";
import "./Login.css";

const Login: React.FC = () => {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [presentAlert] = useIonAlert();
  const history = useHistory();

  // Usar el hook del contexto
  const { ingresar, ingresando } = useUsuario();

  const iniciarSesion = async () => {
    if (usuarioInput.length < 3 || contrasena.length < 3) {
      return;
    }

    setShowLoading(true);

    try {
      const data = await ingresar(usuarioInput, contrasena);
      if (!data.error) {
        history.replace("/home");
      } else {
        presentAlert({
          header: "Error al iniciar sesión",
          cssClass: "alert-android",
          message: data.mensaje || "Error desconocido",
          buttons: ["OK"],
        });
      }
    } catch (err: any) {
      const mensajeError =
        err.code === "ECONNABORTED"
          ? "Tu conexión a internet es baja, trata de conectarte a una red Wi-Fi o desde una ubicación con mejor señal."
          : "Error en el sistema al hacer login";
      presentAlert({
        header: "Error al iniciar sesión",
        cssClass: "alert-android",
        message: mensajeError,
        buttons: ["OK"],
      });
    } finally {
      setShowLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent={false}>
        <IonToolbar className="header-toolbar">
          <IonButtons slot="start">
            <IonImg
              src="assets/imgs/logoDif.png"
              className="logo-header"
              alt="Logo DIF"
            />
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
        <div className="contLogin">
          <div className="contBgBlanco">
            <label className="lblIngresa">Ingresa al sistema</label>
            <label className="lblTexto">Usuario</label>
            <input
              type="text"
              className="inputTexto"
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
            />
            <label className="lblTexto">Contraseña</label>
            <input
              type="password"
              className="inputTexto"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>
          <div className="contBgAzul">
            <div className="contBotonCentrado">
              <button
                className="btnLogin"
                disabled={usuarioInput.length < 3 || contrasena.length < 3}
                onClick={iniciarSesion}
              >
                Ingresar
              </button>
            </div>
          </div>
          <div className="clears"></div>
        </div>
        <IonLoading
          isOpen={showLoading || ingresando}
          message={"Espere por favor..."}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
