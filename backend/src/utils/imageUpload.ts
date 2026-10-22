import multer from 'multer';
import path from 'path';
import fsp from 'fs/promises';
import { Request, Response, NextFunction } from 'express';

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_MB || '5', 10);
export const MAX_IMAGES_PER_REQUEST = parseInt(process.env.MAX_IMAGES_PER_REQUEST || '10', 10);

export class ImageValidationError extends Error {}

export const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_MIMES.has(file.mimetype) && IMAGE_EXTS.has(ext)) return cb(null, true);
  cb(new ImageValidationError('Formato no permitido. Solo JPG, PNG o WEBP.'));
};

/** Para rutas que guardan en GridFS (publicaciones, publicidad) */
export const uploadImageMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: MAX_IMAGES_PER_REQUEST },
});

/** Detecta el tipo real mirando los primeros bytes */
function detectImageType(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

async function readHead(file: Express.Multer.File): Promise<Buffer> {
  if (file.buffer) return file.buffer.subarray(0, 12);
  const fh = await fsp.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(12);
    await fh.read(buf, 0, 12, 0);
    return buf;
  } finally { await fh.close(); }
}

/** Lanza ImageValidationError si algún archivo no es una imagen real */
export async function assertRealImages(files: Express.Multer.File[]) {
  for (const f of files) {
    const real = detectImageType(await readHead(f));
    if (!real) throw new ImageValidationError(`"${f.originalname}" no es una imagen válida.`);
    f.mimetype = real; // usar el tipo real, no el que declaró el cliente
  }
}

/** Borra del disco los archivos temporales (no hace nada con memoryStorage) */
export async function cleanupFiles(files?: Express.Multer.File[]) {
  await Promise.all((files ?? []).filter(f => f.path).map(f => fsp.unlink(f.path).catch(() => {})));
}

/** Middleware global de errores de subida: ponlo al final de app.ts */
export function uploadErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const map: Record<string, string> = {
      LIMIT_FILE_SIZE: `La imagen supera el máximo de ${MAX_IMAGE_MB} MB.`,
      LIMIT_FILE_COUNT: `Máximo ${MAX_IMAGES_PER_REQUEST} imágenes por solicitud.`,
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado.',
    };
    return res.status(400).json({ success: false, message: map[err.code] || err.message });
  }
  if (err instanceof ImageValidationError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
}