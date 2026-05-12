import { Router } from "express";
import multer from "multer";

const upload = multer();
import {
    createPublicidad,
    deletePublicidad,
    getPublicidades,
    updatePublicidad,
} from "../controllers/publicidad.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Consultar publicidad, libre para todos
router.get("/get-publicidades", getPublicidades);

// Crear, editar y eliminar, solo admin (tipoUsuario 1 o 0)
router.post("/create-publicidad", authMiddleware, verificarRoles([0, 1]), upload.single("imagen"), createPublicidad);
router.delete("/delete-publicidad/:id", authMiddleware, verificarRoles([0, 1]), deletePublicidad);
router.put("/update-publicidad/:id", authMiddleware, verificarRoles([0, 1]), upload.single("imagen"), updatePublicidad);

export default router;
