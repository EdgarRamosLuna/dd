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
export async function saveCopyToGalleryFromBase64(base64Jpeg: string, fileNameNoExt: string, albumName = "DIF") {
  const canUseMedia = typeof (Media as any)?.savePhoto === "function";
  if (!canUseMedia) return;
  try {
    const perm = await (Media as any).checkPermissions?.();
    if (!perm || perm.photos !== "granted") {
      const req = await (Media as any).requestPermissions?.({ permissions: ["photos"] });
      if (!req || req.photos !== "granted") {
        return;
      }
    }
    const dataUrl = base64Jpeg.startsWith("data:")
      ? base64Jpeg
      : data:image/jpeg;base64,;
    await (Media as any).createAlbum?.({ name: albumName }).catch(() => {});

    let albumIdentifier: string | undefined;
    try {
      const { albums } = await Media.getAlbums();
      albumIdentifier = albums.find((album: any) => album.name === albumName)?.identifier;
    } catch (albumErr) {
      console.warn("[files] No se pudo obtener el identificador del álbum:", albumErr);
    }

    const sanitizedName = fileNameNoExt.replace(/\.[a-zA-Z0-9]+$/, "");
    await Media.savePhoto({
      path: dataUrl,
      fileName: sanitizedName || fileNameNoExt,
      albumIdentifier,
    });
  } catch (err) {
    console.warn("[files] saveCopyToGalleryFromBase64:", err);
  }
}

export { DIF_DIR };

