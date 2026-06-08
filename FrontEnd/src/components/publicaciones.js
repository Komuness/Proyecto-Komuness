// src/components/publicaciones.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { toast } from "react-hot-toast";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "../CSS/publicaciones.css";

import PublicacionCard from "./publicacionCard";
import EventoCard from "./eventoCard";
import FormularioPublicacion from "../pages/formulario";
import PublicacionModal from "./publicacionModal";
import { useAuth } from "./context/AuthContext";
import CategoriaFilter from "./generic/categoriaFilter";
import BuscadorPublicaciones from "./buscadorPublicaciones";
import AlertaLimitePublicaciones from "./AlertaLimitePublicaciones";
import { API_URL } from "../utils/api";
import LimitePublicaciones from "./limiteDePublicaciones";
import PublicidadModal from "./publicidadModal";
import DateFilter from "./generic/dateFilter";
import PriceFilter from "./generic/priceFilter";

// Base de API robusta (evita /api/api)
const RAW = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const BASE = (RAW || "").replace(/\/+$/, "");
const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export const Publicaciones = ({ tag: propTag }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [mostrar, setMostrar] = useState(0);
  const [cards, setCards] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tag, setTag] = useState(propTag);
  const limite = 12;
  const [formulario, setFormulario] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  const { user } = useAuth();
  const [publicaciones, setPublicaciones] = useState([]);

  const categoriaFilter = searchParams.get("categoria");
  const searchTerm = searchParams.get("q");
  const fechaFilter = searchParams.get("fecha");
  const precioMin = searchParams.get("precioMin");
  const precioMax = searchParams.get("precioMax");

  const isSearch = searchParams.get("search") === "true";
  const searchFilter = isSearch ? searchTerm : null;
  const [limiteData, setLimiteData] = useState(null);
  const [selectedPub, setSelectedPub] = useState(null);

  //Estado del banco de profesionales
  const [estadoUsuario, setEstadoUsuario] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);

  // para PUBLICIDAD
  const [mostrarModalPublicidad, setMostrarModalPublicidad] = useState(false);
  const [publicidadEditando, setPublicidadEditando] = useState(null); // null = crear desde cero, objeto = editar publicidad
  const [publicidad, setPublicidad] = useState([]);
  const [currentPublicidadIndex, setCurrentPublicidadIndex] = useState(0);

  //Variables de Usuario
  const UserType = {
    SUPERADMIN: 0,
    ADMIN: 1,
    BASIC: 2,
  };

  const esAdmin = [UserType.SUPERADMIN, UserType.ADMIN].includes(
    Number(user?.tipoUsuario),
  );

  useEffect(() => {
    fetchPublicidad();
  }, []);

  // Pasar la publicidad automaticamente
  useEffect(() => {
    if (!publicidad || publicidad.length <= 1) return;
    const interval = setInterval(() => {
      nextPublicidad();
    }, 10000);
    return () => clearInterval(interval);
  }, [publicidad, currentPublicidadIndex]);

  useEffect(() => {
    const path = location.pathname;
    let newTag = propTag;

    if (path === "/eventos") {
      setMostrar(0);
      newTag = "evento";
    } else if (path === "/emprendimientos") {
      setMostrar(1);
      newTag = "emprendimiento";
    } else if (path === "/publicaciones") {
      setMostrar(2);
      newTag = "publicacion";
    } else if (path === "/perfilUsuario") {
      setMostrar(3);
      newTag = null;
    }

    setTag(newTag);
  }, [location.pathname, propTag]);

  useEffect(() => {
    if (tag)
      obtenerPublicaciones(tag, 1, limite, searchFilter, {
        categoria: categoriaFilter,
        fecha: fechaFilter,
        precioMin: precioMin,
        precioMax: precioMax,
      });
  }, [tag, categoriaFilter, searchFilter, fechaFilter, precioMin, precioMax]);

  useEffect(() => {
    if (mostrar === 3) {
      setCards(publicaciones);
    } else {
      const newCards = publicaciones.filter((p) => {
        if (mostrar === 0) return p.tag === "evento";
        if (mostrar === 1) return p.tag === "emprendimiento";
        return p.tag === "publicacion";
      });
      setCards(newCards);
    }
  }, [mostrar, publicaciones]);

  const obtenerPublicaciones = async (
    tag,
    page = 1,
    limit = limite,
    searchTerm = null,
    filters = {
      categoria: null,
      fecha: null,
      precioMin: null,
      precioMax: null,
    },
  ) => {
    try {
      const offset = (page - 1) * limit;

      let url;
      let params;

      if (searchTerm) {
        //  Usar search/advanced en lugar de /buscar para que popule categorías
        url = `${API}/publicaciones/search/advanced`;
        params = new URLSearchParams({
          q: searchTerm,
          offset: String(offset),
          limit: String(limit),
        });
      } else {
        // Usar búsqueda normal por tag
        url = `${API}/publicaciones`;
        params = new URLSearchParams({
          tag: tag || "",
          offset: String(offset),
          limit: String(limit),
          publicado: "true",
        });
      }
      // Agregar filtros
      for (const filter in filters) {
        if (filters[filter]) {
          params.set(filter, filters[filter]);
        }
      }
      const resp = await fetch(`${url}?${params.toString()}`);
      if (resp.status === 404) {
        setPublicaciones([]);
        setPaginaActual(1);
        setTotalPaginas(1);
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }

      const data = await resp.json();

      // Para search/advanced, la estructura es { data: [], pagination: {} }
      setPublicaciones(data.data || []);
      setPaginaActual(page);
      setTotalPaginas(data.pagination?.pages ?? 1);
    } catch (error) {
      console.error("Error al obtener publicaciones:", error);
      setPublicaciones([]);
      setPaginaActual(1);
      setTotalPaginas(1);
    }
  };

  const fetchPublicidad = async () => {
    try {
      const response = await fetch(`${API_URL}/publicidad/get-publicidades`);
      if (!response.ok) {
        console.log(response);
        throw new Error("Error al cargar publicidad");
      }

      const data = await response.json();
      setPublicidad(data.data || []);
      console.log(data.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar publicidad");
    }
  };

  /////////////////// MODAL publicidad
  const abrirModalCrearPublicidad = () => {
    setPublicidadEditando(null);
    setMostrarModalPublicidad(true);
  };

  const abrirModalEditarPublicidad = (p) => {
    setPublicidadEditando(p);
    setMostrarModalPublicidad(true);
  };

  const cerrarModalPublicidad = () => {
    setPublicidadEditando(null);
    setMostrarModalPublicidad(false);
  };

  const nextPublicidad = () => {
    setCurrentPublicidadIndex((prev) =>
      prev === publicidad.length - 1 ? 0 : prev + 1,
    );
  };

  const prevPublicidad = () => {
    setCurrentPublicidadIndex((prev) =>
      prev === 0 ? publicidad.length - 1 : prev - 1,
    );
  };
  const handleSubmitPublicidad = async ({
    imagen,
    descripcion,
    fechaCaducidad,
    autor,
    activa,
    publicacionRelacionada,
  }) => {
    try {
      const modoCrear = publicidadEditando == null;
      const petition_url = modoCrear
        ? `${API_URL}/publicidad/create-publicidad`
        : `${API_URL}/publicidad/update-publicidad/${publicidadEditando._id}`;
      const method = modoCrear ? "POST" : "PUT";

      const formData = new FormData();

      if (imagen instanceof File) {
        formData.append("imagen", imagen);
      }
      formData.append("descripcion", descripcion);
      formData.append("fechaCaducidad", fechaCaducidad);
      formData.append("autor", autor);
      formData.append("activa", activa);

      if (publicacionRelacionada) {
        formData.append("publicacionRelacionada", publicacionRelacionada);
      }

      const res = await fetch(petition_url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.ok) {
        toast.success(
          modoCrear ? "Publicidad creada" : "Publicidad actualizada",
        );
        cerrarModalPublicidad();
        fetchPublicidad();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error al guardar la publicidad");
      }
    } catch (e) {
      console.error("ERROR PUBLICIDAD: ", e);
      toast.error("Error al guardar la publicidad");
    }
  };

  const handleDeletePublicidad = async (pub) => {
    if (!window.confirm("¿Está seguro de que quiere eliminar esta publicidad?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/publicidad/delete-publicidad/${pub._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (response.ok) {
        toast.success("Tutorial eliminado");
        if (currentPublicidadIndex >= publicidad.length - 1) {
          setCurrentPublicidadIndex(Math.max(0, publicidad.length - 2));
        }
        fetchPublicidad();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al eliminar la publicidad");
      }
    } catch (e) {
      toast.error("Error al eliminar la publicidad");
      console.error(e);
    }
  };

  const handlePagination = (newPage) => {
    obtenerPublicaciones(tag, newPage, limite, searchFilter, {
      categoria: categoriaFilter,
      fecha: fechaFilter,
      precioMin: precioMin,
      precioMax: precioMax,
    });
  };

  const verificarLimite = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const limiteData = data.data;
        // Si está en el límite o lo superó, retornar true
        return limiteData.publicacionesActuales >= limiteData.limite;
      }
      return false;
    } catch (error) {
      console.error("Error al verificar límite:", error);
      return false;
    }
  };

  // Función para cargar datos del límite de publicaciones del usuario
  const cargarDatosLimite = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLimiteData(data.data);
      }
    } catch (error) {
      console.error("Error al cargar datos de límite:", error);
    }
  };

  const handleCrearPublicacion = async () => {
    if (!user) {
      navigate("/iniciarSesion");
      return;
    }

    // Bypass inmediato para admin/superadmin
    const tipoUsuario = Number(user?.tipoUsuario);
    if (tipoUsuario === 0 || tipoUsuario === 1) {
      setFormulario(true);
      return;
    }

    const limiteAlcanzado = await verificarLimite();
    if (limiteAlcanzado) {
      setShowLimitAlert(true);
    } else {
      setFormulario(true);
    }
  };

  useEffect(() => {
    // Verificar si el usuario está en el banco
    const cargarEstadoUsuario = async () => {
      if (!user) return;

      try {
        setCargandoEstado(true);
        const response = await fetch(`${API_URL}/banco-profesionales/estado`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEstadoUsuario(data.data);
        }
      } catch (error) {
        console.error("Error al cargar estado:", error);
      } finally {
        setCargandoEstado(false);
      }
    };

    cargarEstadoUsuario();

    //Datos límite
    if (user) {
      cargarDatosLimite();
    }
  }, [user]);

  return (
    <div className="bg-gray-800/80 min-h-screen">
      <div className="relative">
        {/* Contenedor para filtros y buscador */}
        <div className="bg-blue-900">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Buscador */}
              <BuscadorPublicaciones />

              {/* Filtro de categorías */}
              <CategoriaFilter />

              {/* Filtro de fecha de evento/publicación */}
              <DateFilter />

              {/* Filtro para precio regular */}
              {tag !== "publicacion" && <PriceFilter />}
            </div>

            {limiteData && tag === "publicacion" && !esAdmin && (
              <div className="basis-full md:basis-auto w-full md:w-auto flex justify-center md:justify-end">
                <div className="w-full max-w-md">
                  <LimitePublicaciones limiteData={limiteData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*PUBLICIDAD*/}
      <div className="w-full flex flex-col items-center justify-center gap-2 py-4 mt-4 rounded-xl bg-white/10">
        {publicidad && publicidad.length > 0 && (
          <div className="w-full max-w-[1920px] relative bg-gray-800 rounded-2xl shadow-2xl overflow-hidden py-4">
            {/*CARRUSEL*/}
            <div className="relative w-[1920px] h-[540px] max-w-full mx-auto rounded-xl">
              {/*Imagen*/}
              <img
                src={publicidad[currentPublicidadIndex]?.imagen}
                alt="Publicidad"
                className="w-full h-full object-cover"
              />
              {/*Flechas*/}
              {publicidad.length > 1 && (
                <>
                  <button
                    onClick={prevPublicidad}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  >
                    <FaChevronLeft />
                  </button>

                  <button
                    onClick={nextPublicidad}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  >
                    <FaChevronRight />
                  </button>
                </>
              )}
            </div>
            {/*Descripcion*/}
            <div className="mt-6 text-center">
              <p className="text-gray-200 text-lg">
                {" "}
                {publicidad[currentPublicidadIndex]?.descripcion}{" "}
              </p>
            </div>
            {/* Indicadores */}
            {publicidad.length > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {publicidad.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPublicidadIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentPublicidadIndex
                        ? "bg-white scale-125"
                        : "bg-gray-500 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            )}

            {/*EDITAR Y BORRAR SOLO PARA ADMINS*/}
            {esAdmin && (
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() =>
                    abrirModalEditarPublicidad(
                      publicidad[currentPublicidadIndex],
                    )
                  }
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                >
                  Editar
                </button>

                <button
                  onClick={() =>
                    handleDeletePublicidad(publicidad[currentPublicidadIndex])
                  }
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}

        {/*BOTON DE AGREGAR PUBLICIDAD SOLO PARA ADMINS*/}
        {esAdmin && (
          <div className="max-w-6xl px-4 py-2 text-white">
            <div>
              <button
                onClick={() => abrirModalCrearPublicidad()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-4 rounded-lg shadow"
              >
                + Agregar Publicidad
              </button>
            </div>

            {mostrarModalPublicidad && (
              <PublicidadModal
                publicidad={publicidadEditando}
                onClose={cerrarModalPublicidad}
                onSubmit={handleSubmitPublicidad}
              />
            )}
          </div>
        )}
      </div>

      {/* Mensaje de búsqueda */}
      {searchFilter && (
        <div className="px-4 pt-4">
          <div className="bg-blue-100 border border-blue-300 rounded p-3">
            <p className="text-blue-800 text-sm">
              Mostrando resultados para: <strong>"{searchFilter}"</strong>
              {publicaciones.length === 0 && " - No se encontraron resultados"}
            </p>
          </div>
        </div>
      )}

      <div
        className={
          tag === "evento" ? "evento-card-container" : "card-container"
        }
      >
        {cards.length === 0 ? (
          <p className="text-white">
            {searchFilter
              ? "No hay publicaciones que coincidan con tu búsqueda."
              : "No hay publicaciones para mostrar."}
          </p>
        ) : (
          cards.map((publicacion) =>
            tag === "evento" ? (
              <EventoCard
                key={publicacion._id}
                publicacion={publicacion}
                onDeleteClick={(pub) => setSelectedPub(pub)}
              />
            ) : (
              <PublicacionCard
                key={publicacion._id}
                publicacion={publicacion}
                onDeleteClick={(pub) => setSelectedPub(pub)}
              />
            ),
          )
        )}
      </div>

      <PublicacionModal
        name={selectedPub?.titulo}
        date={selectedPub?.fecha}
        tag={selectedPub?.tag}
        id={selectedPub?._id}
        isOpen={!!selectedPub}
        onClose={() => setSelectedPub(null)}
      />

      <div className="w-full flex justify-center mt-6 gap-2 flex-wrap pb-6">
        {paginaActual > 1 && (
          <button
            onClick={() => handlePagination(paginaActual - 1)}
            className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            « Anterior
          </button>
        )}

        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === totalPaginas ||
              (p >= paginaActual - 2 && p <= paginaActual + 2),
          )
          .map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && p - arr[i - 1] > 1 && (
                <span className="px-2 py-1 text-gray-500">...</span>
              )}
              <button
                onClick={() => handlePagination(p)}
                className={`px-3 py-1 rounded text-sm ${p === paginaActual ? "bg-[#5445FF] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}

        {paginaActual < totalPaginas && (
          <button
            onClick={() => handlePagination(paginaActual + 1)}
            className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Siguiente »
          </button>
        )}
      </div>

      {(esAdmin || estadoUsuario?.enBancoProfesionales) && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-3">
          <span className="hidden md:block bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700">
            Inspira a otros con tu talento
          </span>

          <button
            onClick={handleCrearPublicacion}
            className="bg-yellow-500 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:bg-yellow-700 transition-all duration-300 flex items-center justify-center text-2xl"
          >
            +
          </button>
        </div>
      )}

      <AlertaLimitePublicaciones
        show={showLimitAlert}
        onClose={() => setShowLimitAlert(false)}
      />

      <FormularioPublicacion
        isOpen={formulario}
        onClose={() => setFormulario(false)}
        openTag={tag}
      />
    </div>
  );
};

export default Publicaciones;
