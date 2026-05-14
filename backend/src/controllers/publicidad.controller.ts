import { Request, Response} from "express";
import { modelPublicidad } from "../models/publicidad.model";
import { saveMulterFileToGridFS } from "../utils/gridfs";

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
    const { descripcion, fechaCaducidad, autor, activa, publicacionRelacionada } = req.body;
    
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

    const file = req.file;
    if (!file) {
        res.status(400).json({message: "La imagen es obligatoria"});
        return;
    }

    const result = await saveMulterFileToGridFS(
        file,
        "publicidad"
    );
    const imagen = `${process.env.PUBLIC_BASE_URL || "http://localhost:5000"}` + `/api/files/${result.id.toString()}`;

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
    const { descripcion, fechaCaducidad, autor, activa, publicacionRelacionada } = req.body;
    
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
    const publicidad =
      await modelPublicidad.findById(id);

    if (!publicidad) {
      res.status(404).json({
        message: "Publicidad no encontrada"
      });
      return;
    }

    let imagen = publicidad.imagen;

    if (req.file) {
        const result = await saveMulterFileToGridFS(req.file, "publicidad");

        imagen = `${process.env.PUBLIC_BASE_URL || "http://localhost:5000"}` + `/api/files/${result.id.toString()}`;
    }
    
    publicidad.imagen = imagen;
    publicidad.descripcion = descripcion.trim();
    publicidad.fechaCaducidad = fechaCaducidad;
    publicidad.autor = autor;
    publicidad.activa = activa ?? true;
    publicidad.publicacionRelacionada = publicacionRelacionada ?? null;
    
    await publicidad.save();
    res.status(200).json(publicidad);

  } catch (error: any) {
    console.error(error);
 
    res.status(500).json({ message: "Error al actualizar la publicidad" });
  }
};


