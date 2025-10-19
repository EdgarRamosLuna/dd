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
  const activePointerId = useRef<number | null>(null);

  const ajustarTamaño = () => {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;

    const dpr = window.devicePixelRatio || 1;
    const width = contenedor.offsetWidth;
    const height = altura;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const contexto = canvas.getContext("2d");
    if (contexto) {
      contexto.lineCap = "round";
      contexto.lineWidth = 2;
      contexto.strokeStyle = "#000";
      contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  // Coordenadas para eventos táctiles
  const getTouchCoords = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const comenzarDibujo = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const comenzarDibujoTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getTouchCoords(e);
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

  const dibujarTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || !isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getTouchCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const detenerDibujo = () => {
    if (!ctx) return;
    isDrawing.current = false;
    ctx.closePath();
  };

  const detenerDibujoTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    detenerDibujo();
  };

  // Pointer Events (unifica mouse/touch/pen)
  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    e.preventDefault();
    activePointerId.current = e.pointerId;
    try { (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch {}
    const { x, y } = getPointerCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ctx || !isDrawing.current) return;
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    const { x, y } = getPointerCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    try { (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch {}
    activePointerId.current = null;
    detenerDibujo();
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
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseDown={comenzarDibujo}
        onMouseMove={dibujar}
        onMouseUp={detenerDibujo}
        onMouseLeave={detenerDibujo}
        onTouchStart={comenzarDibujoTouch}
        onTouchMove={dibujarTouch}
        onTouchEnd={detenerDibujoTouch}
        onTouchCancel={detenerDibujoTouch}
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
