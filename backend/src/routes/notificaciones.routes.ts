import { Router } from "express";
import {
    getNotificaciones,
    createNotificacion,
    deleteNotificacion,
    updateNotificacion,
    notificacionSeenBy
} from "../controllers/notificacion.controller";

import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Obtener notificaciones con o sin filtro
//Filtro se vería algo como notificaciones?userId=...
router.get("/", authMiddleware, getNotificaciones);

// Crud
router.post("/", authMiddleware, createNotificacion);
router.delete("/:id", authMiddleware, deleteNotificacion);
router.put("/:id", authMiddleware, updateNotificacion);

//Un usuario vio la notificación
router.patch("/:id/visto", authMiddleware, notificacionSeenBy);

export default router;
