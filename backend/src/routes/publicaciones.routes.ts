
import multer from 'multer';
import { Router } from 'express';
import {
  createPublicacion,
  getPublicacionById,
  updatePublicacion,
  deletePublicacion,
  addComentario,
  addRespuesta,
  getPublicacionesByTag,
  filterPublicaciones,
  createPublicacionA,
  getPublicacionesByCategoria,
  getEventosPorFecha,
  searchPublicacionesByTitulo,
  searchPublicacionesAvanzada,
  searchByTitulo,
} from '../controllers/publicacion.controller';

import {
  requestUpdatePublicacion,
  getPendingUpdates,
  approveUpdate,
  rejectUpdate,
  cancelUpdateRequest
} from '../controllers/publicacion-update.controller';

import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarRoles } from '../middlewares/roles.middleware';
import { validarLimitePublicaciones } from '../middlewares/limitePublicaciones.middleware';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// acepta 'archivos' o 'imagenes' (0..N)
const multiFields = upload.fields([
  { name: 'archivos', maxCount: 10 },
  { name: 'imagenes', maxCount: 10 },
]);

const router = Router();

// ========== RUTAS PÚBLICAS ==========
router.get('/', getPublicacionesByTag);
router.get('/buscar', filterPublicaciones);
router.get('/:id', getPublicacionById);
router.get('/categoria/:categoriaId', getPublicacionesByCategoria);
router.get('/eventos/calendario', getEventosPorFecha);

// ========== RUTAS DE USUARIO AUTENTICADO ==========
router.post('/', authMiddleware, validarLimitePublicaciones, createPublicacion);

// Handler robusto para capturar errores de Multer
router.post('/v2', authMiddleware, validarLimitePublicaciones, (req, res, next) => {
  multiFields(req, res, (err: any) => {
    if (err) {
      const msg = err?.message || 'Error al subir archivos';
      const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ ok: false, message: msg });
    }
    createPublicacionA(req, res).catch(next);
  });
});

router.post('/:id/comentarios', authMiddleware, verificarRoles([0, 1, 2, 3]), addComentario);



router.post('/:id/comentarios/:comentarioId/respuesta', authMiddleware, verificarRoles([0, 1, 2, 3]), addRespuesta);




// ========== RUTAS DE EDICIÓN PARA AUTORES ==========
// Ruta  para solicitar actualización
router.put('/:id/request-update', authMiddleware, multiFields, requestUpdatePublicacion);
router.delete('/:id/cancel-update', authMiddleware, cancelUpdateRequest);
router.put('/:id/request-update', authMiddleware, multiFields, requestUpdatePublicacion);
// ========== RUTAS DE ADMINISTRACIÓN ==========
// NOTA: Estas rutas deben definirse ANTES de las rutas con parámetros genéricos como '/:id'
router.get('/admin/pending-updates', authMiddleware, verificarRoles([0, 1]), getPendingUpdates);
router.put('/admin/:id/approve-update', authMiddleware, verificarRoles([0, 1]), approveUpdate);
router.put('/admin/:id/reject-update', authMiddleware, verificarRoles([0, 1]), rejectUpdate);

// ========== RUTAS DE ADMINISTRACIÓN GENERAL ==========
router.put('/:id', authMiddleware, verificarRoles([0, 1]), updatePublicacion);
router.delete('/:id', authMiddleware, verificarRoles([0, 1]), deletePublicacion);
export default router;

// ========== RUTAS DE BÚSQUEDA ==========
router.get('/search/quick', searchPublicacionesByTitulo); // Búsqueda rápida
router.get('/search/advanced', searchPublicacionesAvanzada); // Búsqueda con filtros
router.get('/search/titulo', searchByTitulo);
