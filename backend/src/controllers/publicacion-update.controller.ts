import { Request, Response } from 'express';
import { IPublicacion, IPublicacionUpdate, IEditHistory, IEnlaceExterno, IAdjunto, IUbicacion } from '../interfaces/publicacion.interface';
import { modelPublicacion } from '../models/publicacion.model';
import mongoose from 'mongoose';
import { saveMulterFileToGridFS } from '../utils/gridfs';
import { calculatePublicationExpirationDate } from '../utils/publicacionExpiration';

const LOG_ON = process.env.LOG_PUBLICACION === '1';

// Solicitar edición de publicación 
export const requestUpdatePublicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 🔴 Autor SIEMPRE como string
    const userId =
      (req as any).user?._id?.toString?.() ||
      (req as any).userId?.toString?.();

    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    // Buscar la publicación actual
    const publicacion = await modelPublicacion.findById(id);
    if (!publicacion) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }

   
    // 🔴 Verificar si el usuario es el autor (string vs string)
    if (publicacion.autor?.toString?.() !== userId) {
      res.status(403).json({ message: 'Solo el autor puede editar esta publicación' });
      return;
    }

    // Verificar límite de ediciones
    const editCount = publicacion.editCount || 0;
    const maxEdits = publicacion.maxEdits || 3;
    
    if (editCount >= maxEdits) {
      res.status(400).json({ 
        message: `Has alcanzado el límite máximo de ${maxEdits} ediciones para esta publicación` 
      });
      return;
    }

    // Verificar si ya hay una edición pendiente
    if (publicacion.pendingUpdate) {
      res.status(400).json({ 
        message: 'Ya existe una solicitud de edición pendiente de aprobación' 
      });
      return;
    }


    // Procesar FormData 
    const updateData: any = {};
    
    // Campos de texto básicos
    if (req.body.titulo !== undefined) updateData.titulo = req.body.titulo;
    if (req.body.contenido !== undefined) updateData.contenido = req.body.contenido;
    if (req.body.fechaEvento !== undefined) updateData.fechaEvento = req.body.fechaEvento;
    if (req.body.horaEvento !== undefined) updateData.horaEvento = req.body.horaEvento;
    if (req.body.telefono !== undefined) updateData.telefono = req.body.telefono;
    if (req.body.categoria !== undefined) updateData.categoria = req.body.categoria;

    // Procesar precios con validación
    if (req.body.precio !== undefined) {
      const precio = parsePrecio(req.body.precio);
      if (precio !== undefined) updateData.precio = precio;
    }

    if (req.body.precioNegociable !== undefined) {
      updateData.precioNegociable = parseBoolean(req.body.precioNegociable) === true;
    }

    if (req.body.moneda !== undefined || req.body.monedaSimbolo !== undefined) {
      const monedaData = getMonedaData(req.body.moneda, req.body.monedaSimbolo);
      updateData.moneda = monedaData.moneda;
      updateData.monedaSimbolo = monedaData.monedaSimbolo;
    }

    if (req.body.precioEstudiante !== undefined) {
      const precioEstudiante = parsePrecio(req.body.precioEstudiante);
      if (precioEstudiante !== undefined) updateData.precioEstudiante = precioEstudiante;
    }
    if (req.body.precioCiudadanoOro !== undefined) {
      const precioCiudadanoOro = parsePrecio(req.body.precioCiudadanoOro);
      if (precioCiudadanoOro !== undefined) updateData.precioCiudadanoOro = precioCiudadanoOro;
    }

    // Procesar ubicación
    if (req.body.ubicacion !== undefined) {
      const ubicacion = parseUbicacion(req.body.ubicacion);
      if (ubicacion !== undefined) {
        updateData.ubicacion = ubicacion;
      }
    }
    if (publicacion.tag === 'emprendimiento' && updateData.precioNegociable === true) {
      updateData.precio = undefined;
      updateData.precioEstudiante = undefined;
      updateData.precioCiudadanoOro = undefined;
    }

    // Procesar enlaces externos
    if (req.body.enlacesExternos) {
      try {
        console.log('🔗 Enlaces externos recibidos');
        
        let enlacesParseados;
        // Si ya es un array, usarlo directamente
        if (Array.isArray(req.body.enlacesExternos)) {
          enlacesParseados = req.body.enlacesExternos;
        } else {
          // Si es string, parsear JSON
          enlacesParseados = JSON.parse(req.body.enlacesExternos);
        }
        
        if (Array.isArray(enlacesParseados)) {
          updateData.enlacesExternos = enlacesParseados.filter((enlace: any) => 
            enlace && 
            typeof enlace.nombre === 'string' && 
            typeof enlace.url === 'string' &&
            enlace.nombre.trim() !== '' &&
            enlace.url.trim() !== ''
          ).map((enlace: any) => ({
            nombre: enlace.nombre.trim(),
            url: formatearUrlEnlace(enlace.url.trim())
          }));
          
        }
      } catch (error) {
        // En caso de error, mantener los enlaces existentes o dejar vacío
        updateData.enlacesExternos = [];
      }
    } else {
      // Si no se envían enlaces, mantener los existentes
      updateData.enlacesExternos = publicacion.enlacesExternos || [];
    }

    // CORRECCIÓN CRÍTICA: Procesar imágenes mantenidas
    let adjuntos: IAdjunto[] = [];

    // 1. Procesar imágenes mantenidas
    if (req.body.imagenesMantenidas) {
      try {
        
        let imagenesParseadas;
        if (Array.isArray(req.body.imagenesMantenidas)) {
          imagenesParseadas = req.body.imagenesMantenidas;
        } else {
          imagenesParseadas = JSON.parse(req.body.imagenesMantenidas);
        }
        
        if (Array.isArray(imagenesParseadas)) {
          adjuntos = imagenesParseadas.filter((img: any) => 
            img && typeof img.url === 'string' && typeof img.key === 'string'
          );
        }
      } catch (error) {
      }
    }

    // 2. Procesar nuevas imágenes (archivos)
    if (req.files && (req.files as any).archivos) {
      const files = (req.files as any).archivos as Express.Multer.File[];
      
      for (const file of files) {
        try {
          const result = await saveMulterFileToGridFS(file, 'publicaciones');
          const nuevaImagen: IAdjunto = {
            url: `${process.env.PUBLIC_BASE_URL || 'http://159.54.148.238'}/api/files/${result.id.toString()}`,
            key: result.id.toString(),
          };
          adjuntos.push(nuevaImagen);
        } catch (error) {
        }
      }
    }

    updateData.adjunto = adjuntos;

    // Validar que al menos un campo haya cambiado
    const camposCambiados = Object.keys(updateData).filter(key => {
      if (key === 'adjunto') {
        return JSON.stringify(updateData.adjunto) !== JSON.stringify(publicacion.adjunto);
      }
      if (key === 'enlacesExternos') {
        return JSON.stringify(updateData.enlacesExternos) !== JSON.stringify(publicacion.enlacesExternos);
      }
      return updateData[key] !== (publicacion as any)[key];
    });

    if (camposCambiados.length === 0) {
      res.status(400).json({ 
        message: 'No se detectaron cambios en la publicación' 
      });
      return;
    }

  

    // Preparar datos de actualización
    const pendingUpdate: IPublicacionUpdate = {
      ...updateData,
      requestedAt: new Date().toISOString(),
      requestedBy: userId
    };

    // Actualizar publicación con solicitud pendiente
    const updatedPublicacion = await modelPublicacion.findByIdAndUpdate(
      id,
      { 
        pendingUpdate,
        lastEditRequest: new Date().toISOString()
      },
      { new: true }
    ).populate('autor', 'nombre').populate('categoria', 'nombre estado');

    console.log('✅ Solicitud de edición guardada en pendingUpdate');

    res.status(200).json({
      message: 'Solicitud de edición enviada para revisión',
      publicacion: updatedPublicacion,
      camposCambiados
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en requestUpdatePublicacion:', err);
    res.status(500).json({ message: err.message });
  }
};

function formatearUrlEnlace(url: string): string {
  const urlLimpia = url.trim();
  
  // Si es un correo sin mailto:
  if (urlLimpia.includes('@') && !urlLimpia.startsWith('mailto:')) {
    return `mailto:${urlLimpia}`;
  }
  
  // Si es un teléfono sin tel: (solo números, espacios, +, -, (, ))
  const soloNumeros = urlLimpia.replace(/[\s\-\+\(\)]/g, '');
  if (/^\d+$/.test(soloNumeros) && !urlLimpia.startsWith('tel:')) {
    return `tel:${urlLimpia}`;
  }
  
  return urlLimpia;
}

// Obtener publicaciones con actualizaciones pendientes (para admin)
export const getPendingUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    const query = { 
      pendingUpdate: { $exists: true, $ne: null } 
    };

    const [publicaciones, total] = await Promise.all([
      modelPublicacion.find(query)
        .populate('autor', 'nombre email')
        .populate('categoria', 'nombre estado')
        .sort({ lastEditRequest: -1 })
        .skip(offset)
        .limit(limit),
      modelPublicacion.countDocuments(query)
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset,
        limit,
        total,
        pages: Math.ceil(total / Math.max(limit, 1)),
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Función auxiliar para mapear campos de actualización de manera type-safe
function mapUpdateFields(updateFields: Omit<IPublicacionUpdate, 'requestedAt' | 'requestedBy'>): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  if (updateFields.titulo !== undefined) mapped.titulo = updateFields.titulo;
  if (updateFields.contenido !== undefined) mapped.contenido = updateFields.contenido;
  if (updateFields.fechaEvento !== undefined) mapped.fechaEvento = updateFields.fechaEvento;
  if (updateFields.horaEvento !== undefined) mapped.horaEvento = updateFields.horaEvento;
  if (updateFields.precio !== undefined) mapped.precio = updateFields.precio;
  if (updateFields.moneda !== undefined) mapped.moneda = updateFields.moneda;
  if (updateFields.monedaSimbolo !== undefined) mapped.monedaSimbolo = updateFields.monedaSimbolo;
  if (updateFields.precioNegociable !== undefined) mapped.precioNegociable = updateFields.precioNegociable;
  if (updateFields.precioEstudiante !== undefined) mapped.precioEstudiante = updateFields.precioEstudiante;
  if (updateFields.precioCiudadanoOro !== undefined) mapped.precioCiudadanoOro = updateFields.precioCiudadanoOro;
  if (updateFields.telefono !== undefined) mapped.telefono = updateFields.telefono;
  if (updateFields.categoria !== undefined) mapped.categoria = updateFields.categoria;
  if (updateFields.enlacesExternos !== undefined) mapped.enlacesExternos = updateFields.enlacesExternos;
  if (updateFields.adjunto !== undefined) mapped.adjunto = updateFields.adjunto;
  
  return mapped;
}

// Versión simplificada usando la función auxiliar
// CORREGIDO: Función approveUpdate con mejor logging y diagnóstico
export const approveUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?._id;

    // Validaciones...
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID de publicación inválido' });
      return;
    }

    const publicacion = await modelPublicacion.findById(id);
    if (!publicacion) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }

    if (!publicacion.pendingUpdate) {
      res.status(404).json({ message: 'No hay solicitud de edición pendiente' });
      return;
    }

    // CORRECCIÓN CRÍTICA: Obtener los datos reales del pendingUpdate
    const pendingUpdateString = JSON.stringify(publicacion.pendingUpdate);
    const pendingUpdateObj = JSON.parse(pendingUpdateString);

    // Desestructurar del objeto plano
    const { requestedAt, requestedBy, ...updateFields } = pendingUpdateObj;

    const camposActualizados: string[] = [];

    if (updateFields.titulo !== undefined && updateFields.titulo !== publicacion.titulo) {
      publicacion.titulo = updateFields.titulo;
      camposActualizados.push('título');
    }

    if (updateFields.contenido !== undefined && updateFields.contenido !== publicacion.contenido) {
      publicacion.contenido = updateFields.contenido;
      camposActualizados.push('contenido');
    }

    if (updateFields.fechaEvento !== undefined && updateFields.fechaEvento !== publicacion.fechaEvento) {
      publicacion.fechaEvento = updateFields.fechaEvento;
      camposActualizados.push('fechaEvento');
    }

    if (updateFields.horaEvento !== undefined && updateFields.horaEvento !== publicacion.horaEvento) {
      publicacion.horaEvento = updateFields.horaEvento;
      camposActualizados.push('horaEvento');
    }

    if (updateFields.precio !== undefined && updateFields.precio !== publicacion.precio) {
      publicacion.precio = updateFields.precio;
      camposActualizados.push('precio');
    }

    if (updateFields.precioNegociable !== undefined && updateFields.precioNegociable !== publicacion.precioNegociable) {
      publicacion.precioNegociable = updateFields.precioNegociable;
      camposActualizados.push('precioNegociable');
    }

    if (updateFields.moneda !== undefined && updateFields.moneda !== publicacion.moneda) {
      publicacion.moneda = updateFields.moneda;
      publicacion.monedaSimbolo = updateFields.moneda === 'USD' ? '$' : '₡';
      camposActualizados.push('moneda');
    }

    if (publicacion.tag === 'emprendimiento' && updateFields.precioNegociable === true) {
      if (publicacion.precio !== undefined) {
        publicacion.precio = undefined;
        camposActualizados.push('precio');
      }
      if (publicacion.precioEstudiante !== undefined) {
        publicacion.precioEstudiante = undefined;
        camposActualizados.push('precioEstudiante');
      }
      if (publicacion.precioCiudadanoOro !== undefined) {
        publicacion.precioCiudadanoOro = undefined;
        camposActualizados.push('precioCiudadanoOro');
      }
    }

    if (updateFields.precioEstudiante !== undefined && updateFields.precioEstudiante !== publicacion.precioEstudiante) {
      publicacion.precioEstudiante = updateFields.precioEstudiante;
      camposActualizados.push('precioEstudiante');
    }

    if (updateFields.precioCiudadanoOro !== undefined && updateFields.precioCiudadanoOro !== publicacion.precioCiudadanoOro) {
      publicacion.precioCiudadanoOro = updateFields.precioCiudadanoOro;
      camposActualizados.push('precioCiudadanoOro');
    }

    if (updateFields.telefono !== undefined && updateFields.telefono !== publicacion.telefono) {
      publicacion.telefono = updateFields.telefono;
      camposActualizados.push('teléfono');
    }

    if (updateFields.categoria !== undefined) {
      publicacion.categoria = updateFields.categoria as any;
      camposActualizados.push('categoría');
    }

    //  Manejo de enlacesExternos
    if (updateFields.enlacesExternos !== undefined) {
      
      if (Array.isArray(updateFields.enlacesExternos)) {
        publicacion.enlacesExternos = updateFields.enlacesExternos.filter((enlace: IEnlaceExterno) => 
          enlace && typeof enlace.nombre === 'string' && typeof enlace.url === 'string'
        );
        camposActualizados.push('enlaces externos');
      } else {
        publicacion.enlacesExternos = [];
      }
    }

    if (updateFields.adjunto !== undefined && JSON.stringify(updateFields.adjunto) !== JSON.stringify(publicacion.adjunto)) {
      publicacion.adjunto = updateFields.adjunto;
      camposActualizados.push('adjuntos');
    }

    // Incrementar contador de ediciones
    const currentEditCount = publicacion.editCount || 0;
    const newEditCount = currentEditCount + 1;
    publicacion.editCount = newEditCount;
    publicacion.fechaExpiracion = calculatePublicationExpirationDate(publicacion) ?? null;

    // Preparar historial
    const editHistory = publicacion.editHistory || [];
    const newHistoryEntry: IEditHistory = {
      version: editHistory.length + 1,
      data: { ...updateFields },
      editedAt: publicacion.lastEditRequest || new Date().toISOString(),
      editedBy: requestedBy,
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
      status: 'approved'
    };
    publicacion.editHistory = [...editHistory, newHistoryEntry];

    // Limpiar campos de control
    publicacion.pendingUpdate = undefined as any;
    publicacion.lastEditRequest = undefined as any;

    if (camposActualizados.length === 0) {
      console.log('⚠️ ADVERTENCIA: No se detectaron campos para actualizar');
    }

    // Guardar el documento
    console.log('💾 Intentando guardar la publicación...');
    const updatedPublicacion = await publicacion.save();
    console.log('✅ Publicación guardada exitosamente');

    // Recargar con populate
    const populatedPublicacion = await modelPublicacion.findById(updatedPublicacion._id)
      .populate('autor', 'nombre email')
      .populate('categoria', 'nombre estado');

    res.status(200).json({
      message: `Actualización aprobada exitosamente. Campos actualizados: ${camposActualizados.join(', ')}`,
      publicacion: populatedPublicacion,
      camposActualizados
    });

  } catch (error) {
    console.error(' === ERROR EN approveUpdate ===');
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      
      if (error.name === 'ValidationError') {
        const validationError = error as any;
        console.error('Errores de validación:', validationError.errors);
        res.status(400).json({ 
          message: 'Error de validación en los datos',
          detalles: validationError.errors
        });
        return;
      }
    } else {
      console.error('Error desconocido:', error);
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Error desconocido') : 'Contacte al administrador'
    });
  }
};

// Rechazar actualización (admin)
export const rejectUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).user?._id;

    const publicacion = await modelPublicacion.findById(id);
    if (!publicacion || !publicacion.pendingUpdate) {
      res.status(404).json({ message: 'Publicación o solicitud de edición no encontrada' });
      return;
    }

    // Agregar al historial como rechazado
    const editHistory = publicacion.editHistory || [];
    const newHistoryEntry: IEditHistory = {
      version: editHistory.length + 1,
      data: publicacion.pendingUpdate,
      editedAt: publicacion.lastEditRequest!,
      editedBy: publicacion.pendingUpdate.requestedBy,
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
      status: 'rejected'
    };

    // Limpiar solicitud pendiente
    const updatedPublicacion = await modelPublicacion.findByIdAndUpdate(
      id,
      { 
        pendingUpdate: null,
        editHistory: [...editHistory, newHistoryEntry]
      },
      { new: true }
    ).populate('autor', 'nombre').populate('categoria', 'nombre estado');

    res.status(200).json({
      message: `Actualización rechazada${reason ? `: ${reason}` : ''}`,
      publicacion: updatedPublicacion
    });
  } catch (error) {
    console.error('=== ERROR EN rejectUpdate ===');
    
    if (error instanceof Error) {
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Error desconocido:', error);
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido en el servidor';
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? errorMessage : 'Contacte al administrador'
    });
  }
};

// Cancelar solicitud de edición (usuario)
export const cancelUpdateRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId =
      (req as any).user?._id?.toString?.() ||
      (req as any).userId?.toString?.();

    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    const publicacion = await modelPublicacion.findById(id);
    if (!publicacion) {
      res.status(404).json({ message: 'Publicación no encontrada' });
      return;
    }

    // Verificar si el usuario es el autor (string vs string)
    if (publicacion.autor?.toString?.() !== userId) {
      res.status(403).json({ message: 'Solo el autor puede cancelar esta solicitud' });
      return;
    }

    // Limpiar solicitud pendiente
    const updatedPublicacion = await modelPublicacion.findByIdAndUpdate(
      id,
      { pendingUpdate: null },
      { new: true }
    );

    res.status(200).json({
      message: 'Solicitud de edición cancelada',
      publicacion: updatedPublicacion
    });
  } catch (error) {
    console.error('=== ERROR EN cancelUpdateRequest ===');
    
    if (error instanceof Error) {
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Error desconocido:', error);
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido en el servidor';
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? errorMessage : 'Contacte al administrador'
    });
  }
};

// Función auxiliar para parsear precios (copiada del controlador original)
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

// Función auxiliar para parsear ubicación
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
