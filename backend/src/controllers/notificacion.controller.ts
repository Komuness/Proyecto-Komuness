import { Request, Response} from "express";
import { modelNotificacion } from "../models/notificacion.model";
import { ObjectId } from "mongoose";

//En caso de que se le quiera agregar una fecha "automática" para que caduquen
const today = new Date();
function agregarDias(fecha: Date, dias: number): Date {
  return new Date(today.getTime() + dias * 24 * 60 * 60 * 1000);
}

/**
 * Crear una nueva notificación
 * @route GET /api/notificacion
 * Para filtro, usar userId, api/notificaciones?userId=...
 */

export const getNotificaciones = async (req: Request, res: Response): Promise<void> => {
  try {

    const { userId }  = req.query

    let filtro: any = {};
    if (userId) {
      filtro = {
        $or: [
          { recipientes: userId },
          { recipientes: [] }
        ]
      }
    }
    const notificaciones = await modelNotificacion.find(filtro).lean();

    if(notificaciones.length === 0){
      res.status(200).json({ data: [], message: "Este usuario no posee notificaciones" });
      return;
    }

    //Si no tiene filtro, solo devuelve
    if (!userId){
      res.status(200).json({ data: notificaciones, message: "Notificaciones obtenidas correctamente" });
      return
    }

    //Si tiene filtro, revisar por usuario el visto
    const notificacionesConVisto = notificaciones.map((notificacion) => {

    const visto = notificacion.vistoPor?.some(
      (id) => id.toString() === userId
    );

    const {
      vistoPor,
      recipientes,
      ...notificacionLimpia
    } = notificacion;

    return {
      ...notificacionLimpia,
      visto
      };
    });

    res.status(200).json({ data: notificacionesConVisto, message: "Notificaciones obtenidas correctamente" });


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las notificaciones para el usuario" });
  }
};

/**
 * Crear una nueva notificación
 * @route POST /api/notificacion/
 */

export const createNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion, fechaCaducidad, recipientes} = req.body;

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre de la notificación es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripción de la notificación es obligatoria" });
      return;
    }
    

    const nuevaNotificacion = new modelNotificacion({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaCaducidad: fechaCaducidad,
      recipientes: recipientes
    });

    const saved = await nuevaNotificacion.save();
    res.status(201).json(saved);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la notificación" });
  }
};

/**
 * Crear una nueva notificación
 * @route DELETE /api/notificacion/:id
 */

export const deleteNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notificacionAEliminar = await modelNotificacion.findByIdAndDelete(id);

    if (!notificacionAEliminar) {
      res.status(404).json({ message: "No se encontró la notificación" });
      return;
    }

    res.status(200).json({ message: "Notificación eliminada correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la notificación" });
  }
};

/**
 * Crear una nueva notificación
 * @route PUT /api/notificacion/:id
 */

export const updateNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fechaCaducidad, recipientes, vistoPor} = req.body;

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre de la notificación es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripción de la notificación es obligatoria" });
      return;
    }
    
    const data : any = {};

    //Revisa si los datos fueron enviados o vienen "vacíos"
    if (nombre !== undefined) data.nombre = nombre?.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim();
    if (fechaCaducidad !== undefined) data.fechaCaducidad = fechaCaducidad;
    if (recipientes) data.$addToSet = { recipientes };
    if (vistoPor) data.$addToSet = { vistoPor };

    const notificacionActualizada = await modelNotificacion.findByIdAndUpdate(
      id, 
      data,
      { new: true }
    );
 
    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificación no encontrado" });
      return;
    }
 
    res.status(200).json({data: notificacionActualizada, message: "La notificación se actualizó correctamente" });

  } catch (error: any) {
    console.error(error);
 
    res.status(500).json({ message: "Error al actualizar la notificación" });
  }
};

/**
 * Crear una nueva notificación
 * @route PUT /api/notificacion/:id/visto
 * body={vistoPor: userId}
 */

export const notificacionSeenBy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {vistoPor} = req.body;

    const notificacionActualizada = await modelNotificacion.findByIdAndUpdate(
      id, 
      {
        $addToSet: { vistoPor: vistoPor}
      },
      { new: true }
    );
 
    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificación no encontrada" });
      return;
    }
 
    res.status(200).json({ data: notificacionActualizada, message: "La notificación fue vista por el usuario"});

  } catch (error: any) {
    console.error(error);
 
    res.status(500).json({ message: "Error al actualizar la notificación" });
  }
};


