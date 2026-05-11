import { Request, Response } from "express";
import mongoose from "mongoose";
import { modelNotificacion } from "../models/notificacion.model";
import { createNotificacion as createNotificacionService } from "../services/notificacion.service";

function getRequestUserId(req: Request): string | null {
  const userId =
    req.user?._id?.toString?.() ||
    (req as any).user?._id?.toString?.() ||
    (req as any).userId?.toString?.();

  return userId || null;
}

export const getNotificaciones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const { onlyUnread } = req.query;
    const now = new Date();

    const filtro: any = {
      destinatario: userId,
      $or: [{ fechaCaducidad: null }, { fechaCaducidad: { $gte: now } }],
    };

    if (String(onlyUnread).toLowerCase() === "true") {
      filtro.vistoPor = { $ne: userId };
    }

    const notificaciones = await modelNotificacion
      .find(filtro)
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ data: notificaciones, message: "Notificaciones obtenidas" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
};

export const createNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { nombre, descripcion, destinatario, publicacionId, fechaCaducidad } =
      req.body || {};

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripcion es obligatoria" });
      return;
    }
    if (!destinatario || !mongoose.Types.ObjectId.isValid(destinatario)) {
      res.status(400).json({ message: "destinatario invalido" });
      return;
    }
    if (publicacionId && !mongoose.Types.ObjectId.isValid(publicacionId)) {
      res.status(400).json({ message: "publicacionId invalido" });
      return;
    }

    const saved = await createNotificacionService({
      nombre,
      descripcion,
      destinatarioId: destinatario,
      publicacionId,
      fechaCaducidad: fechaCaducidad || null,
    });

    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la notificacion" });
  }
};

export const deleteNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getRequestUserId(req);

    if (!userId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const userTipo = Number((req as any).user?.tipoUsuario);
    const isAdmin = userTipo === 0 || userTipo === 1;

    const filtro: any = { _id: id };
    if (!isAdmin) {
      filtro.destinatario = userId;
    }

    const notificacionAEliminar = await modelNotificacion.findOneAndDelete(filtro);

    if (!notificacionAEliminar) {
      res.status(404).json({ message: "No se encontro la notificacion" });
      return;
    }

    res.status(200).json({ message: "Notificacion eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la notificacion" });
  }
};

export const updateNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fechaCaducidad, vistoPor, destinatario, publicacionId } =
      req.body || {};

    const data: any = {};

    if (nombre !== undefined) {
      if (!nombre?.trim()) {
        res.status(400).json({ message: "El nombre no puede ir vacio" });
        return;
      }
      data.nombre = nombre.trim();
    }

    if (descripcion !== undefined) {
      if (!descripcion?.trim()) {
        res.status(400).json({ message: "La descripcion no puede ir vacia" });
        return;
      }
      data.descripcion = descripcion.trim();
    }

    if (fechaCaducidad !== undefined) data.fechaCaducidad = fechaCaducidad;

    if (destinatario !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(destinatario)) {
        res.status(400).json({ message: "destinatario invalido" });
        return;
      }
      data.destinatario = destinatario;
    }

    if (publicacionId !== undefined) {
      if (publicacionId !== null && !mongoose.Types.ObjectId.isValid(publicacionId)) {
        res.status(400).json({ message: "publicacionId invalido" });
        return;
      }
      data.publicacionId = publicacionId;
    }

    if (vistoPor) data.$addToSet = { vistoPor };

    const notificacionActualizada = await modelNotificacion.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );

    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificacion no encontrada" });
      return;
    }

    res.status(200).json({
      data: notificacionActualizada,
      message: "Notificacion actualizada correctamente",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la notificacion" });
  }
};

export const notificacionSeenBy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const viewerId = getRequestUserId(req);

    if (!viewerId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const notificacionActualizada = await modelNotificacion.findOneAndUpdate(
      {
        _id: id,
        destinatario: viewerId,
      },
      {
        $addToSet: { vistoPor: viewerId },
      },
      { new: true }
    );

    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificacion no encontrada" });
      return;
    }

    res.status(200).json({
      data: notificacionActualizada,
      message: "Notificacion marcada como vista",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la notificacion" });
  }
};
