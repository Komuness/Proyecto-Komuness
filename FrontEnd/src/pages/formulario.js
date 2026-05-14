import { useState, useEffect } from "react";
import { IoMdClose, IoMdRemove, IoMdAdd } from "react-icons/io";
import { API_URL } from "../utils/api";
import { toast } from "react-hot-toast";
import CategoriaSelector from '../components/categoriaSelector';
import AlertaLimitePublicaciones from '../components/AlertaLimitePublicaciones';
import '../CSS/formularioPublicacion.css';
import MapaUbicacion from '../components/MapaUbicacion';
import TextAreaComponent from '../components/TextAreaComponent';
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import {
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft
} from "../utils/sessionDraftStorage";

const CREATE_DRAFT_PREFIX = "komuness:crear-publicacion";

const DEFAULT_UBICACION = {
  latitude: 9.7489,
  longitude: -83.7534,
  direccion: "San José, Costa Rica",
  mapLink: 'https://www.openstreetmap.org/?mlat=9.7489&mlon=-83.7534#map=16/9.7489/-83.7534'
};

const createDefaultUbicacion = () => ({ ...DEFAULT_UBICACION });

const createDefaultEnlaces = () => [{ nombre: '', url: '' }];

const getCreateDraftStorageKey = (tag) =>
  `${CREATE_DRAFT_PREFIX}:${tag || "general"}`;

const getInitialFormValues = (tag) => ({
  titulo: "",
  contenido: "",
  contenidoBreve: "",
  autor: "",
  fecha: new Date().toLocaleDateString(),
  archivos: [],
  comentarios: [],
  tag: tag || "",
  publicado: false,
  fechaEvento: "",
  horaEvento: "",
  precio: "",
  moneda: "CRC",
  precioNegociable: false,
  precioEstudiante: "",
  precioCiudadanoOro: "",
  telefono: "",
  categoria: "",
});

const getPersistedFormData = (formData) => {
  const { archivos, ...resto } = formData;
  return resto;
};

export const FormularioPublicacion = ({ isOpen, onClose, openTag }) => {
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [enlacesExternos, setEnlacesExternos] = useState(createDefaultEnlaces);
  const [ubicacion, setUbicacion] = useState(createDefaultUbicacion);

  const [formData, setFormData] = useState(() => getInitialFormValues(openTag));
  const [draftCargado, setDraftCargado] = useState(false);
  const draftStorageKey = getCreateDraftStorageKey(openTag);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setDraftCargado(false);
      return;
    }

    setDraftCargado(false);
    const initialFormValues = getInitialFormValues(openTag);
    const savedDraft = readSessionDraft(draftStorageKey);

    if (savedDraft) {
      setFormData({
        ...initialFormValues,
        ...(savedDraft.formData || {}),
        archivos: [],
      });
      setEnlacesExternos(
        Array.isArray(savedDraft.enlacesExternos) && savedDraft.enlacesExternos.length > 0
          ? savedDraft.enlacesExternos
          : createDefaultEnlaces()
      );
      setUbicacion({
        ...createDefaultUbicacion(),
        ...(savedDraft.ubicacion || {}),
      });
    } else {
      setFormData(initialFormValues);
      setEnlacesExternos(createDefaultEnlaces());
      setUbicacion(createDefaultUbicacion());
    }

    setDraftCargado(true);
  }, [isOpen, openTag, draftStorageKey]);

  useEffect(() => {
    if (!isOpen || !draftCargado) return;

    writeSessionDraft(draftStorageKey, {
      formData: getPersistedFormData(formData),
      enlacesExternos,
      ubicacion,
    });
  }, [isOpen, draftCargado, draftStorageKey, formData, enlacesExternos, ubicacion]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const normalizedValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handlePrecioNegociableChange = (e) => {
    const checked = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      precioNegociable: checked,
      ...(checked
        ? {
            precio: "",
            precioEstudiante: "",
            precioCiudadanoOro: "",
          }
        : {}),
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({ ...prev, archivos: [...prev.archivos, ...files] }));
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index),
    }));
  };

  // Manejo de enlaces externos
  const handleEnlaceChange = (index, field, value) => {
    const updatedEnlaces = [...enlacesExternos];
    updatedEnlaces[index][field] = value;
    setEnlacesExternos(updatedEnlaces);
  };

  const addEnlace = () => {
    setEnlacesExternos([...enlacesExternos, { nombre: '', url: '' }]);
  };

  const removeEnlace = (index) => {
    if (enlacesExternos.length > 1) {
      setEnlacesExternos(enlacesExternos.filter((_, i) => i !== index));
    }
  };

    // Filtrar enlaces válidos (con nombre y URL)
  const enlacesValidos = enlacesExternos.filter(
      enlace => enlace.nombre.trim() !== '' && enlace.url.trim() !== ''
    );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("titulo", formData.titulo);
    data.append("contenido", formData.contenido);
    data.append("contenidoBreve", formData.contenidoBreve);
    data.append("fecha", formData.fecha);
    data.append("tag", formData.tag);
    data.append("publicado", String(formData.publicado));
    data.append("fechaEvento", formData.fechaEvento || "");
    data.append("horaEvento", formData.horaEvento || ""); // <-- NUEVO
    data.append("precio", formData.precio || "");
    data.append("moneda", formData.moneda || "CRC");
    data.append("precioNegociable", String(formData.precioNegociable));
    data.append("precioEstudiante", formData.precioEstudiante || "");
    data.append("precioCiudadanoOro", formData.precioCiudadanoOro || "");
    data.append("telefono", formData.telefono || "");
    data.append("categoria", formData.categoria || "");
    
    // Agregar ubicación como JSON si es un evento
    if (formData.tag === "evento" && ubicacion) {
      data.append("ubicacion", JSON.stringify(ubicacion));
    }

      // Agregar enlaces externos como JSON
    if (enlacesValidos.length > 0) {
      data.append("enlacesExternos", JSON.stringify(enlacesValidos));
    }

    formData.archivos.forEach((archivo) => {
      data.append("archivos", archivo);
    });

    try {
      await enviarPublicacion(data);
      removeSessionDraft(draftStorageKey);
      onClose?.();
    } catch (error) {
      // Si el error es por límite de publicaciones (403), solo mostrar modal premium
      // No mostrar ninguna otra alerta
      if (error.status === 403) {
        setMostrarAlerta(true);
        // No re-lanzar el error para evitar mensajes adicionales
        return;
      }
      // Para otros errores, el toast.promise ya los manejó
    }
  };

  const enviarPublicacion = async (data) => {
    // Primero hacemos la petición sin toast para poder manejar el 403 de manera especial
    const response = await fetch(`${API_URL}/publicaciones/v2/`, {
      method: "POST",
      body: data,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Respuesta inesperada del servidor.");
    }

    if (!response.ok) {
      const error = new Error(result?.message || result?.mensaje || "Error al enviar publicación.");
      error.status = response.status;
      
      // Si es error 403, lanzarlo sin mostrar toast
      if (response.status === 403) {
        throw error;
      }
      
      // Para otros errores, mostrar toast
      toast.error(error.message);
      throw error;
    }

    // Si fue exitoso, mostrar toast de éxito
    toast.success("Publicación enviada con éxito, solicita a un administrador que la publique 🎉", {
      duration: 8000,
    });
    
    return result;
  };

  if (!isOpen) return null;

return (
    <>
      <div className="formulario-publicacion-container">
        <div className="formulario-publicacion">
          <form onSubmit={handleSubmit} className="formulario-grid">
            {/* Header móvil */}
            <div className="formulario-mobile-header">
              <button type="button" onClick={onClose} className="text-gray-600 text-2xl font-bold">
                <IoMdClose size={35} />
              </button>
              <button type="submit" className="boton-mobile">
                Publicar
              </button>
            </div>

            {/* Título */}
            <div className="campo-grupo">
              <label className="campo-label">Título:</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                maxLength={100}
                className="campo-input"
                required
              />
              <p className="texto-contador">{formData.titulo.length}/100 caracteres</p>
            </div>

            {/* Tag */}
            <div className="campo-grupo">
              <label className="campo-label">Tipo (tag):</label>
              <select
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                className="campo-select"
                required
              >
                <option value="">Selecciona una categoría</option>
                <option value="publicacion">Publicación</option>
                <option value="evento">Evento</option>
                <option value="emprendimiento">Emprendimiento</option>
              </select>
            </div>

            {/* Clasificación */}
            <div className="campo-grupo">
              <label className="campo-label">Clasificación:</label>
              <CategoriaSelector 
                selectedCategoria={formData.categoria}
                onCategoriaChange={handleChange}
                required={true}
              />
            </div>

            {/* Descripción */}
            <div className="campo-grupo">
              <label className="campo-label">Descripción:</label>
              <textarea
                name="contenido"
                value={formData.contenido}
                onChange={handleChange}
                className="campo-textarea"
                placeholder={`Descripción del evento`}
                rows="4"
                required
              />
            </div>
	    {/* Descripción corta*/}
            <div className="campo-grupo">
              <label className="campo-label">Descripción breve:</label>
              <TextAreaComponent
                name="contenidoBreve"
                value={formData.contenidoBreve}
                onChange={handleChange}
                className="campo-textarea small"
                placeholder={`Descripción breve`}
		limit={100}
                rows={2}
                required
              />
            </div>

            {/* Precios para eventos y emprendimientos */}
            {(formData.tag === "evento" || formData.tag === "emprendimiento") && (
              <div className="precios-seccion">
                <h3 className="precios-titulo">Precios</h3>

                {formData.tag === "emprendimiento" && (
                  <div className="precio-negociable-box">
                    <div className="precio-negociable-header">
                      <input
                        id="precioNegociableCrear"
                        type="checkbox"
                        name="precioNegociable"
                        checked={formData.precioNegociable === true}
                        onChange={handlePrecioNegociableChange}
                        className="precio-negociable-checkbox"
                      />
                      <label htmlFor="precioNegociableCrear" className="precio-negociable-label">
                        Precio negociable
                      </label>
                    </div>
                    <p className="precio-negociable-help">
                      Si activas esta opción, no se mostrará un precio fijo en el emprendimiento.
                    </p>
                  </div>
                )}
                
                {(formData.tag === "evento" || !formData.precioNegociable) && (
                  <>
                    <div className="campo-grupo">
                      <label className="campo-label">Moneda *:</label>
                      <select
                        name="moneda"
                        value={formData.moneda}
                        onChange={handleChange}
                        className="campo-select"
                        required
                      >
                        <option value="CRC">Colones (₡)</option>
                        <option value="USD">Dólares ($)</option>
                      </select>
                    </div>

                    {/* Precio Regular */}
                    <div className="campo-grupo">
                      <label className="campo-label">Precio regular *:</label>
                      <input
                        type="number"
                        name="precio"
                        value={formData.precio}
                        onChange={handleChange}
                        className="campo-input"
                        required
                        placeholder="Ej: 10000"
                      />
                    </div>

                    {/* Precio Estudiante */}
                    <div className="campo-grupo">
                      <label className="campo-label">Precio estudiante (opcional):</label>
                      <input
                        type="number"
                        name="precioEstudiante"
                        value={formData.precioEstudiante}
                        onChange={handleChange}
                        className="campo-input"
                        placeholder="Ej: 5000"
                      />
                    </div>

                    {/* Precio Ciudadano de Oro */}
                    <div className="campo-grupo">
                      <label className="campo-label">Precio ciudadano de oro (opcional):</label>
                      <input
                        type="number"
                        name="precioCiudadanoOro"
                        value={formData.precioCiudadanoOro}
                        onChange={handleChange}
                        className="campo-input"
                        placeholder="Ej: 7000"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Teléfono */}
        
            <div className="campo-grupo">
              <label className="campo-label">Teléfono de contacto (opcional):</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="campo-input"
                placeholder="Ej: 88888888"
                pattern="[0-9]*"
                inputMode="numeric"
                onKeyPress={(e) => {
                  // Solo permite números
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              {formData.telefono && !/^\d+$/.test(formData.telefono) && (
                <p className="texto-error">El teléfono debe contener solo números</p>
              )}
            </div>

            {/* Enlaces externos */}
            <div className="enlaces-seccion">
              <label className="campo-label">Enlaces externos (opcional):</label>
              <p className="texto-ayuda">
                Puedes agregar: URLs, correos, enlaces de WhatsApp, etc.
              </p>
              {enlacesExternos.map((enlace, index) => (
                <div key={index} className="enlace-fila">
                  <input
                    type="text"
                    placeholder="Ej: Facebook, Correo, WhatsApp"
                    value={enlace.nombre}
                    onChange={(e) => handleEnlaceChange(index, 'nombre', e.target.value)}
                    className="campo-input enlace-input"
                  />
                  <input
                    type="text"
                    placeholder="https://..., correo@gmail.com,"
                    value={enlace.url}
                    onChange={(e) => handleEnlaceChange(index, 'url', e.target.value)}
                    className="campo-input enlace-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeEnlace(index)}
                    className="boton-eliminar-enlace"
                    disabled={enlacesExternos.length === 1}
                  >
                    <IoMdRemove size={20} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEnlace}
                className="boton-agregar-enlace"
              >
                <IoMdAdd size={16} />
                Agregar otro enlace
              </button>
            </div>

            {/* Imágenes */}
            <div className="campo-grupo">
              <label className="campo-label">Imágenes:</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="campo-input"
                required={formData.tag !== "publicacion"}
              />
            </div>

            {/* Previsualización */}
            {formData.archivos.length > 0 && (
              <div className="campo-grupo">
                <h3 className="campo-label">Vista previa:</h3>
                <div className="previsualizacion-grid">
                  {formData.archivos.map((img, index) => (
                    <div key={index} className="previsualizacion-item">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Imagen ${index + 1}`}
                        className="previsualizacion-imagen"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="boton-eliminar-imagen"
                      >
                        <IoMdClose />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fecha + Hora del evento */}
            {formData.tag === "evento" && (
              <>
                <div className="campo-grupo">
                  <label className="campo-label">Fecha del evento:</label>
                  <input
                    type="date"
                    name="fechaEvento"
                    value={formData.fechaEvento}
                    onChange={handleChange}
                    className="campo-input"
                    required
                  />
                </div>

                <div className="campo-grupo">
                  <label className="campo-label">Hora del evento:</label>
                  <input
                    type="time"
                    name="horaEvento"
                    value={formData.horaEvento}
                    onChange={handleChange}
                    className="campo-input"
                    required
                  />
                </div>

                {/* Mapa para seleccionar ubicación del evento */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <MapaUbicacion
                    onLocationSelect={setUbicacion}
                    initialLocation={ubicacion}
                  />
                </div>
              </>
            )}

            {/* Botones desktop */}
            <div className="botones-desktop">
              <button type="button" onClick={onClose} className="boton-volver">
                Volver
              </button>
              <button type="submit" className="boton-publicar">
                Publicar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Alerta de límite de publicaciones */}
      <AlertaLimitePublicaciones 
        show={mostrarAlerta} 
        onClose={() => setMostrarAlerta(false)} 
      />
    </>
  );
};

export default FormularioPublicacion;
