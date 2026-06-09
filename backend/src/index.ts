import express, { Request, Response, Express } from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import { connectBD } from "./utils/mongodb";

import usuarioRoutes from "./routes/usuario.routes";
import publicacionRoutes from "./routes/publicaciones.routes";
import bibliotecaRoutes from "./routes/biblioteca.routes";
import elementRoutes from "./routes/element.routes";
import configuracionRoutes from "./routes/configuracion.routes";
import filesRouter from "./routes/files.routes";
import seccionAcercaRoutes from "./routes/seccionAcerca.routes";
import perfilRoutes from "./routes/perfil.routes";
import { startPublicationExpirationJob } from "./services/publicacionExpiration.service";
import tutorialRoutes from "./routes/tutorial.routes";
import notificacionesRoutes from "./routes/notificaciones.routes";
import paqueteSuscripcionRoutes from "./routes/paqueteSuscripcion.routes";
import publicidadRoutes from "./routes/publicidad.routes";
import proyectosDestacadosRoutes from "./routes/proyectosDestacados.routes";

// Rutas de PayPal
import paypalRoutes from "./routes/paypal.routes";
import bancoProfesionalesRoutes from "./routes/bancoProfesionales.routes";

const app: Express = express();
dotenv.config();

app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));

/** CORS: lista fija + extra por variable (para Railway Frontend luego) */
const defaultCorsOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  "https://proyecto-komuness-front.vercel.app",
  "https://komuness-project.netlify.app",
  "http://64.23.137.192",
  "http://159.54.148.238",
  "https://komuness.duckdns.org",
  "https://proyecto-komuness-production.up.railway.app",
  "https://frontend-production-0b7e.up.railway.app/",
];

const extraCorsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultCorsOrigins, ...extraCorsOrigins]),
);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

/** ====== ESTÁTICOS (reemplazo directo de Nginx alias) ====== */
const UPLOADS_ROOT = process.env.UPLOAD_DIR || "/srv/uploads";
const LIBRARY_DIR =
  process.env.LIBRARY_DIR || path.join(UPLOADS_ROOT, "biblioteca");
const ACERCADE_DIR =
  process.env.ACERCADE_LIB || path.join(UPLOADS_ROOT, "acercade");
const PROFILE_DIR =
  process.env.PROFILE_LIB || path.join(UPLOADS_ROOT, "perfil");
const CSV_DIR = process.env.CSV_LIB || path.join(UPLOADS_ROOT, "csv");

app.use("/uploads", express.static(UPLOADS_ROOT));
app.use(
  "/biblioteca",
  express.static(process.env.LIBRARY_DIR || UPLOADS_ROOT + "/biblioteca"),
);
app.use(
  "/acercade",
  express.static(process.env.ACERCADE_LIB || UPLOADS_ROOT + "/acercade"),
);
app.use(
  "/perfil",
  express.static(process.env.PROFILE_LIB || UPLOADS_ROOT + "/perfil"),
);
app.use("/csv", express.static(process.env.CSV_LIB || UPLOADS_ROOT + "/csv"));

/** ====== Rutas API ====== */
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/usuario", usuarioRoutes);
app.use("/api/publicaciones", publicacionRoutes);
app.use("/api/biblioteca", bibliotecaRoutes);
app.use("/api/elements", elementRoutes);
app.use("/api", filesRouter);
app.use("/api/acerca-de", seccionAcercaRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/banco-profesionales", bancoProfesionalesRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api/tutoriales", tutorialRoutes);
app.use("/api/proyectos-destacados", proyectosDestacadosRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/paquetes-suscripcion", paqueteSuscripcionRoutes);
app.use("/api/publicidad", publicidadRoutes);

/** Smoke test mínimo */
app.get("/api/", (_req: Request, res: Response) => {
  res.send("Hello World");
});

/** Healthcheck mínimo para Railway (útil para ver si conectó a Mongo) */
app.get(["/health", "/api/health"], (_req: Request, res: Response) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    mongoReadyState: mongoose.connection.readyState, // 1 = connected
  });
});

// Middleware global de errores
const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (
    err &&
    (err.code === "LIMIT_FILE_SIZE" ||
      err.code === "LIMIT_PART_COUNT" ||
      err.code === "LIMIT_FILE_COUNT")
  ) {
    res.status(413).json({
      success: false,
      message: `El archivo excede el límite permitido de ${process.env.LIBRARY_MAX_FILE_SIZE_MB || "200"} MB.`,
      errorCode: err.code || "LIMIT_EXCEEDED",
    });
    return;
  }

  if (err && err.status === 413) {
    res.status(413).json({
      success: false,
      message: `Payload demasiado grande. Asegúrate que los archivos no superen ${process.env.LIBRARY_MAX_FILE_SIZE_MB || "200"} MB.`,
    });
    return;
  }

  if (err && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
    res.status(502).json({
      success: false,
      message:
        "Hubo un problema de conexión durante la carga. Intenta nuevamente.",
      errorCode: err.code,
    });
    return;
  }

  if (
    err &&
    typeof err.message === "string" &&
    err.message.includes("Tipo de archivo no permitido")
  ) {
    res.status(400).json({
      success: false,
      message: err.message,
      errorCode: "INVALID_FILE_TYPE",
    });
    return;
  }

  if (err) {
    console.error("Unhandled error middleware:", err);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
    return;
  }
};

app.use(globalErrorHandler);

const port = process.env.PORT || 5000;

// Conexión a MongoDB
(async () => {
  await connectBD(process.env.BD_URL!);
  startPublicationExpirationJob();
  console.log("✅ MongoDB conectado");
})();

export default app;

if (require.main === module) {
  connectBD(process.env.BD_URL || "").then(() => {
    startPublicationExpirationJob();
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  });
}
