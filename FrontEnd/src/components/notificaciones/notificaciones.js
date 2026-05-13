import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";

const Notificaciones = ({
  open = true,
  setOpen = () => {},
  standalone = false,
  onCountChange,
}) => {
  const navigate = useNavigate();
  const [ntfs, setNtfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usuarioLogueado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (_e) {
      return null;
    }
  }, []);

  const token = localStorage.getItem("token");
  const userId = usuarioLogueado?._id;

  const syncCount = useCallback(
    (list) => {
      const count = Array.isArray(list) ? list.length : 0;
      if (typeof onCountChange === "function") {
        onCountChange(count);
      }
      window.dispatchEvent(
        new CustomEvent("notifications-count-changed", { detail: count })
      );
    },
    [onCountChange]
  );

  const cargarNotificaciones = useCallback(async () => {
    if (!token || !userId) {
      setNtfs([]);
      syncCount([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/notificaciones`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          payload?.message || "No se pudieron cargar las notificaciones"
        );
      }

      const lista = Array.isArray(payload?.data) ? payload.data : [];
      setNtfs(lista);
      syncCount(lista);
    } catch (err) {
      setError(err?.message || "Error al cargar notificaciones");
      setNtfs([]);
      syncCount([]);
    } finally {
      setLoading(false);
    }
  }, [token, userId, syncCount]);

  useEffect(() => {
    if (standalone || open) {
      cargarNotificaciones();
    }
  }, [open, standalone, cargarNotificaciones]);

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleString("es-CR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const eliminarNotificacion = async (id, options = {}) => {
    const { silent = false } = options;
    if (!token || !id) return false;

    const prev = ntfs;
    const next = prev.filter((ntf) => ntf._id !== id);
    setNtfs(next);
    syncCount(next);

    try {
      const res = await fetch(`${API_URL}/notificaciones/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar la notificación");
      }
      return true;
    } catch (_err) {
      setNtfs(prev);
      syncCount(prev);
      if (!silent) {
        setError("No se pudo eliminar la notificación");
      }
      return false;
    }
  };

  const handleNotificacionClick = async (ntf) => {
    await eliminarNotificacion(ntf._id, { silent: true });

    const publicacionId =
      typeof ntf.publicacionId === "object"
        ? ntf.publicacionId?._id
        : ntf.publicacionId;

    if (!standalone) {
      setOpen(false);
    }

    if (publicacionId) {
      navigate(`/publicaciones/${publicacionId}`);
    }
  };

  const closePanel = () => {
    setOpen(false);
  };

  if (!standalone && !open) return null;

  const containerClass = standalone
    ? "w-full max-w-3xl mx-auto mt-4 p-4"
    : "absolute inset-0 z-[9999] flex justify-end h-full items-start pt-4 sm:pt-6 md:pt-20 shadow-xl transition-transform duration-300";

  const panelClass = standalone
    ? "bg-blue-900 border-2 border-slate-600 w-full shadow-xl max-h-[75vh] overflow-y-auto p-4 rounded-xl"
    : "bg-blue-900 border-2 border-slate-600 w-full sm:w-[380px] max-w-[95vw] mr-2 sm:mr-4 shadow-xl max-h-[90vh] overflow-y-auto p-4 rounded-xl";

  return (
    <div
      className={containerClass}
      onClick={!standalone ? closePanel : undefined}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Notificaciones</h2>

          {!standalone && (
            <button onClick={closePanel}>
              <AiOutlineClose className="w-5 h-5" />
            </button>
          )}
        </div>

        {!token || !userId ? (
          <p className="text-sm text-slate-200">
            Inicia sesión para ver tus notificaciones.
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-200">Cargando notificaciones...</p>
        ) : error ? (
          <p className="text-sm text-red-200">{error}</p>
        ) : ntfs.length === 0 ? (
          <p className="text-sm text-slate-200">No tienes notificaciones.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ntfs.map((ntf) => (
              <div
                className="p-3 rounded-lg cursor-pointer bg-slate-700 border border-blue-500"
                key={ntf._id}
                onClick={() => handleNotificacionClick(ntf)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p>
                      <span className="font-bold">{ntf.nombre}:</span>{" "}
                      {ntf.descripcion}
                    </p>
                    <p className="text-sm">Fecha: {formatFecha(ntf.createdAt)}</p>
                  </div>

                  <button
                    className="text-slate-100 hover:text-red-300 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarNotificacion(ntf._id);
                    }}
                    aria-label="Eliminar notificación"
                    title="Eliminar notificación"
                  >
                    <AiOutlineClose className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;
