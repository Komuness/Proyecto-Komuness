// src/utils/api.js

// Detectar si estamos en desarrollo
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.port === "3000" ||
  window.location.port === "3001";

// FORZAR siempre el dominio correcto, no usar window.location.origin
// En desarrollo usar localhost:5000, en producción usar el dominio configurado
const RAW = process.env.REACT_APP_BACKEND_URL || "https://komuness.duckdns.org";
let BASE = (RAW || "").replace(/\/+$/, "");

// Si viene con /api al final (ej: https://servidor.com/api), se lo quitamos
if (BASE.endsWith("/api")) {
  BASE = BASE.slice(0, -4);
}

// EN DESARROLLO: Forzar localhost:5000
// EN PRODUCCIÓN: Usar el dominio configurado en el .env
const FINAL_BASE_URL = isDevelopment
  ? "http://localhost:5000" // Forzar localhost en desarrollo
  : BASE; // Usar configuración en producción

// Exportar URLs
export const BASE_URL = FINAL_BASE_URL; // p.ej. "http://localhost:5000" o "https://komuness.duckdns.org"
export const API_URL = `${BASE_URL}/api`; // p.ej. "http://localhost:5000/api"

// URL ESPECÍFICA para banco de profesionales - Mantener compatibilidad
export const PROFESIONALES_API_URL = isDevelopment
  ? "http://localhost:5000/api"
  : `${BASE}/api`;

// Debugging
console.log("=== CONFIGURACIÓN DE API (CORREGIDA) ===");
console.log("Entorno:", isDevelopment ? "DESARROLLO" : "PRODUCCIÓN");

export const getCategoriaById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/elements/categoria/${id}`);
    if (response.ok) return await response.json();
    return null;
  } catch (error) {
    console.error("Error al obtener categoría:", error);
    return null;
  }
};
