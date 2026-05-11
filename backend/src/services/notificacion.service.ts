import mongoose from "mongoose";
import { modelNotificacion } from "../models/notificacion.model";

type CreateNotificacionInput = {
  nombre: string;
  descripcion: string;
  destinatarioId: string;
  publicacionId?: string;
  fechaCaducidad?: Date | null;
};

type CreateComentarioPublicacionNotificacionInput = {
  destinatarioId: string;
  publicacionId: string;
  tituloPublicacion: string;
  nombreComentarista: string;
};

function ensureObjectId(id: string, fieldName: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} invalido`);
  }
}

export async function createNotificacion(input: CreateNotificacionInput) {
  const {
    nombre,
    descripcion,
    destinatarioId,
    publicacionId,
    fechaCaducidad = null,
  } = input;

  ensureObjectId(destinatarioId, "destinatarioId");
  if (publicacionId) {
    ensureObjectId(publicacionId, "publicacionId");
  }

  const nuevaNotificacion = new modelNotificacion({
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    destinatario: destinatarioId,
    publicacionId: publicacionId || null,
    fechaCaducidad,
  });

  return nuevaNotificacion.save();
}

export async function createComentarioPublicacionNotificacion(
  input: CreateComentarioPublicacionNotificacionInput
) {
  const { destinatarioId, publicacionId, tituloPublicacion, nombreComentarista } =
    input;

  const tituloSeguro = tituloPublicacion?.trim() || "tu publicacion";
  const autorSeguro = nombreComentarista?.trim() || "Un usuario";

  return createNotificacion({
    destinatarioId,
    publicacionId,
    nombre: "Nuevo comentario en tu publicacion",
    descripcion: `${autorSeguro} comento en "${tituloSeguro}"`,
  });
}
