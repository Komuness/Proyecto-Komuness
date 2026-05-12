import { INotificacion } from "@/interfaces/notificacion.interface";
import { model, Schema } from "mongoose";

const notificacionSchema = new Schema<INotificacion>(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    fechaCaducidad: { type: Date, required: false, default: null },
    recipientes: [{ type: Schema.Types.ObjectId, ref: "Usuario"}],
    vistoPor: [{ type: Schema.Types.ObjectId, ref: "Usuario", default: []}],
  },
  {
    timestamps: true,
    strict: true,
  }
);

notificacionSchema.index({ fechaCaducidad: 1 });
notificacionSchema.index({ recipientes: 1 });
notificacionSchema.index({ vistoPor: 1 });

export const modelNotificacion = model<INotificacion>("Notificacion", notificacionSchema);
