import { Document, Types } from "mongoose";

export interface IPublicidad extends Document {
  imagen: string;
  descripcion: string;
  fechaCaducidad: Date;
  autor: Types.ObjectId;
  activa: boolean;
  publicacionRelacionada?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
