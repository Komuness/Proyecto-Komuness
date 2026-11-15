import { Types } from "mongoose";
import {
  IAdjunto,
  IEnlaceExterno,
  IUbicacion,
} from "../interfaces/publicacion.interface";
import { modelPublicacion } from "../models/publicacion.model";
import { notificarPublicacionAutomatica } from "./notificacion.service";

// Orígenes que generan una publicación automática en el feed general.
export type OrigenPublicacionAutomatica =
  | "evento"
  | "emprendimiento"
  | "tutorial"
  | "proyecto-destacado";

export interface CrearPublicacionAutomaticaInput {
  titulo: string;
  descripcion?: string | null;
  url?: string | null;
  autorId: string | Types.ObjectId;
  publicacionOrigenId: string | Types.ObjectId;
  tagOrigen: OrigenPublicacionAutomatica;
  categoriaId?: string | Types.ObjectId | null;
  contenido?: string;
  contenidoBreve?: string;
  adjunto?: IAdjunto[];
  enlacesExternos?: IEnlaceExterno[];
  comunidad?: string;
  fechaEvento?: string;
  horaEvento?: string;
  telefono?: string;
  ubicacion?: IUbicacion;
  publicado?: boolean;
}

const NOMBRE_ENLACE: Record<OrigenPublicacionAutomatica, string> = {
  evento: "Ver evento",
  emprendimiento: "Ver emprendimiento",
  tutorial: "Ver tutorial",
  "proyecto-destacado": "Ver proyecto",
};

function recortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max).trimEnd()}…`;
}

/**
 * Crea una publicación independiente (tag "publicacion") para que el contenido
 * original aparezca en el feed general, igual que ocurre con eventos y
 * emprendimientos (BKD38). No sincroniza cambios posteriores: es solo al crear.
 *
 * Se usa para tutoriales y proyectos destacados (BKD70). El contenido original
 * no tiene categoría, por lo que la publicación automática puede quedar sin
 * categoría (el modelo solo la exige a las publicaciones normales).
 */
export async function crearPublicacionAutomatica(
  input: CrearPublicacionAutomaticaInput,
) {
  const titulo = input.titulo?.trim();
  if (!titulo) {
    throw new Error("El título de la publicación automática es obligatorio");
  }

  const descripcion = input.descripcion?.trim() ?? "";
  const contenido = input.contenido?.trim() || descripcion || titulo;
  const contenidoBreve =
    input.contenidoBreve?.trim() ||
    (descripcion ? recortar(descripcion, 180) : titulo);

  const url = input.url?.trim();
  const enlacesExternos =
    input.enlacesExternos ??
    (url ? [{ nombre: NOMBRE_ENLACE[input.tagOrigen], url }] : undefined);

  // La categoría es opcional únicamente para estas publicaciones automáticas;
  // el modelo la sigue exigiendo cuando no tienen publicacionOrigenId.
  const publicacionAutomatica = new modelPublicacion({
    titulo,
    contenido,
    contenidoBreve,
    autor: input.autorId,
    fecha: new Date().toISOString(),
    tag: "publicacion",
    publicado: input.publicado ?? true,
    categoria: input.categoriaId ?? undefined,
    adjunto: input.adjunto,
    enlacesExternos,
    comunidad: input.comunidad,
    fechaEvento: input.fechaEvento,
    horaEvento: input.horaEvento,
    telefono: input.telefono,
    ubicacion: input.ubicacion,
    publicacionOrigenId: input.publicacionOrigenId,
  } as any);

  const guardada = await publicacionAutomatica.save();

  // Solo se notifica cuando ya es visible para todos. Si la publicación nace
  // pendiente, la notificación se maneja en el flujo de aprobación del origen.
  if (guardada.publicado) {
    try {
      await notificarPublicacionAutomatica({
        publicacionId: guardada._id.toString(),
        titulo: guardada.titulo,
        tagOrigen: input.tagOrigen,
      });
    } catch (error) {
      console.warn(
        "[Publicaciones][automatica] No se pudo notificar la publicación automática:",
        error,
      );
    }
  }

  return guardada;
}
