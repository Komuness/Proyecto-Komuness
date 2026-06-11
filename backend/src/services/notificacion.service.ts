import mongoose from "mongoose";
import { modelNotificacion } from "../models/notificacion.model";
import { modelCategoria } from "../models/categoria.model"
import { modelCategoriaPreferencia } from "../models/categoriaPreferencia.model"
import { IPublicacionNotification } from "../interfaces/publicacion.interface"


type CreateNotificacionInput = {
  nombre: string;
  descripcion: string;
  // Compatibilidad
  destinatarioId?: string;
  recipientes?: string[];
  publicacionId?: string;
  fechaCaducidad?: Date | null;
  tipo?: "general" | "formulario";
  formularioUrl?: string | null;
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
    tipo = "general",
    formularioUrl = null,
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
    tipo,
    formularioUrl,
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
type CreateRespuestaComentarioNotificacionInput = {
  // Compatibilidad
  destinatarioId?: string;
  recipientes?: string[];

  publicacionId: string;
  tituloPublicacion: string;
  nombreRespondedor: string;
};

export async function createRespuestaComentarioNotificacion(
  input: CreateRespuestaComentarioNotificacionInput
) {
  const {
    destinatarioId,
    recipientes,
    publicacionId,
    tituloPublicacion,
    nombreRespondedor,
  } = input;

  const tituloSeguro =
    tituloPublicacion?.trim() || "tu publicación";

  const autorSeguro =
    nombreRespondedor?.trim() || "Un usuario";

  return createNotificacion({
    destinatarioId,
    recipientes,
    publicacionId,

    nombre: "Nueva respuesta a tu comentario",

    descripcion:
      `${autorSeguro} respondió tu comentario en "${tituloSeguro}"`,
  });
}

export const obtenerUsuariosPorCategoria = async (
  categoriaId: string
) => {
  const usuarios = await modelCategoriaPreferencia
    .find({ categoriaId })
    .select("usuarioId -_id");

  return usuarios.map(u => u.usuarioId);
};

export const notificarNuevaPublicacion = async (
  publicacion: IPublicacionNotification
) => {

  const seguidores = await obtenerUsuariosPorCategoria(publicacion.categoriaId.toString());

  const categoria = await modelCategoria.findById(
    publicacion.categoriaId
  ).select("nombre");

  if (seguidores.length === 0) {
    console.log(`No hay usuarios suscritos a la categoría ${publicacion.categoriaId}`);
    return;
  }

  await modelNotificacion.create({
    nombre: `Nueva publicación (${categoria?.nombre})`,
    descripcion: `${publicacion.contenidoBreve} - ${publicacion.autor}`,
    recipientes: seguidores,
    publicacionId: publicacion.publicacionId
  });
};