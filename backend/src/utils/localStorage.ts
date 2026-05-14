// src/utils/localStorage.ts
import fs from 'fs';
import path from 'path';

/**
 * Directorio raíz público de subidas que Nginx servirá en /uploads/
 * Estructura esperada:
 *   /srv/uploads/
 *     └── biblioteca/
 *         └── YYYY/MM/filename
 */
export function getUploadsRoot(): string {
  return process.env.UPLOAD_DIR || '/srv/uploads';
}

/**
 * Directorio base para la Biblioteca
 */
export function getLibraryDir(): string {
  // Permite sobreescribir con LIBRARY_DIR si quisieras moverla en el futuro
  return process.env.LIBRARY_DIR || path.join(getUploadsRoot(), 'biblioteca');
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

/** Limpia nombre de archivo para evitar caracteres problemáticos */
function safeName(name: string) {
  return name.replace(/[^\w.\-+@() ]+/g, '_');
}

/**
 * Guarda un archivo de Multer en: /srv/uploads/biblioteca/YYYY/MM/<uniqueName>
 * Devuelve:
 *  - key: ruta relativa a /srv/uploads (p.ej. "biblioteca/2025/09/1234_nombre.pdf")
 *  - url: URL pública que servirá Nginx (p.ej. "http://IP/uploads/biblioteca/2025/09/1234_nombre.pdf")
 *  - absPath: ruta absoluta en el disco
 */
export async function saveLibraryFileToDisk(file: Express.Multer.File) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  const base = getLibraryDir();                    // /srv/uploads/biblioteca
  const subdir = path.join(base, yyyy, mm);        // /srv/uploads/biblioteca/2025/09
  ensureDir(subdir);

  const unique = `${Date.now()}_${safeName(file.originalname)}`;
  const absPath = path.join(subdir, unique);       // abs full path

  // escribir en disco
  await fs.promises.writeFile(absPath, file.buffer);

  // key relativa a /srv/uploads
  const relFromUploads = path.relative(getUploadsRoot(), absPath).split(path.sep).join('/');

  const publicBase = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
  const url = `${publicBase}/uploads/${relFromUploads}`;

  return {
    key: relFromUploads,  // ejemplo: "biblioteca/2025/09/1694478123456_manual.pdf"
    url,
    absPath,
  };
}

/** Borra un archivo usando la key relativa a /srv/uploads */
export async function deleteLocalByKey(key: string) {
  const abs = path.join(getUploadsRoot(), key);
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (e: any) {
    // Si no existe, lo ignoramos para no romper el flujo de borrado
    if (e?.code === 'ENOENT') return false;
    throw e;
  }
}
