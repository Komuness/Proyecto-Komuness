import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiStar, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { API_URL } from '../utils/api';
import { useFormShortcuts } from '../hooks/useFormShortcuts';

const AlertaLimitePublicaciones = ({ show, onClose }) => {
  const navigate = useNavigate();
  const [limiteData, setLimiteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) {
      cargarDatosLimite();
    }
  }, [show]);

  const cargarDatosLimite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLimiteData(data.data);
      }
    } catch (error) {
      console.error('Error al cargar datos de límite:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarPremium = () => {
    onClose();
    navigate('/checkout-premium');
  };

  useFormShortcuts({ isOpen: show, onClose });

  if (!show) return null;

  const porcentajeUso = limiteData 
    ? Math.round((limiteData.publicacionesActuales / limiteData.limite) * 100) 
    : 0;

  // Determinar si es usuario premium
  const esPremium = limiteData?.tipoUsuario === 3;
  
  // Formatear fecha de vencimiento
  const fechaVencimientoFormateada = limiteData?.fechaVencimientoPremium
    ? new Date(limiteData.fechaVencimientoPremium).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const beneficiosPremium = [
    'Publicaciones adicionales tanto en eventos como en emprendimientos',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className={`p-6 relative ${esPremium ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <FiX size={24} />
          </button>
          
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              {esPremium ? <FiClock size={32} /> : <FiAlertCircle size={32} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {esPremium ? '¡Ya eres Premium!' : '¡Límite Alcanzado!'}
              </h2>
              <p className="text-sm opacity-90">
                {esPremium ? 'Información de tu plan' : 'Actualiza a Premium'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <>
              {/* Mensaje especial para premium */}
              {esPremium && (
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiStar className="text-yellow-600" size={20} />
                    <h3 className="font-bold text-gray-800">¡Ya eres Premium!</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    Disfruta de todos los beneficios de tu plan {limiteData.plan === 'anual' ? 'anual' : 'mensual'}.
                  </p>
                  
                  {fechaVencimientoFormateada && (
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <div className="flex items-center gap-2 text-sm">
                        <FiClock className="text-yellow-600" size={16} />
                        <span className="text-gray-700">
                          Tu plan se vence el{' '}
                          <span className="font-bold text-yellow-700">
                            {fechaVencimientoFormateada}
                          </span>
                        </span>
                      </div>
                      
                      {limiteData.premiumVencido && (
                        <p className="text-red-600 text-sm mt-2 font-semibold">
                          ⚠️ Tu plan premium ha vencido. Por favor, renueva tu suscripción.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Publicaciones Usadas</span>
                  <span>
                    {limiteData?.publicacionesActuales || 0} / {limiteData?.limite || 0}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      porcentajeUso >= 100
                        ? 'bg-red-500'
                        : porcentajeUso >= 80
                        ? 'bg-yellow-500'
                        : esPremium ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                  ></div>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  {limiteData && porcentajeUso >= 100
                    ? '¡Has alcanzado tu límite de publicaciones!'
                    : limiteData
                    ? `Estás usando el ${porcentajeUso}% de tu límite`
                    : 'Actualiza para obtener más publicaciones'}
                </p>
              </div>

              {/* Beneficios Premium (solo mostrar si no es premium o si está vencido) */}
              {(!esPremium || limiteData?.premiumVencido) && (
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiStar className="text-yellow-600" size={20} />
                    <h3 className="font-bold text-gray-800">Beneficios Premium</h3>
                  </div>
                  
                  <ul className="space-y-2">
                    {beneficiosPremium.map((beneficio, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <FiCheck className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                        <span>{beneficio}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tipo de usuario actual */}
              {limiteData?.tipoUsuario && (
                <div className="text-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-lg">
                  Plan actual: <span className="font-semibold">
                    {esPremium 
                      ? `Premium ${limiteData.plan === 'anual' ? 'Anual' : 'Mensual'}`
                      : limiteData.tipoUsuario}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Botones */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors duration-200"
          >
            Cerrar
          </button>
          
          {/* Cambiar texto del botón según el estado */}
          <button
            onClick={handleActualizarPremium}
            className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
              esPremium && !limiteData?.premiumVencido
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white'
            }`}
          >
            <FiStar size={18} />
            {esPremium && !limiteData?.premiumVencido ? 'Renovar Plan' : 'Actualizar a Premium'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertaLimitePublicaciones;
