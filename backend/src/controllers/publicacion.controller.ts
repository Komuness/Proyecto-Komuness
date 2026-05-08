// src/controllers/publicacion.controller.ts

import { Request, Response } from 'express';
import { IAdjunto, IComentario, IEnlaceExterno, IPublicacion, IUbicacion } from '../interfaces/publicacion.interface';
import { modelPublicacion } from '../models/publicacion.model';
import mongoose from 'mongoose';
import { saveMulterFileToGridFS, saveBufferToGridFS, deleteGridFSFile } from '../utils/gridfs';
import { sendEmail } from '../utils/mail'; // usa el mismo transporter que recuperación
import { modelUsuario } from '../models/usuario.model'; // ← Modelo de usuarios

const LOG_ON = process.env.LOG_PUBLICACION === '1';

// Utilidad: normaliza precio (string → number | undefined)
function parsePrecio(input: any): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const cleaned = trimmed.replace(/[₡$,]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseBoolean(input: any): boolean | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    const normalized = input.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function parseMoneda(input: any): 'CRC' | 'USD' | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string') return undefined;
  const normalized = input.trim().toUpperCase();
  if (normalized === 'CRC' || normalized === 'USD') return normalized;
  return undefined;
}

function getMonedaData(inputMoneda: any, inputMonedaSimbolo: any): { moneda: 'CRC' | 'USD'; monedaSimbolo: '₡' | '$' } {
  const moneda = parseMoneda(inputMoneda)
    ?? (inputMonedaSimbolo === '$' ? 'USD' : 'CRC');

  return {
    moneda,
    monedaSimbolo: moneda === 'USD' ? '$' : '₡',
  };
}

// función para validar teléfono
function parseTelefono(input: any): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  return trimmed || undefined;
}

// función para validar enlaces externos
function parseEnlacesExternos(input: any): IEnlaceExterno[] | undefined {
  if (!input) return undefined;
  try {
    if (typeof input === 'string') {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((enlace: any) =>
            enlace &&
            typeof enlace.nombre === 'string' &&
            typeof enlace.url === 'string' &&
            enlace.nombre.trim() !== '' &&
            enlace.url.trim() !== ''
          )
          .map((enlace: any) => ({
            ...enlace,
            url: formatearUrlEnlace(enlace.url),
          }));
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function formatearUrlEnlace(url: string): string {
  const urlLimpia = url.trim();

  // Si es un correo sin mailto:
  if (urlLimpia.includes('@') && !urlLimpia.startsWith('mailto:')) {
    return `mailto:${urlLimpia}`;
  }

  // Si es un teléfono sin tel:
  const soloNumeros = urlLimpia.replace(/[\s\-\+\(\)]/g, '');
  if (/^\d+$/.test(soloNumeros) && !urlLimpia.startsWith('tel:')) {
    return `tel:${urlLimpia}`;
  }

  return urlLimpia;
}

function mustRequirePrecio(tag?: string): boolean {
  return tag === 'evento';
}

function validateAndNormalizePricing(
  tag: string | undefined,
  precio: number | undefined,
  precioNegociable: boolean,
  precioEstudiante: number | undefined,
  precioCiudadanoOro: number | undefined,
): {
  error?: string;
  precio: number | undefined;
  precioNegociable: boolean;
  precioEstudiante: number | undefined;
  precioCiudadanoOro: number | undefined;
} {
  if (tag === 'evento') {
    if (precio === undefined) {
      return {
        error: 'El campo precio regular es obligatorio y debe ser numérico para eventos.',
        precio,
        precioNegociable: false,
        precioEstudiante,
        precioCiudadanoOro,
      };
    }

    return {
      precio,
      precioNegociable: false,
      precioEstudiante,
      precioCiudadanoOro,
    };
  }

  if (tag === 'emprendimiento') {
    if (precioNegociable) {
      return {
        precio: undefined,
        precioNegociable: true,
        precioEstudiante: undefined,
        precioCiudadanoOro: undefined,
      };
    }

    if (precio === undefined) {
      return {
        error: 'Para emprendimientos debes indicar un precio regular o marcarlo como precio negociable.',
        precio,
        precioNegociable,
        precioEstudiante,
        precioCiudadanoOro,
      };
    }
  }

  return {
    precio,
    precioNegociable,
    precioEstudiante,
    precioCiudadanoOro,
  };
}

// Normaliza hora del evento en formato HH:mm (24h). Si no cumple, se ignora.
function parseHoraEvento(input: any): string | undefined {
  if (typeof input !== 'string') return undefined;
  const t = input.trim();
  return /^\d{2}:\d{2}$/.test(t) ? t : undefined;
}

// función para validar ubicación
function parseUbicacion(input: any): IUbicacion | undefined {
  if (!input) return undefined;
  try {
    let ubicacion: any;
    
    // Si es string (JSON), parsear
    if (typeof input === 'string') {
      ubicacion = JSON.parse(input);
    } else {
      ubicacion = input;
    }
    
    // Validar que tenga los campos necesarios
    if (!ubicacion || typeof ubicacion !== 'object') return undefined;
    
    const lat = Number(ubicacion.latitude);
    const lng = Number(ubicacion.longitude);
    const dir = String(ubicacion.direccion).trim();
    
    // Validar rango de coordenadas válidas
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return undefined;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return undefined;
    if (dir.length === 0 || dir.length > 500) return undefined;
    
    return {
      latitude: lat,
      longitude: lng,
      direccion: dir,
      mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    };
  } catch {
    return undefined;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Helper: correos de admins (tipoUsuario = 1) con email válido
// ───────────────────────────────────────────────────────────────────────────────
async function getAdminEmails(): Promise<string[]> {
  const users = await modelUsuario
    .find({
      tipoUsuario: 1, // 0=super-admin, 1=admin, 2=básico, 3=premium
      email: { $exists: true, $ne: '' },
    })
    .select('email')
    .lean();

  const emails = users.map((u: any) => u.email).filter(Boolean) as string[];
  return Array.from(new Set(emails)); // dedup
}

// Crear una publicación (sin adjuntos)
export const createPublicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as IPublicacion & Record<string, any>;
	
    // 🔴 Autor siempre desde el token
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    const precio = parsePrecio(body.precio);
    const precioEstudiante = parsePrecio(body.precioEstudiante);
    const precioCiudadanoOro = parsePrecio(body.precioCiudadanoOro);
    const precioNegociable = parseBoolean(body.precioNegociable) === true;
    const tag = body.tag;
    const horaEvento = parseHoraEvento(body.horaEvento);
    const telefono = parseTelefono(body.telefono);
    const enlacesExternos = parseEnlacesExternos(body.enlacesExternos);
    const ubicacion = parseUbicacion(body.ubicacion);
    const monedaData = getMonedaData(body.moneda, body.monedaSimbolo);

      const pricing = validateAndNormalizePricing(tag, precio, precioNegociable, precioEstudiante, precioCiudadanoOro);
      if (pricing.error) {
        res.status(400).json({ message: pricing.error });
      return;
    }

    const publicacion: IPublicacion = {
      ...body,
      autor: userId, // 🔴 forzamos autor desde el token
      publicado: `${(body as any).publicado}` === 'true',
      precio: pricing.precio,
      moneda: monedaData.moneda,
      monedaSimbolo: monedaData.monedaSimbolo,
      precioNegociable: pricing.precioNegociable,
      precioEstudiante: pricing.precioEstudiante,
      precioCiudadanoOro: pricing.precioCiudadanoOro,
      horaEvento,
      telefono,
      enlacesExternos,
      ubicacion,
    } as IPublicacion;

    const nuevaPublicacion = new modelPublicacion(publicacion);

   

    const savePost = await nuevaPublicacion.save();

    // Notificación por correo a admins (aprobación)
    try {
      const asunto = 'Nueva publicación para aprobar';
      const texto =
        `Se ha creado una nueva publicación que requiere aprobación.\n` +
        `Título: ${savePost.titulo ?? '(sin título)'}\n` +
        `Fecha: ${new Date(savePost.createdAt ?? Date.now()).toISOString()}`;

      const emails = await getAdminEmails();
      if (emails.length === 0) {
        if (LOG_ON) console.warn('[Publicaciones][createPublicacion] No hay admins con email para notificar');
      } else {
        await Promise.allSettled(emails.map((e) => sendEmail(e, asunto, texto)));
        
      }
    } catch (e) {
      console.warn('[Publicaciones][createPublicacion] No se pudo enviar la notificación:', e);
    }

    res.status(201).json(savePost);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Crear publicación con adjuntos v2 (GridFS)
export const createPublicacionA = async (req: Request, res: Response): Promise<void> => {
  try {
    const publicacion = req.body as IPublicacion & Record<string, any>;

    // 🔴 Autor siempre desde el token
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
      return;
    }

    // --- Recolectar archivos desde Multer (array o fields) ---
    let files: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      files = req.files as Express.Multer.File[];
    } else if (req.files && typeof req.files === 'object') {
      const map = req.files as Record<string, Express.Multer.File[] | undefined>;
      files = [...(map['archivos'] ?? []), ...(map['imagenes'] ?? [])];
    }

    // --- Validar/establecer categoria ---
    let categoria: any = (publicacion as any).categoria;
    if (!categoria) {
      const defId = process.env.DEFAULT_CATEGORIA_ID;
      if (defId && mongoose.Types.ObjectId.isValid(defId)) {
        categoria = defId;
      } else {
        res.status(400).json({
          ok: false,
          message: 'categoria es requerida (envía "categoria" o configura DEFAULT_CATEGORIA_ID en .env)',
        });
        return;
      }
    }

    // --- Precio / otros campos ---
    const precio = parsePrecio((publicacion as any).precio);
    const precioEstudiante = parsePrecio((publicacion as any).precioEstudiante);
    const precioCiudadanoOro = parsePrecio((publicacion as any).precioCiudadanoOro);
    const precioNegociable = parseBoolean((publicacion as any).precioNegociable) === true;
    const tag = (publicacion as any).tag;
    const horaEvento = parseHoraEvento((publicacion as any).horaEvento);
    const telefono = parseTelefono((publicacion as any).telefono);
    const enlacesExternos = parseEnlacesExternos((publicacion as any).enlacesExternos);
    const ubicacion = parseUbicacion((publicacion as any).ubicacion);
    const monedaData = getMonedaData((publicacion as any).moneda, (publicacion as any).monedaSimbolo);

      const pricing = validateAndNormalizePricing(tag, precio, precioNegociable, precioEstudiante, precioCiudadanoOro);
      if (pricing.error) {
        res.status(400).json({ ok: false, message: pricing.error });
      return;
    }

    // --- Subir adjuntos (0..N) ---
    const adjuntos: IAdjunto[] = [];
    for (const file of files) {
      const result = await saveMulterFileToGridFS(file, 'publicaciones');
      adjuntos.push({
        url: `${process.env.PUBLIC_BASE_URL || 'http://159.54.148.238'}/api/files/${result.id.toString()}`,
        key: result.id.toString(),
      });
    }

    // --- Crear documento y guardar ---
    const nuevaPublicacion = new modelPublicacion({
      ...publicacion,
      autor: userId, // 🔴 forzamos autor desde el token
      categoria,
      adjunto: adjuntos,
      publicado: `${(publicacion as any).publicado}` === 'true',
      precio: pricing.precio,
      moneda: monedaData.moneda,
      monedaSimbolo: monedaData.monedaSimbolo,
      precioNegociable: pricing.precioNegociable,
      precioEstudiante: pricing.precioEstudiante,
      precioCiudadanoOro: pricing.precioCiudadanoOro,
      horaEvento,
      telefono,
      enlacesExternos,
      ubicacion,
    });



    const savePost = await nuevaPublicacion.save();

    // Notificación por correo a admins (aprobación)
    try {
      const asunto = 'Nueva publicación para aprobar';
      const texto =
        `Se ha creado una nueva publicación que requiere aprobación.\n` +
        `Título: ${savePost.titulo ?? '(sin título)'}\n` +
        `Fecha: ${new Date(savePost.createdAt ?? Date.now()).toISOString()}`;

      const emails = await getAdminEmails();
      if (emails.length === 0) {
        if (LOG_ON) console.warn('[Publicaciones][createPublicacionA] No hay admins con email para notificar');
      } else {
        await Promise.allSettled(emails.map((e) => sendEmail(e, asunto, texto)));
       
      }
    } catch (e) {
      console.warn('[Publicaciones][createPublicacionA] No se pudo enviar la notificación:', e);
    }

    res.status(201).json(savePost);
  } catch (error) {
    console.error('createPublicacionA error:', error);
    const err = error as Error;
    res.status(500).json({ ok: false, message: err.message });
  }
};

// obtener publicaciones por tag
export const getPublicacionesByTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const { tag, publicado, categoria } = req.query as { tag?: string; publicado?: string; categoria?: string };

    const query: any = {};
    if (tag) query.tag = tag;
    if (publicado !== undefined) query.publicado = publicado === 'true';
    if (categoria) query.categoria = categoria;

    const [publicaciones, totalPublicaciones] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate('autor', 'nombre')
        .populate('categoria', 'nombre estado')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset,
        limit,
        total: totalPublicaciones,
        pages: Math.ceil(totalPublicaciones / Math.max(limit, 1)),
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener una publicación por su ID
export const getPublicacionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const publicacion: IPublicacion | null = await modelPublicacion
      .findById(id)
      .populate('autor', 'nombre')
      .populate('categoria', 'nombre estado');

    if (!publicacion) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }
    res.status(200).json(publicacion);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener publicaciones por categoría
export const getPublicacionesByCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoriaId } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    const query = { categoria: categoriaId, publicado: true };

    const [publicaciones, total] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate('autor', 'nombre')
        .populate('categoria', 'nombre estado')
        .skip(offset)
        .limit(limit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Actualizar una publicación
export const updatePublicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedData: Partial<IPublicacion> & Record<string, any> = { ...req.body };

    const publicacion = await modelPublicacion.findById(id);
    if (!publicacion) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }

    if (updatedData.hasOwnProperty('precio')) {
      const parsed = parsePrecio(updatedData.precio);
      updatedData.precio = parsed;
    }

    if (updatedData.hasOwnProperty('precioEstudiante')) {
      updatedData.precioEstudiante = parsePrecio(updatedData.precioEstudiante);
    }

    if (updatedData.hasOwnProperty('precioCiudadanoOro')) {
      updatedData.precioCiudadanoOro = parsePrecio(updatedData.precioCiudadanoOro);
    }

    if (updatedData.hasOwnProperty('precioNegociable')) {
      updatedData.precioNegociable = parseBoolean(updatedData.precioNegociable) === true;
    }

    if (updatedData.hasOwnProperty('moneda') || updatedData.hasOwnProperty('monedaSimbolo')) {
      const monedaData = getMonedaData(updatedData.moneda, updatedData.monedaSimbolo);
      updatedData.moneda = monedaData.moneda;
      updatedData.monedaSimbolo = monedaData.monedaSimbolo;
    }

    // Si viene horaEvento, normalizar a HH:mm (si no es válida, no pisa)
    if (updatedData.hasOwnProperty('horaEvento')) {
      const parsedHora = parseHoraEvento(updatedData.horaEvento);
      
      if (parsedHora !== undefined) updatedData.horaEvento = parsedHora;
      else delete updatedData.horaEvento;
    }

    const nextTag = (updatedData.tag as string | undefined) ?? publicacion.tag;
    const nextPrecio = updatedData.hasOwnProperty('precio') ? updatedData.precio : publicacion.precio;
    const nextPrecioEstudiante = updatedData.hasOwnProperty('precioEstudiante')
      ? updatedData.precioEstudiante
      : publicacion.precioEstudiante;
    const nextPrecioCiudadanoOro = updatedData.hasOwnProperty('precioCiudadanoOro')
      ? updatedData.precioCiudadanoOro
      : publicacion.precioCiudadanoOro;
    const nextPrecioNegociable = updatedData.hasOwnProperty('precioNegociable')
      ? updatedData.precioNegociable === true
      : publicacion.precioNegociable === true;

    const pricing = validateAndNormalizePricing(
      nextTag,
      nextPrecio,
      nextPrecioNegociable,
      nextPrecioEstudiante,
      nextPrecioCiudadanoOro,
    );
    if (pricing.error) {
      res.status(400).json({ message: pricing.error });
      return;
    }

    updatedData.precio = pricing.precio;
    updatedData.precioNegociable = pricing.precioNegociable;
    updatedData.precioEstudiante = pricing.precioEstudiante;
    updatedData.precioCiudadanoOro = pricing.precioCiudadanoOro;

    Object.assign(publicacion, updatedData);
    await publicacion.save();
    res.status(200).json(publicacion);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Eliminar una publicación (y sus adjuntos en GridFS)
export const deletePublicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedPost = await modelPublicacion.findByIdAndDelete(id);

    if (!deletedPost) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }

    const adjuntos = (deletedPost as any).adjunto as IAdjunto[] | undefined;
    if (adjuntos?.length) {
      for (const a of adjuntos) {
        if (a.key) {
          try {
            await deleteGridFSFile(a.key);
          } catch {}
        }
      }
    }

    res.status(200).json({ message: 'Publicación eliminada correctamente' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Agregar comentario
export const addComentario = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  //const { autor, contenido, fecha } = req.body;
  //const { id } = req.params;
  const { contenido } = req.body;
  
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const nuevoComentario = {
    autor: {
      _id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      avatar: user.avatar
    },
    contenido,
    fecha: new Date().toISOString()
  };

  //const nuevoComentario: IComentario = { autor, contenido, fecha };

  try {
    const publicacionActualizada = await modelPublicacion.findByIdAndUpdate(
      id,
      { $push: { comentarios: nuevoComentario } },
      { new: true }
    );

    if (!publicacionActualizada) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }
    res.status(201).json(publicacionActualizada.comentarios);
  } catch (error) {
    console.warn('Error al agregar comentario:', error);
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};
// Agregar Respuesta
export const addRespuesta = async (req: Request, res: Response): Promise<void> => {
  const { id, comentarioId } = req.params;
  const { contenido, replyTo } = req.body;
  
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const nuevaRespuesta = {
    autor: {
      _id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      avatar: user.avatar
    },
    contenido,
    fecha: new Date().toISOString(),
    replyTo
  };

  try {
    const publicacionActualizada = await modelPublicacion.findOneAndUpdate(
      {
        _id: id,
          "comentarios._id": new mongoose.Types.ObjectId(comentarioId)
      },
      {
        $push: {
          "comentarios.$.respuestas": nuevaRespuesta
        }
      },
      { new: true }
    );

    if (!publicacionActualizada) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }
    res.status(201).json(publicacionActualizada.comentarios);
  } catch (error) {
    console.warn('Error al agregar respuesta:', error);
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// filtros de búsqueda
export const filterPublicaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { texto, tag, autor } = req.query;
    const filtro: any = {};

    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto as string, $options: 'i' } },
        { contenido: { $regex: texto as string, $options: 'i' } },
      ];
    }
    if (tag) filtro.tag = { $regex: tag as string, $options: 'i' };
    if (autor) {
      if (!mongoose.Types.ObjectId.isValid(autor as string)) {
        res.status(400).json({ message: 'ID de autor inválido' });
        return;
      }
      filtro.autor = autor as string;
    }

    if (Object.keys(filtro).length === 0) {
      res.status(400).json({ message: 'Debe proporcionar al menos un parámetro de búsqueda (titulo, tag o autor)' });
      return;
    }

    const publicaciones: IPublicacion[] = await modelPublicacion.find(filtro);

    if (publicaciones.length === 0) {
      res.status(404).json({ message: 'No se encontraron publicaciones con esos criterios' });
      return;
    }

    res.status(200).json(publicaciones);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener eventos por rango de fechas
export const getEventosPorFecha = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Se requieren startDate y endDate' });
      return;
    }

    const eventos = await modelPublicacion
      .find({
        tag: 'evento',
        publicado: true,
        fechaEvento: {
          $gte: startDate as string,
          $lte: endDate as string,
        },
      })
      .populate('autor', 'nombre')
      .populate('categoria', 'nombre')
      .select('titulo fechaEvento horaEvento contenido adjunto _id precio moneda monedaSimbolo')
      .sort({ fechaEvento: 1 });

    res.status(200).json(eventos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Búsqueda rápida por título (para sugerencias)
export const searchPublicacionesByTitulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ message: 'El parámetro de búsqueda (q) es requerido' });
      return;
    }

    const searchTerm = q.trim();
    const searchLimit = Math.min(Number(limit), 50); // Máximo 50 resultados

    const publicaciones = await modelPublicacion
      .find({
        publicado: true,
        titulo: { $regex: searchTerm, $options: 'i' }
      })
      .populate('autor', 'nombre')
      .populate('categoria', 'nombre estado')
      .select('titulo tag autor categoria fecha fechaEvento precio moneda monedaSimbolo adjunto')
      .limit(searchLimit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: publicaciones,
      searchTerm,
      total: publicaciones.length
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en búsqueda rápida:', err);
    res.status(500).json({ message: 'Error al realizar la búsqueda' });
  }
};

// Búsqueda avanzada con filtros
export const searchPublicacionesAvanzada = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      q, 
      tag, 
      categoria, 
      offset = 0, 
      limit = 12 
    } = req.query;

    const query: any = { publicado: true };

    // Búsqueda por texto en título o contenido
    if (q && typeof q === 'string' && q.trim() !== '') {
      query.$or = [
        { titulo: { $regex: q.trim(), $options: 'i' } },
        { contenido: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    // Filtros adicionales
    if (tag) query.tag = tag;
    if (categoria) query.categoria = categoria;

    const [publicaciones, totalPublicaciones] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate('autor', 'nombre')
        .populate('categoria', 'nombre estado')
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit)),
      modelPublicacion.countDocuments(query)
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset: Number(offset),
        limit: Number(limit),
        total: totalPublicaciones,
        pages: Math.ceil(totalPublicaciones / Math.max(Number(limit), 1)),
      },
      searchTerm: q
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en búsqueda avanzada:', err);
    res.status(500).json({ message: 'Error al realizar la búsqueda' });
  }
};

// Búsqueda específica por título
export const searchByTitulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, offset = 0, limit = 12 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ message: 'El parámetro de búsqueda (q) es requerido' });
      return;
    }

    const searchTerm = q.trim();
    const queryOffset = Number(offset);
    const queryLimit = Math.min(Number(limit), 50);

    const query = {
      publicado: true,
      titulo: { $regex: searchTerm, $options: 'i' }
    };

    const [publicaciones, total] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate('autor', 'nombre')
        .populate('categoria', 'nombre estado')
        .sort({ createdAt: -1 })
        .skip(queryOffset)
        .limit(queryLimit),
      modelPublicacion.countDocuments(query)
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset: queryOffset,
        limit: queryLimit,
        total,
        pages: Math.ceil(total / Math.max(queryLimit, 1)),
      },
      searchTerm
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en búsqueda por título:', err);
    res.status(500).json({ message: 'Error al realizar la búsqueda' });
  }
};
