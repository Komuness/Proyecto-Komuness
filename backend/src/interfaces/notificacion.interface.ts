import { Document, Types } from "mongoose";

export interface INotificacion extends Document {
    nombre: string;
    descripcion: string;
    destinatario: Types.ObjectId;
    publicacionId?: Types.ObjectId | null;
    fechaCaducidad?: Date | null;
    recipientes: Types.ObjectId[];
    vistoPor: Types.ObjectId[];
    // Usuarios que ocultaron/eliminaron la notificación para sí mismos.
    // No se borra el documento para no afectar a los demás destinatarios.
    eliminadasPor: Types.ObjectId[];
    tipo?: "general" | "formulario" | "recordatorio"; // tipo de notificación
    formularioUrl?: string | null; // URL del Google Forms (solo para tipo formulario)
    createdAt: Date;
    updatedAt: Date;
}

