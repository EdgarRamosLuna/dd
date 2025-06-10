import React, { useRef, useEffect, useState } from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { saveOutline, trashOutline } from "ionicons/icons";

interface FirmaCanvasProps {
  onGuardarFirma: (dataUrl: string) => void;
  altura?: number;
}

const FirmaCanvas: React.FC<FirmaCanvasProps> = ({
  onGuardarFirma,
  altura = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);

  const ajustarTamaño = () => {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;

    canvas.width = contenedor.offsetWidth;
    canvas.height = altura;

    const contexto = canvas.getContext("2d");
    if (contexto) {
      contexto.lineCap = "round";
      contexto.lineWidth = 2;
      contexto.strokeStyle = "#000";
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

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const comenzarDibujo = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const dibujar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx || !isDrawing.current) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const detenerDibujo = () => {
    if (!ctx) return;
    isDrawing.current = false;
    ctx.closePath();
  };

  const limpiarCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

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
          width: "100%",
        }}
        onMouseDown={comenzarDibujo}
        onMouseMove={dibujar}
        onMouseUp={detenerDibujo}
        onMouseLeave={detenerDibujo}
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
