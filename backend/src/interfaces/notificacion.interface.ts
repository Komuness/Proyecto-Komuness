import { Document, Types } from "mongoose";

export interface INotificacion extends Document {
    nombre: string;
    descripcion: string;
    destinatario: Types.ObjectId;
    publicacionId?: Types.ObjectId | null;
    fechaCaducidad?: Date | null;
    vistoPor: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

