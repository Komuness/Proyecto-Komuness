// components/adminCategorias.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/api';
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';
import '../CSS/adminCategorias.css'; // Importamos el CSS separado
import { IoMdArrowRoundBack } from "react-icons/io";

export const AdminCategorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '' });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        navigate('/iniciarSesion');
        return;
      }
      
      if (user.tipoUsuario !== 0 && user.tipoUsuario !== 1) {
        toast.error('No tienes permisos para acceder a esta sección');
        navigate('/');
        return;
      }
      
      fetchCategorias();
    };

    checkPermissions();
  }, [user, navigate]);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/categorias`);
      if (!response.ok) throw new Error('Error al cargar categorías');
      
      const data = await response.json();
      setCategorias(data.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      setActionLoading(false);
      return;
    }

    try {
      const url = editingId 
        ? `${API_URL}/categorias/${editingId}`
        : `${API_URL}/categorias`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada');
        setFormData({ nombre: '' });
        setEditingId(null);
        fetchCategorias();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error al guardar la categoría');
      }
    } catch (error) {
      toast.error('Error al guardar la categoría');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/categorias/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Categoría eliminada');
        fetchCategorias();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error al eliminar la categoría');
      }
    } catch (error) {
      toast.error('Error al eliminar la categoría');
    }
  };
  const handleToggle = async (id) => {
    try {
      const response = await fetch(`${API_URL}/categorias/toggle/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Estado actualizado');
        fetchCategorias();
      } else {
        toast.error('Error al actualizar estado');
      }
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Vuelve a la página anterior
  };

  if (loading) {
    return (
      <div className="admin-categorias-loading">
        <div className="text-white">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="admin-categorias-container">
      <div className="admin-categorias-content">
        <div className="admin-categorias-header">
          <button
            onClick={handleGoBack}
            className="admin-categorias-back-btn"
          >
            <IoMdArrowRoundBack color={"black"} size={25} />
          </button>
          <h1 className="admin-categorias-title">Administración de Categorías</h1>
        </div>
        
        {/* Formulario */}
        <div className="admin-categorias-form-container">
          <h2 className="admin-categorias-subtitle">
            {editingId ? 'Editar Categoría' : 'Crear Nueva Categoría'}
          </h2>
          
          <form onSubmit={handleSubmit} className="admin-categorias-form">
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ nombre: e.target.value })}
              placeholder="Nombre de la categoría"
              className="admin-categorias-input"
              required
              disabled={actionLoading}
            />
            <div className="admin-categorias-form-buttons">
              <button 
                type="submit" 
                className="admin-categorias-submit-btn"
                disabled={actionLoading}
              >
                {actionLoading ? 'Procesando...' : (editingId ? 'Actualizar' : 'Crear')}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData({ nombre: '' });
                    setEditingId(null);
                  }}
                  className="admin-categorias-cancel-btn"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de categorías */}
        <div className="admin-categorias-table-container">
          <div className="admin-categorias-table-wrapper">
            <table className="admin-categorias-table">
              <thead className="admin-categorias-table-header">
                <tr>
                  <th className="admin-categorias-th">Nombre</th>
                  <th className="admin-categorias-th">Estado</th>
                  <th className="admin-categorias-th">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria, index) => (
                  <tr key={categoria._id} className={`admin-categorias-tr ${index % 2 === 0 ? 'admin-categorias-tr-even' : 'admin-categorias-tr-odd'}`}>
                    <td className="admin-categorias-td admin-categorias-td-name">
                      {categoria.nombre.toUpperCase()}
                    </td>
                    <td className="admin-categorias-td">
                      <span className={`admin-categorias-status ${categoria.estado ? 'admin-categorias-status-active' : 'admin-categorias-status-inactive'}`}>
                        {categoria.estado ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="admin-categorias-td">
                      <div className="admin-categorias-actions">
                        <button
                          onClick={() => {
                            setFormData({ nombre: categoria.nombre });
                            setEditingId(categoria._id);
                          }}
                          className="admin-categorias-edit-btn"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(categoria._id)}
                          className="admin-categorias-delete-btn"
                        >
                          {categoria.estado ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {categorias.length === 0 && (
            <div className="admin-categorias-empty">
              No hay categorías registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategorias;
