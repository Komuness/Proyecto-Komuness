import mongoose from "mongoose";
import { modelNotificacion } from "../models/notificacion.model";

type CreateNotificacionInput = {
  nombre: string;
  descripcion: string;
  // Compatibilidad
  destinatarioId?: string;
  recipientes?: string[];
  publicacionId?: string;
  fechaCaducidad?: Date | null;
};

type CreateComentarioPublicacionNotificacionInput = {
  // Compatibilidad
  destinatarioId?: string;
  recipientes?: string[];
  publicacionId: string;
  tituloPublicacion: string;
  nombreComentarista: string;
};

function ensureObjectId(id: string, fieldName: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} inválido`);
  }
}

export async function createNotificacion( input: CreateNotificacionInput ) {
  const {
    nombre,
    descripcion,
    destinatarioId,
    recipientes,
    publicacionId,
    fechaCaducidad = null,
  } = input;

  // Compatibilidad
  const recipientesFinales =
    recipientes ||
    (destinatarioId ? [destinatarioId] : []);

  if (recipientesFinales.length > 0) {
    recipientesFinales.forEach((id, index) => {
      ensureObjectId(id, `recipientes[${index}]`);
    });
  }

  if (publicacionId) {
    ensureObjectId(publicacionId, "publicacionId");
  }

  const nuevaNotificacion = new modelNotificacion({
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    destinatario: recipientesFinales.length === 1 ? recipientesFinales[0] : null,
    recipientes: recipientesFinales,
    publicacionId: publicacionId || null,
    fechaCaducidad,
  });

  return nuevaNotificacion.save();
}

export async function createComentarioPublicacionNotificacion(
  input: CreateComentarioPublicacionNotificacionInput
) {
  const {
    destinatarioId,
    recipientes,
    publicacionId,
    tituloPublicacion,
    nombreComentarista,
  } = input;

  const tituloSeguro =
    tituloPublicacion?.trim() || "tu publicación";

  const autorSeguro =
    nombreComentarista?.trim() || "Un usuario";

  return createNotificacion({
    destinatarioId,
    recipientes,
    publicacionId,

    nombre: "Nuevo comentario en tu publicación",

    descripcion: `${autorSeguro} comentó en "${tituloSeguro}"`,
  });
}
