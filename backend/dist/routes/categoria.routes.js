"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoria_controller_1 = require("../controllers/categoria.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const router = (0, express_1.Router)();
// Consultar categorías → libre para todos
router.get("/", categoria_controller_1.getCategorias);
router.get("/:id", categoria_controller_1.getCategoriaById);
// Crear, actualizar y eliminar → solo admin (tipoUsuario = 1)
router.post("/", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([1]), categoria_controller_1.createCategoria);
router.put("/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([1]), categoria_controller_1.updateCategoria);
router.delete("/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([1]), categoria_controller_1.deleteCategoria);
router.put('/toggle/:id', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([1]), categoria_controller_1.toggleCategoriaEstado);
exports.default = router;
