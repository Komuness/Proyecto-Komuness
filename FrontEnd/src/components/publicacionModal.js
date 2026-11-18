import { API_URL } from '../utils/api';
import { useState } from 'react';
import { IoMdAlert } from 'react-icons/io';
import ConfirmDialog from './ConfirmDialog';
import { useFormShortcuts } from '../hooks/useFormShortcuts';

export const PublicacionModal = ({ name, id, isOpen, onClose }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // El diálogo de confirmación maneja sus propios atajos mientras está abierto.
  useFormShortcuts({ isOpen: showSuccess, onClose });

  if (!isOpen && !showSuccess) return null;

  const eliminarPublicacion = async () => {
    try {
      setIsDeleting(true);
      
      // Verificar que tenemos token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No se encontró token de autenticación");
        showErrorMessage("Error de autenticación. Por favor, inicie sesión nuevamente.");
        setIsDeleting(false);
        return;
      }

    

      const res = await fetch(`${API_URL}/publicaciones/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });

    

      if (res.ok) {
        await res.json();
        
        
        setIsDeleting(false);
        
        // Mostrar mensaje de éxito elegante
        setShowSuccess(true);
        
        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          window.location.reload();
        }, 2000);

      } else {
        setIsDeleting(false);
        
        // Leer el error del servidor
        const errorData = await res.text();
        console.error(`Error del servidor (${res.status}):`, errorData);

        if (res.status === 401) {
          showErrorMessage("No tiene permisos para eliminar esta publicación");
        } else if (res.status === 404) {
          showErrorMessage("La publicación no fue encontrada");
        } else {
          showErrorMessage(`Error al eliminar la publicación: ${errorData}`);
        }
      }
    } catch (err) {
      setIsDeleting(false);
      console.error("Error en la solicitud:", err);
      showErrorMessage("Error de conexión. Verifique su conexión a internet e intente nuevamente.");
    }
  };

  const showErrorMessage = (message) => {
    // Crear un toast de error más elegante
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
    errorToast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(errorToast);
    
    // Animación de entrada
    setTimeout(() => {
      errorToast.classList.remove('translate-x-full');
    }, 100);
    
    // Remover después de 4 segundos
    setTimeout(() => {
      errorToast.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 300);
    }, 4000);
  };

  // Modal de confirmación (componente genérico, mismo estilo que el resto)
  if (!showSuccess) {
    return (
      <ConfirmDialog
        dialog={{
          isOpen,
          title: "Borrado definitivo",
          message: (
            <>
              ¿Estás seguro de eliminar la publicación <strong>{name}</strong>?
            </>
          ),
          hint: "Esta acción es permanente y no se puede deshacer.",
          confirmText: isDeleting ? "Eliminando..." : "Eliminar",
          cancelText: "Cancelar",
          tone: "danger",
          icon: <IoMdAlert size={26} />,
          loading: isDeleting,
        }}
        onConfirm={eliminarPublicacion}
        onCancel={onClose}
      />
    );
  }

  // Modal de éxito
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2A2A35] text-white p-8 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,1)] w-[90%] max-w-md text-center animate-pulse">
        <div className="flex flex-col items-center gap-4">
          {/* Icono de éxito con animación */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-green-400">¡Eliminado!</h2>
          <p className="text-gray-300">La publicación se eliminó correctamente</p>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-600 rounded-full h-1 mt-4">
            <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
          <p className="text-xs text-gray-400">Cerrando automáticamente...</p>
        </div>
      </div>
    </div>
  );
};

export default PublicacionModal;