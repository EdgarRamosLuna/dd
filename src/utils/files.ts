// src/utils/files.ts
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Media } from "@capacitor-community/media";

const DIF_DIR = "dif";

const sanitizeFileName = (name?: string) => {
  const fallback = `img_${Date.now()}.jpg`;
  if (!name) return fallback;
  const trimmed = name.replace(/\s+/g, "_");
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!cleaned) return fallback;
  if (!cleaned.includes(".")) return `${cleaned}.jpg`;
  return cleaned;
};

const ensureDifDir = async () => {
  try {
    await Filesystem.mkdir({
      path: DIF_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (!msg.includes("exist")) {
      console.warn("[files] mkdir dif:", err);
    }
  }
};

const normalizeRelative = (value: string) => {
  const trimmed = value.replace(/^file:\/\//, "").replace(/^\/+/, "");
  return trimmed.startsWith(`${DIF_DIR}/`) ? trimmed : `${DIF_DIR}/${trimmed}`;
};

/** Garantiza que una ruta termine dentro del sandbox y retorna siempre algo como "dif/xxx.jpg". */
export async function ensureInSandbox(anyPath: string, fileName = `img_${Date.now()}.jpg`) {
  await ensureDifDir();
  const input = (anyPath || "").trim();
  const safeName = sanitizeFileName(fileName);
  if (!input) throw new Error("Ruta vacía para ensureInSandbox");
  const targetRelative = `${DIF_DIR}/${safeName}`;

  // Data URL directa
  if (input.startsWith("data:")) {
    const base64 = input.includes(",") ? input.split(",").pop() || "" : input;
    await Filesystem.writeFile({
      path: targetRelative,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
    return targetRelative;
  }

  // content:// o file:// => leer sin directory
  if (input.startsWith("content://") || input.startsWith("file://")) {
    const { data } = await Filesystem.readFile({ path: input });
    await Filesystem.writeFile({
      path: targetRelative,
      data,
      directory: Directory.Data,
      recursive: true,
    });
    return targetRelative;
  }

  const trimmed = input.replace(/^file:\/\//, "").replace(/^\/+/, "");
  if (trimmed.startsWith(`${DIF_DIR}/`)) {
    return trimmed;
  }

  // Intentar leer desde Directory.Data y copiar
  const { data } = await Filesystem.readFile({
    path: trimmed,
    directory: Directory.Data,
  });
  await Filesystem.writeFile({
    path: targetRelative,
    data,
    directory: Directory.Data,
    recursive: true,
  });
  try {
    await Filesystem.deleteFile({ path: trimmed, directory: Directory.Data });
  } catch {
    /* noop */
  }
  return targetRelative;
}

/** Lee base64 respetando si es content://, file://, dataURL o relativa en sandbox. */
export async function readBase64Smart(pathLike: string) {
  const input = (pathLike || "").trim();
  if (!input) throw new Error("Ruta vacía para readBase64Smart");

  if (input.startsWith("data:")) {
    return input.includes(",") ? input.split(",").pop() || "" : input;
  }

  if (input.startsWith("content://") || input.startsWith("file://")) {
    const { data } = await Filesystem.readFile({ path: input });
    return data as string;
  }

  const rel = normalizeRelative(input);
  const { data } = await Filesystem.readFile({
    path: rel,
    directory: Directory.Data,
  });
  return data as string;
}

/** Guarda una copia visible en la galería (álbum "DIF") usando base64 (sin encabezado). */
// Reemplaza SOLO esta función en src/utils/files.ts
export async function saveCopyToGalleryFromBase64(base64Jpeg: string, fileNameNoExt: string, albumName = "DIF") {
  try {
    // 1) perms (el plugin devuelve { photos: 'granted'|'denied' ... })
    let perm: any = undefined;
    if (typeof (Media as any).checkPermissions === "function") {
      perm = await (Media as any).checkPermissions();
    }
    if (!perm || perm.photos !== "granted") {
      if (typeof (Media as any).requestPermissions === "function") {
        const req = await (Media as any).requestPermissions({ permissions: ["photos"] });
        if (!req || req.photos !== "granted") return;
      }
    }

    // 2) data URL
    const dataUrl = base64Jpeg.startsWith("data:")
      ? base64Jpeg
      : `data:image/jpeg;base64,${base64Jpeg}`;

    // 3) garantiza álbum y obtiene identifier
    try {
      if (typeof (Media as any).createAlbum === "function") {
        await (Media as any).createAlbum({ name: albumName });
      }
    } catch { /* ya existe */ }

    let albumIdentifier: string | undefined = undefined;
    try {
      const res: any = await (Media as any).getAlbums();
      const dif = (res?.albums || []).find((a: any) => a?.name === albumName);
      albumIdentifier = dif?.identifier;
    } catch { /* continúa sin identifier */ }

    // 4) guarda en galería (evita propiedades no tipadas)
    const sanitized = (fileNameNoExt || "foto").replace(/\.[a-z0-9]+$/i, "");
    const opts: any = { path: dataUrl };
    if (albumIdentifier) opts.albumIdentifier = albumIdentifier;
    // Si tu versión del plugin soporta fileName, se lo pasamos; si no, lo ignora.
    opts.fileName = sanitized;

    await (Media as any).savePhoto(opts);
  } catch (err) {
    console.warn("[files] saveCopyToGalleryFromBase64:", err);
  }
}


export { DIF_DIR };

