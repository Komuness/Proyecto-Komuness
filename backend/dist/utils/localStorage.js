"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadsRoot = getUploadsRoot;
exports.getLibraryDir = getLibraryDir;
exports.saveLibraryFileToDisk = saveLibraryFileToDisk;
exports.deleteLocalByKey = deleteLocalByKey;
// src/utils/localStorage.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Directorio raíz público de subidas que Nginx servirá en /uploads/
 * Estructura esperada:
 *   /srv/uploads/
 *     └── biblioteca/
 *         └── YYYY/MM/filename
 */
function getUploadsRoot() {
    return process.env.UPLOAD_DIR || '/srv/uploads';
}
/**
 * Directorio base para la Biblioteca
 */
function getLibraryDir() {
    // Permite sobreescribir con LIBRARY_DIR si quisieras moverla en el futuro
    return process.env.LIBRARY_DIR || path_1.default.join(getUploadsRoot(), 'biblioteca');
}
function ensureDir(p) {
    fs_1.default.mkdirSync(p, { recursive: true });
}
/** Limpia nombre de archivo para evitar caracteres problemáticos */
function safeName(name) {
    return name.replace(/[^\w.\-+@() ]+/g, '_');
}
/**
 * Guarda un archivo de Multer en: /srv/uploads/biblioteca/YYYY/MM/<uniqueName>
 * Devuelve:
 *  - key: ruta relativa a /srv/uploads (p.ej. "biblioteca/2025/09/1234_nombre.pdf")
 *  - url: URL pública que servirá Nginx (p.ej. "http://IP/uploads/biblioteca/2025/09/1234_nombre.pdf")
 *  - absPath: ruta absoluta en el disco
 */
function saveLibraryFileToDisk(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const base = getLibraryDir(); // /srv/uploads/biblioteca
        const subdir = path_1.default.join(base, yyyy, mm); // /srv/uploads/biblioteca/2025/09
        ensureDir(subdir);
        const unique = `${Date.now()}_${safeName(file.originalname)}`;
        const absPath = path_1.default.join(subdir, unique); // abs full path
        // escribir en disco
        yield fs_1.default.promises.writeFile(absPath, file.buffer);
        // key relativa a /srv/uploads
        const relFromUploads = path_1.default.relative(getUploadsRoot(), absPath).split(path_1.default.sep).join('/');
        const publicBase = process.env.PUBLIC_BASE_URL || 'http://159.54.148.238';
        const url = `${publicBase}/uploads/${relFromUploads}`;
        return {
            key: relFromUploads, // ejemplo: "biblioteca/2025/09/1694478123456_manual.pdf"
            url,
            absPath,
        };
    });
}
/** Borra un archivo usando la key relativa a /srv/uploads */
function deleteLocalByKey(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const abs = path_1.default.join(getUploadsRoot(), key);
        try {
            yield fs_1.default.promises.unlink(abs);
            return true;
        }
        catch (e) {
            // Si no existe, lo ignoramos para no romper el flujo de borrado
            if ((e === null || e === void 0 ? void 0 : e.code) === 'ENOENT')
                return false;
            throw e;
        }
    });
}
