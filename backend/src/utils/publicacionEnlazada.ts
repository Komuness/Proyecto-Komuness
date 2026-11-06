import { modelPublicacion } from '../models/publicacion.model';
import { IPublicacion } from '../interfaces/publicacion.interface';
import { calculatePublicationExpirationDate } from './publicacionExpiration';
import { sincronizarCuentaRegresivaDeEvento } from '../services/cuentaRegresiva.service';

// BKD67: un evento/emprendimiento y su publicación automática (enlazada por
// publicacionOrigenId) se editan y se eliminan juntos.

// Campos que comparten el original y su publicación. Si se edita
// cualquiera de los dos, se copian al otro. Los precios y el tag son
// propios del original; los adjuntos tienen archivos separados en GridFS.
export const CAMPOS_ENLAZADOS = [
  'titulo',
  'contenido',
  'contenidoBreve',
  'categoria',
  'comunidad',
  'fechaEvento',
  'horaEvento',
  'telefono',
  'enlacesExternos',
  'ubicacion',
  'publicado',
] as const;

// Id del evento/emprendimiento original del grupo, o null si la
// publicación no está enlazada (publicación normal sin copia).
const getIdOrigenEnlazado = (publicacion: any) => {
  if (publicacion.publicacionOrigenId) return publicacion.publicacionOrigenId;
  if (publicacion.tag !== 'evento' && publicacion.tag !== 'emprendimiento') return null;
  return publicacion._id;
};

// Todos los documentos enlazados con `publicacion` (sin incluirla):
// el original y/o sus publicaciones automáticas.
export const findPublicacionesEnlazadas = async (publicacion: any) => {
  const origenId = getIdOrigenEnlazado(publicacion);
  if (!origenId) return [];
  return modelPublicacion.find({
    _id: { $ne: publicacion._id },
    $or: [{ _id: origenId }, { publicacionOrigenId: origenId }],
  });
};

// Copia a los documentos enlazados los `campos` (ya guardados) de
// `publicacion`. Solo toma los que son compartidos.
export const sincronizarPublicacionesEnlazadas = async (
  publicacion: any,
  campos: string[],
): Promise<void> => {
  const cambios: Record<string, any> = {};
  for (const campo of CAMPOS_ENLAZADOS) {
    if (campos.includes(campo)) cambios[campo] = publicacion[campo];
  }
  if (!Object.keys(cambios).length) return;

  const enlazadas = await findPublicacionesEnlazadas(publicacion);
  for (const enlazada of enlazadas) {
    enlazada.set(cambios);
    enlazada.fechaExpiracion =
      calculatePublicationExpirationDate(enlazada.toObject() as IPublicacion) ?? (null as any);
    await enlazada.save();

    // UI65: si el cambio llegó desde la publicación, el evento original
    // también mueve su cuenta regresiva (si tiene).
    try {
      await sincronizarCuentaRegresivaDeEvento(enlazada as any, { crearSiNoExiste: false });
    } catch (error) {
      console.warn('No se pudo sincronizar la cuenta regresiva del evento enlazado', error);
    }
  }
};
