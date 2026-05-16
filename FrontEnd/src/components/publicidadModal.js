import { use, useState } from "react";
import { toast } from "react-hot-toast"
import { useAuth } from './context/AuthContext';

const PublicidadModal = ({
    onClose,
    onSubmit,
    publicidad = null, // si viene con datos esta editando
}) => {
    const { user } = useAuth();
    const [imagen, setImagen] = useState(publicidad?.imagen ?? "");
    const [preview, setPreview] = useState(publicidad?.imagen ?? "");
    const [descripcion, setDescripcion] = useState(publicidad?.descripcion ?? "");
    const [fechaCaducidad, setFechaCaducidad] = useState(
        publicidad?.fechaCaducidad
        ? new Date(publicidad.fechaCaducidad)
        : new Date()
    );
    const [autor, setAutor] = useState(publicidad?.autor ?? user?._id ?? "");
    const [activa, setActiva] = useState(publicidad?.activa ?? true);
    const [publicacionRelacionada, setPublicacionRelacionada] = useState(publicidad?.publicacionRelacionada ?? "");
    const modoCrear = (publicidad == null);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImagen(file);
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);
    };

    const handleSubmit = () => {
        if (!descripcion.trim()) {
            toast.error(
                "La descripción es obligatoria"
            );
            return;
        }

        if (!fechaCaducidad) {
            toast.error(
                "La fecha de caducidad es obligatoria"
            );
            return;
        }

        if (!autor.trim()) {
            toast.error(
                "El autor es obligatorio"
            );
            return;
        }

        if (modoCrear && !(imagen instanceof File)) {
            toast.error(
                "La imagen es obligatoria"
            );
            return;
        }

        onSubmit({
            imagen,
            descripcion: descripcion.trim(),
            fechaCaducidad,
            autor: autor.trim(),
            activa,
            publicacionRelacionada,
        });
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {modoCrear ? "Nueva publicidad" : "Editar publicidad"}
            </h3>
    
        {/*Imagen*/}
        <div className="campo-grupo">
              <label className="campo-label">Imágen de la publicidad:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="campo-input"
              />
            {preview && (
                <div>
                    <img
                        src={preview}
                        className = "max-h-72 rounded-lg border object-contain" 
                    />
                </div>
            )}
        </div>
     
         {/* Descripción */}
         <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
            </label>
            <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={1}
                placeholder="Descripción de la publicidad"
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
         </div>

        {/* Fecha */}
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de caducidad
            </label>
            <input
                type="date"
                value={fechaCaducidad}
                onChange={(e) => setFechaCaducidad(e.target.value)}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

        {/*
        <div className="mb-8 flex items-center gap-3">
            <input
                type="checkbox"
                checked={activa}
                onChange={(e) =>
                    setActiva(e.target.checked)
                }
                className="w-4 h-4"
            />
            <label className="text-gray-700">
                Publicidad activa
            </label>
        </div>*/}


        {/*BOTONES*/}
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {modoCrear ? "Crear" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
    );
}

export default PublicidadModal;
