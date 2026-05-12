import { Document, Types } from "mongoose";

export interface INotificacion extends Document {
    nombre: string;
    descripcion: string;
    fechaCaducidad?: Date | null;
    recipientes: Types.ObjectId[];
    vistoPor: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

