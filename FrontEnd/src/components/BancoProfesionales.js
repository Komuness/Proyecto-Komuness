import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, API_URL, PROFESIONALES_API_URL } from '../utils/api'; // AGREGAR PROFESIONALES_API_URL
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';
import { AiOutlineUser } from "react-icons/ai";
import { 
  FaSearch, 
  FaListAlt,
  FaHistory,
  FaEdit,
  FaUser, 
  FaBriefcase, 
  FaMapMarkerAlt, 
  FaEye, 
  FaSignInAlt, 
  FaSignOutAlt,
  FaTimes,
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';
import '../CSS/bancoProfesionales.css';

const BancoProfesionales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profesionales, setProfesionales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoUsuario, setEstadoUsuario] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [cargandoToggle, setCargandoToggle] = useState(false);
  const [activeTab, setActiveTab] = useState("profesionales");

  const usuariosFiltrados = usuarios.data?.filter((item) => {
    const texto = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(texto) ||
      item.apellido?.toLowerCase().includes(texto) ||
      item.email?.toLowerCase().includes(texto)
    );
  });

  // Cargar profesionales - USAR PROFESIONALES_API_URL
  const cargarProfesionales = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales${queryParams}`); 
      
      if (!response.ok) throw new Error('Error al cargar profesionales');
      
      const data = await response.json();
      setProfesionales(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los profesionales');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuarios
  const cargarUsuarios = useCallback(async (search = '') => {
    if(!user) return;
    try {
      setLoading(true);

      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(
        `${API_URL}/usuario/public`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsuarios(data);

    } catch (error) {
      console.error(error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar estado del usuario actual - USAR PROFESIONALES_API_URL
  const cargarEstadoUsuario = useCallback(async () => {
    if (!user) return;
    
    try {
      setCargandoEstado(true);
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/estado`, { 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEstadoUsuario(data.data);
      }
    } catch (error) {
      console.error('Error al cargar estado:', error);
    } finally {
      setCargandoEstado(false);
    }
  }, [user]);

  // Toggle unirse/retirarse - USAR PROFESIONALES_API_URL
  const toggleUnirseBanco = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para esta acción');
      navigate('/iniciarSesion');
      return;
    }

    //Verificar si puede unirse según el perfil público
    if (!estadoUsuario?.enBancoProfesionales && !esAdmin){
      const returnData = await cargarDatosUsuario();

      if(returnData === false){
        return;
      }
    }

    try {
      setCargandoToggle(true);
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/toggle`, { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar estado');
      }

      const data = await response.json();
      setEstadoUsuario(data.data);
      toast.success(data.message);
      
      // Recargar lista si se unió o retiró
      cargarProfesionales(searchTerm);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setCargandoToggle(false);
    }
  };

  // Quitar del banco (admin) - USAR PROFESIONALES_API_URL
const quitarDelBanco = async (perfilId) => {
  if (!window.confirm('¿Estás seguro de que quieres quitar a este profesional del banco?')) {
    return;
  }

  try {
    const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/${perfilId}/quitar`, { 
      method: 'PUT', 
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Error al quitar del banco');
    }

    toast.success('Profesional retirado del banco exitosamente');
    
    // Recargar lista
    cargarProfesionales(searchTerm);
  } catch (error) {
    console.error('Error detallado:', error);
    toast.error(error.message || 'Error al retirar del banco');
  }
};

  //Buscar la información del usuario para verificar que tiene información suficiente para unirse al banco
  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/perfil/usuario/elegibilidad-banco`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar el perfil');
      }

      //Revisa si puede unirse al banco e imprime el mensaje de faltantes
      if (!data.success){
        ImprimirErroresDePerfil(data?.data);
        return false;
      } 

      //Retorna verdadero si todo sale bien
      return true;

    } catch (error) {
      toast.error(error?.message);
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  //Imprime lo que hace falta
  const ImprimirErroresDePerfil = async (data) => {
    toast(
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          ⚠️ Te falta en tu perfil:
        </div>

        <ul style={{paddingLeft: 18, listStyleType: 'disc' }}>
          {data?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>,
      {
        className: 'toast-warning'
      }
    );
  };

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    if(activeTab !== 'profesionales') return;

    const timeoutId = setTimeout(() => {
      cargarProfesionales(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, cargarProfesionales]);

  // Cargar estado del usuario al montar
  useEffect(() => {
    cargarEstadoUsuario();
  }, [cargarEstadoUsuario]);

  // Cargar usuarios al montar
  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

  return (
    <div className="banco-profesionales-container">
      {/* Header */}
      <div className="banco-header">
        <div className="banco-title-section">
          <h1>Banco de Profesionales</h1>
          <p>Encuentra profesionales calificados en nuestra comunidad</p>
        </div>

        {/* Toggle para unirse/retirarse */}
        {user && (
          <div className="banco-toggle-section">
            {cargandoEstado ? (
              <div className="estado-cargando">
                <FaSpinner className="spinner" /> Cargando...
              </div>
            ) : (
              <button
                onClick={toggleUnirseBanco}
                disabled={cargandoToggle}
                className={`btn-toggle ${estadoUsuario?.enBancoProfesionales ? 'unido' : 'no-unido'} ${cargandoToggle ? 'loading' : ''}`}
              >
                {cargandoToggle ? (
                  <FaSpinner className="spinner" />
                ) : estadoUsuario?.enBancoProfesionales ? (
                  <FaSignOutAlt />
                ) : (
                  <FaSignInAlt />
                )}
                {estadoUsuario?.enBancoProfesionales ? 'Retirarse del Banco' : 'Unirse al Banco'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-box flex items-center bg-white border border-gray-300 rounded-lg p-3 relative w-full max-w-md">
          <FaSearch className="text-gray-400 w-4 h-4 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Filtrar por nombre, especialidad, ocupación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-800 py-1"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 text-gray-400 hover:text-gray-600 flex items-center justify-center w-5 h-5"
            >
               <FaTimes className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas para navegación */}
      <div className="flex justify-center">
      <div className="dashboard-tabs w-fit flex flex-wrap gap-2 border-b border-gray-200 pb-2 bg-white px-3 py-2 rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab("profesionales")}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-0 ${
              activeTab === "profesionales"
                ? "bg-gray-200 text-blue-600 shadow-inner"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <AiOutlineUser className="inline w-4 h-4 mr-2" />
            Profesionales
          </button>

          <button
            onClick={() => {
              if (!user) navigate('/iniciarSesion');;
              setActiveTab("usuarios")}
            }
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-0 ${
            activeTab === "usuarios"
              ? "bg-gray-200 text-blue-600 shadow-inner"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          >
            <AiOutlineUser className="inline w-4 h-4 mr-2" />
            Usuarios
          </button>
      </div>
      </div>

      {/* Grid de profesionales/usuarios */}
    {loading ? (
      <div className="loading-container">
        <FaSpinner className="spinner large" />
        <p>
          {activeTab === "profesionales"
            ? "Cargando profesionales..."
            : "Cargando usuarios..."}
        </p>
      </div>
    ) : activeTab === "profesionales" ? (

      // MAP PROFESIONALES 
      profesionales && profesionales.data?.length > 0 ? (
        <div className="profesionales-grid">

          {profesionales.data?.map((item) => (
            <div key={item._id} className="profesional-card">

              {/* HEADER */}
              <div className="card-header">
                <div className="avatar-container">

                  {item.fotoPerfil ? (
                    <img
                      src={`${BASE_URL}${item.fotoPerfil}`}
                      alt={`${item.nombre} ${item.apellidos}`}
                      className="avatar"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const placeholder = e.target.nextSibling;
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                      onLoad={(e) => {
                        const placeholder = e.target.nextSibling;
                        if (placeholder) placeholder.style.display = "none";
                      }}
                    />
                  ) : null}

                  <div
                    className={`avatar-placeholder ${
                      item.fotoPerfil ? "hidden" : ""
                    }`}
                  >
                    <FaUser />
                  </div>

                </div>
                
                {esAdmin && (
                  <button
                    onClick={() => quitarDelBanco(item._id)}
                    className="btn-quitar-admin"
                    title="Quitar del banco"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* BODY */}
              <div className="card-body">
                <h3 className="profesional-name">
                  {item.nombre} {item.apellidos}
                </h3>

                {item.ocupacionPrincipal && (
                  <p className="profesional-ocupacion">
                    <FaBriefcase />
                    {item.ocupacionPrincipal}
                  </p>
                )}

                {item.especialidad && (
                  <p className="profesional-especialidad">
                    {item.especialidad}
                  </p>
                )}

                {(item.canton || item.provincia) && (
                  <p className="profesional-ubicacion">
                    <FaMapMarkerAlt />
                    {[item.canton, item.provincia]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="card-actions">
                <button
                  onClick={() =>
                    navigate(`/perfil/${item.usuarioId._id}`)
                  }
                  className="btn-ver-perfil"
                >
                  <FaEye /> Ver Perfil Completo
                </button>
              </div>

            </div>
          ))}

        </div>
      ) : (
        <div className="empty-state">
          <FaUser className="empty-icon mx-auto" />
          <h3>No se encontraron profesionales</h3>

          <p>
            {searchTerm
              ? "No hay profesionales que coincidan con tu búsqueda."
              : "Aún no hay profesionales en el banco."}
          </p>

          {user && !estadoUsuario?.enBancoProfesionales && (
            <button
              onClick={toggleUnirseBanco}
              className="btn-unirse-empty"
            >
              <FaSignInAlt /> Sé el primero en unirte
            </button>
          )}
        </div>
      )

    ) : (

      // MAP USUARIOS
      <div className="tab-table-container mx-auto w-[80%] h-full flex flex-col">
        {usuariosFiltrados && usuariosFiltrados.length > 0 ? (
          <div className="flex-1 overflow-y-auto w-full flex justify-center" style={{ maxHeight: "400px" }}>
            <div className="min-w-full">
              <table className="responsive-table min-w-full">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 min-w-[120px]">
                      Nombre
                    </th>
                    <th className="text-left px-3 py-2 min-w-[120px]">
                      Apellidos
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 break-words min-w-[120px]">
                        {item.nombre || "Sin nombre"}
                      </td>

                      <td className="px-3 py-2 break-words min-w-[120px]">
                        {item.apellido || "Sin apellido"}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No se encontraron usuarios.
          </div>
        )}
      </div>
    )}
    </div>
  );
};

export default BancoProfesionales;
