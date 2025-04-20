"use client"

import type React from "react"
import { IonModal, IonButton, IonContent } from "@ionic/react"
import "./CustomAlert.css"

interface CustomAlertProps {
  isOpen: boolean
  onDidDismiss: () => void
  message: string
  imageUrl?: string
  alertTitle?: string
  cssClass?: string
  buttons?: string[] | { text: string; handler?: () => void; role?: string }[]
  title?: string // Alias para alertTitle para compatibilidad
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  onDidDismiss,
  message,
  imageUrl = "assets/imgs/icoError.png",
  alertTitle = "Falta información",
  cssClass,
  buttons = ["OK"],
  title,
}) => {
  // Usar title como alternativa a alertTitle si está definido
  const displayTitle = title || alertTitle

  // Renderizar botones personalizados si se proporcionan
  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <IonButton expand="block" className="alert-button" onClick={onDidDismiss}>
          OK
        </IonButton>
      )
    }

    return buttons.map((button, index) => {
      if (typeof button === "string") {
        return (
          <IonButton key={index} expand="block" className="alert-button" onClick={onDidDismiss}>
            {button}
          </IonButton>
        )
      } else {
        return (
          <IonButton
            key={index}
            expand="block"
            className="alert-button"
            color={button.role === "cancel" ? "medium" : "primary"}
            onClick={() => {
              if (button.handler) {
                button.handler()
              }
              if (button.role !== "cancel") {
                onDidDismiss()
              }
            }}
          >
            {button.text}
          </IonButton>
        )
      }
    })
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      className={`custom-alert-modal ${cssClass || ""}`}
      breakpoints={[0, 0.4]}
      initialBreakpoint={0.4}
    >
      aaaa
      <IonContent className="ion-padding modal-content">
        <div className="alert-container">
          {imageUrl && (
            <div className="alert-image-container">
              <img src={imageUrl || "/placeholder.svg"} alt="Alerta" className="alert-image" />
            </div>
          )}
          <h2 className="alert-title">{displayTitle}</h2>
          <p className="alert-message">{message}</p>
          <div className="alert-button-container">{renderButtons()}</div>
        </div>
      </IonContent>
    </IonModal>
  )
}

export default CustomAlert
