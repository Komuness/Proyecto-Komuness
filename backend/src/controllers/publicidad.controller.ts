import { Request, Response} from "express";
import { modelPublicidad } from "../models/publicidad.model";

/*
const publicidadSchema = new Schema<IPublicidad>(
  {
    imagen: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    fechaCaducidad: { type: Date, required: true },
    autor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    activa: { type: Boolean, default: true },
    publicacionRelacionada: {
      type: Schema.Types.ObjectId,
      ref: "Publicacion",
      required: false,
      default: null,
    },
*/

export const createPublicidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imagen, descripcion, fechaCaducidad, autor, activa, publicacionRelacionada } = req.body;
    
    if (!imagen) {
      res.status(400).json({ message: "La imagen de la publicidad es obligatoria" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripción de la publicidad es obligatoria" });
      return;
    }
    if (!fechaCaducidad) {
      res.status(400).json({ message: "La fecha de caducidad de la publicidad es obligatoria" });
      return;
    }
    if (!autor) {
      res.status(400).json({ message: "El autor de la publicidad es obligatorio" });
      return;
    }

    const nuevaPublicidad = new modelPublicidad({
        imagen,
        descripcion: descripcion.trim(),
        fechaCaducidad,
        autor,
        activa: activa ?? true,
        publicacionRelacionada: publicacionRelacionada ?? null 

    });

    const saved = await nuevaPublicidad.save();
    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);
    
    res.status(500).json({ message: "Error al crear el paquete" });
  }
};

export const deletePublicidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await modelPublicidad.findByIdAndDelete(id);

    res.json({ message: "Publicidad eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la publicidad" });
  }
};

export const getPublicidades = async (req: Request, res: Response): Promise<void> => {
  try {
    const publicidades = await modelPublicidad.find();
    res.json({
      data: publicidades
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las publicidades" });
  }
};

export const updatePublicidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { imagen, descripcion, fechaCaducidad, autor, activa, publicacionRelacionada } = req.body;
    
    if (!imagen) {
      res.status(400).json({ message: "La imagen de la publicidad es obligatoria" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripción de la publicidad es obligatoria" });
      return;
    }
    if (!fechaCaducidad) {
      res.status(400).json({ message: "La fecha de caducidad de la publicidad es obligatoria" });
      return;
    }
    if (!autor) {
      res.status(400).json({ message: "El autor de la publicidad es obligatorio" });
      return;
    }

    const nuevaPublicidad = await modelPublicidad.findByIdAndUpdate(
        id,
        {
        imagen,
        descripcion: descripcion.trim(),
        fechaCaducidad,
        autor,
        activa: activa ?? true,
        publicacionRelacionada: publicacionRelacionada ?? null 
        }
    );

    if (!nuevaPublicidad) {
      res.status(404).json({ message: "Publicidad no encontrada" });
      return;
    }
 
    res.status(200).json(nuevaPublicidad);
  } catch (error: any) {
    console.error(error);
 
    res.status(500).json({ message: "Error al actualizar la publicidad" });
  }
};


