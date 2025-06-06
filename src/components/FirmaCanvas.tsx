// src/components/FirmaCanvas.tsx
import React, { useRef, useEffect, useState } from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { saveOutline, trashOutline } from "ionicons/icons";

interface FirmaCanvasProps {
  onGuardarFirma: (dataUrl: string) => void;
  altura?: number; // opcional: altura en píxeles
}

const FirmaCanvas: React.FC<FirmaCanvasProps> = ({
  onGuardarFirma,
  altura = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Ajusta el tamaño del canvas al 100% del ancho del contenedor
  const ajustarTamaño = () => {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;

    const anchoDisponible = contenedor.offsetWidth;
    canvas.width = anchoDisponible;
    canvas.height = altura;

    const contexto = canvas.getContext("2d");
    if (contexto) {
      contexto.lineCap = "round";
      contexto.lineWidth = 2;
      setCtx(contexto);
    }
  };

  useEffect(() => {
    ajustarTamaño();
    window.addEventListener("resize", ajustarTamaño);
    return () => {
      window.removeEventListener("resize", ajustarTamaño);
    };
  }, []);

  // Inicia un nuevo trazado
  const comenzarDibujo = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    ctx.beginPath();

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  // Dibuja mientras se mantiene presionado el botón izquierdo
  const dibujar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx || e.buttons !== 1) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Limpia todo el contenido del canvas
  const limpiarCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convierte el canvas a base64 y avisa al padre
  const guardarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onGuardarFirma(dataUrl);
  };

  return (
   <div ref={contenedorRef} style={{ width: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid #000",
          background: "#fff",
          display: "block",
        }}
        onMouseDown={comenzarDibujo}
        onMouseMove={dibujar}
      />
      <div style={{ marginTop: 10, display: "flex", gap: "0.5rem" }}>
        <IonButton onClick={guardarFirma}>
          <IonIcon icon={saveOutline} />
        </IonButton>
        <IonButton onClick={limpiarCanvas}>
          <IonIcon icon={trashOutline} />
        </IonButton>
      </div>
    </div>
  );
};

export default FirmaCanvas;
