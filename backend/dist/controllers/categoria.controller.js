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
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCategoriaEstado = exports.deleteCategoria = exports.updateCategoria = exports.getCategoriaById = exports.getCategorias = exports.createCategoria = void 0;
const categoria_model_1 = require("../models/categoria.model");
/**
 * Crear categoría
 */
const createCategoria = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            res.status(400).json({ message: "El nombre es obligatorio" });
            return;
        }
        const existe = yield categoria_model_1.modelCategoria.findOne({
            nombre: nombre.trim().toLowerCase()
        });
        if (existe) {
            if (!existe.estado) {
                existe.estado = true;
                yield existe.save();
                res.status(200).json({
                    message: "Categoría reactivada correctamente",
                    data: existe
                });
                return;
            }
            res.status(400).json({
                message: "Ya existe una categoría con ese nombre"
            });
            return;
        }
        const nuevaCategoria = new categoria_model_1.modelCategoria({
            nombre: nombre.trim().toLowerCase(),
            estado: true
        });
        const saved = yield nuevaCategoria.save();
        res.status(201).json(saved);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear la categoría" });
    }
});
exports.createCategoria = createCategoria;
/**
 * Listar categorías (con paginación)
 */
const getCategorias = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [categorias, total] = yield Promise.all([
            categoria_model_1.modelCategoria.find().skip(skip).limit(Number(limit)),
            categoria_model_1.modelCategoria.countDocuments()
        ]);
        res.json({
            total,
            page: Number(page),
            limit: Number(limit),
            data: categorias
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener las categorías" });
    }
});
exports.getCategorias = getCategorias;
/**
 * Obtener categoría por ID
 */
const getCategoriaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const categoria = yield categoria_model_1.modelCategoria.findById(id);
        if (!categoria || !categoria.estado) {
            res.status(404).json({ message: "Categoría no encontrada" });
            return;
        }
        res.json(categoria);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener la categoría" });
    }
});
exports.getCategoriaById = getCategoriaById;
/**
 * Actualizar categoría
 */
const updateCategoria = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const categoria = yield categoria_model_1.modelCategoria.findById(id);
        if (!categoria || !categoria.estado) {
            res.status(404).json({ message: "Categoría no encontrada" });
            return;
        }
        if (nombre) {
            const existe = yield categoria_model_1.modelCategoria.findOne({
                nombre: nombre.trim().toLowerCase(),
                _id: { $ne: id }
            });
            if (existe) {
                res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
                return;
            }
            categoria.nombre = nombre.trim().toLowerCase();
        }
        const updated = yield categoria.save();
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar la categoría" });
    }
});
exports.updateCategoria = updateCategoria;
/**
 * Eliminar categoría (soft delete → estado: false)
 */
const deleteCategoria = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const categoria = yield categoria_model_1.modelCategoria.findById(id);
        if (!categoria || !categoria.estado) {
            res.status(404).json({ message: "Categoría no encontrada" });
            return;
        }
        categoria.estado = false;
        yield categoria.save();
        res.json({ message: "Categoría desactivada correctamente" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al eliminar la categoría" });
    }
});
exports.deleteCategoria = deleteCategoria;
const toggleCategoriaEstado = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const categoria = yield categoria_model_1.modelCategoria.findById(id);
        if (!categoria) {
            res.status(404).json({
                message: "Categoría no encontrada"
            });
            return;
        }
        categoria.estado = !categoria.estado;
        yield categoria.save();
        res.json({
            message: categoria.estado
                ? "Categoría activada"
                : "Categoría desactivada",
            data: categoria
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al cambiar estado"
        });
    }
});
exports.toggleCategoriaEstado = toggleCategoriaEstado;
