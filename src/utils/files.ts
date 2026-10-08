// src/utils/files.ts
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";

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

interface SaveCopyOptions {
  albumName?: string;
  extension?: string;
}

/** Guarda una copia visible en la galeria usando base64 (sin encabezado). */
export async function saveCopyToGalleryFromBase64(
  base64Payload: string,
  fileNameBase: string,
  options: SaveCopyOptions = {}
): Promise<boolean> {
  try {
    const albumName = options.albumName ?? "DIF";
    const normalizedExt = (options.extension || "jpg").replace(/^\.+/, "").toLowerCase();
    const finalFileName = (fileNameBase || "foto").replace(/\.[a-z0-9]+$/gi, "") || "foto";
    const mime = normalizedExt === "jpg" ? "jpeg" : normalizedExt;

    const dataUrl = base64Payload.startsWith("data:")
      ? base64Payload
      : `data:image/${mime};base64,${base64Payload}`;

    let albumIdentifier: string | undefined = undefined;
    if (Capacitor.getPlatform() === "android") {
      const { path } = await Media.getAlbumsPath();
      if (!path) throw new Error("Media.getAlbumsPath devolvio una ruta vacia");

      try {
        await Media.createAlbum({ name: albumName });
      } catch (error) {
        // El plugin responde con error cuando el album ya existia.
        if (!String((error as any)?.message || error).toLowerCase().includes("already exists")) {
          throw error;
        }
      }

      albumIdentifier = `${path.replace(/\\+$/, "")}/${albumName}`;
    } else {
      try {
        await Media.createAlbum({ name: albumName });
      } catch (error) {
        if (!String((error as any)?.message || error).toLowerCase().includes("already exists")) {
          throw error;
        }
      }

      const { albums } = await Media.getAlbums();
      albumIdentifier = albums.find((album) => album.name === albumName)?.identifier;
      if (!albumIdentifier && Capacitor.getPlatform() === "ios") {
        // iOS permite guardar en la fototeca sin seleccionar un album.
        albumIdentifier = undefined;
      } else if (!albumIdentifier) {
        throw new Error(`No se encontro el identificador del album ${albumName}`);
      }
    }

    await Media.savePhoto({
      path: dataUrl,
      albumIdentifier,
      fileName: finalFileName,
    });
    return true;
  } catch (err) {
    console.error("[files] No se pudo copiar el archivo a la galeria:", err);
    return false;
  }
}

export { DIF_DIR };

