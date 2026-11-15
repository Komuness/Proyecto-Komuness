import { Router } from "express";
import {
  getNotificaciones,
  createNotificacion,
  deleteNotificacion,
  deleteAllNotificaciones,
  updateNotificacion,
  notificacionSeenBy
} from "../controllers/notificacion.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Obtener notificaciones con o sin filtro
// Filtro se vería algo como notificaciones?userId=...
router.get("/", authMiddleware, getNotificaciones);

// Crear y editar (solo admin/super-admin)
router.post("/", authMiddleware, verificarRoles([0, 1]), createNotificacion);
router.put("/:id", authMiddleware, verificarRoles([0, 1]), updateNotificacion);

// Cada usuario puede eliminar sus notificaciones sin afectar a los demás
router.delete("/", authMiddleware, deleteAllNotificaciones);
router.delete("/:id", authMiddleware, deleteNotificacion);

// Un usuario vio la notificación
router.patch("/:id/visto", authMiddleware, notificacionSeenBy);

export default router;
