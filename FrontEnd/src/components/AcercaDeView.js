import { useState } from 'react';
import { 
  FaUsers, 
  FaHistory, 
  FaBullseye, 
  FaEye, 
  FaPhone, 
  FaEnvelope, 
  FaFacebook, 
  FaInstagram,
  FaChevronDown,
  FaChevronUp,
  FaHandHoldingHeart,
  FaDonate,
  FaHandsHelping,
  FaShareAlt,
  FaChevronLeft,
  FaChevronRight,
  FaGraduationCap,
  FaBriefcase,
  FaTrophy,
  FaLink,
  FaWhatsapp,
  FaTimes,
  FaExpand,
  FaEdit
} from 'react-icons/fa';
import '../CSS/AcercaDeView.css';

const AcercaDeView = ({ data, onEdit, isAdmin }) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedMember, setExpandedMember] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const toggleMember = (index) => {
  // Si el miembro ya está expandido, lo cerramos
  // Si es otro miembro, cerramos el actual y abrimos el nuevo
  setExpandedMember(expandedMember === index ? null : index);
  };

  if (!data) return null;

  const handlePhoneClick = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleEmailClick = (email) => {
    window.open(`mailto:${email}`);
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/50685690514');
  };

  // Funciones para el carrusel
  const nextImage = () => {
    if (data.imagenesProyectos && data.imagenesProyectos.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === data.imagenesProyectos.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (data.imagenesProyectos && data.imagenesProyectos.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? data.imagenesProyectos.length - 1 : prevIndex - 1
      );
    }
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Funciones para el modal de imagen
  const openImageModal = (index) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const nextModalImage = () => {
    if (data.imagenesProyectos && data.imagenesProyectos.length > 0) {
      setModalImageIndex((prevIndex) => 
        prevIndex === data.imagenesProyectos.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevModalImage = () => {
    if (data.imagenesProyectos && data.imagenesProyectos.length > 0) {
      setModalImageIndex((prevIndex) => 
        prevIndex === 0 ? data.imagenesProyectos.length - 1 : prevIndex - 1
      );
    }
  };

  const accordionItems = [
    {
      title: "QUÉ HACEMOS Y CÓMO LO HACEMOS",
      icon: <FaHandsHelping className="text-green-500" />,
      content: data.queHacemos || "Información no disponible"
    },
    {
      title: "NUESTRA MOTIVACIÓN",
      icon: <FaHandHoldingHeart className="text-pink-500" />,
      content: data.motivacion || "Información no disponible"
    },
    {
      title: "EL IMPACTO QUE CONSTRUIMOS JUNTOS",
      icon: <FaBullseye className="text-red-500" />,
      content: data.impacto || "Información no disponible"
    },
    {
      title: "NUESTRA HISTORIA",
      icon: <FaHistory className="text-blue-500" />,
      content: data.historia || "Información no disponible"
    },
    {
      title: "MISIÓN",
      icon: <FaBullseye className="text-purple-500" />,
      content: data.mision || "Información no disponible"
    },
    {
      title: "VISIÓN",
      icon: <FaEye className="text-indigo-500" />,
      content: data.vision || "Información no disponible"
    }
  ];

  console.log(data.imagenesProyectos);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Modal para imagen en tamaño completo */}
      {isImageModalOpen && data.imagenesProyectos && data.imagenesProyectos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            {/* Botón cerrar */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-300"
            >
              <FaTimes size={24} />
            </button>

            {/* Botón expandir información (opcional) */}
            <button
              onClick={() => openImageModal(modalImageIndex)}
              className="absolute top-4 left-4 z-10 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-300"
            >
              <FaExpand size={20} />
            </button>

            {/* Imagen en modal */}
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={data.imagenesProyectos[modalImageIndex]}
                alt={`Proyecto ${modalImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error('Error cargando imagen:', data.imagenesProyectos[modalImageIndex]);
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
              
              {/* Botones de navegación en modal */}
              {data.imagenesProyectos.length > 1 && (
                <>
                  <button
                    onClick={prevModalImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full transition-all duration-300"
                  >
                    <FaChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextModalImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full transition-all duration-300"
                  >
                    <FaChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Indicadores en modal */}
            {data.imagenesProyectos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {data.imagenesProyectos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setModalImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === modalImageIndex 
                        ? 'bg-yellow-400 scale-125' 
                        : 'bg-gray-400 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Contador en modal */}
            {data.imagenesProyectos.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg">
                {modalImageIndex + 1} / {data.imagenesProyectos.length}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-yellow-400 via-orange-700 to-red-900">
        <div className="flex  justify-end gap-4 mb-6" >
        {/* Botón a la derecha del título */}
          {isAdmin && onEdit && (
            <button
              onClick={onEdit}
              className="edit-title-button"
              aria-label="Editar información de la sección"
              title="Editar información"
            >
              <FaEdit className="edit-title-icon" />
            </button>
          )}
          </div>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
          
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg text-center">
            {data.titulo}
          </h1>
        </div>
        
        <p className="text-xl text-white opacity-90 max-w-3xl mx-auto text-center">
          Transformando vidas a través del arte, la educación y la cooperación
        </p>
      </div>
    </div>

      <div className="text-center mb-12 p-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-4xl font-bold text-yellow-400">QUIÉNES SOMOS</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-line text-justify text-responsive">
            {data.contenido}
          </p>
        </div>
      </div>

      {/* Carrusel de Proyectos CON MODAL */}
      {data.imagenesProyectos && data.imagenesProyectos.length > 0 && (
        <div className="py-16 bg-gray-800">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8 text-yellow-400">NUESTROS PROYECTOS</h2>
            
            <div className="relative bg-gray-700 rounded-2xl p-4 shadow-2xl">
              {/* Imagen Principal con clases responsivas */}
              <div 
                className="relative h-48 md:h-64 lg:h-96 xl:h-[500px] rounded-lg overflow-hidden cursor-pointer"
                onClick={() => openImageModal(currentImageIndex)}
              >
                <img
                  src={data.imagenesProyectos[currentImageIndex]} 
                  alt={`Proyecto ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    console.error('Error cargando imagen:', data.imagenesProyectos[currentImageIndex]);
                    e.target.src = '/placeholder-image.jpg';
                  }}
                />
                
                {/* Overlay para indicar que es clickeable */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <FaExpand className="inline mr-2" />
                    Ver más grande
                  </div>
                </div>
                
                {/* Botones de Navegación */}
                {data.imagenesProyectos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-300 carousel-nav-button"
                    >
                      <FaChevronLeft className="w-3 h-3 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-300 carousel-nav-button"
                    >
                      <FaChevronRight className="w-3 h-3 md:w-5 md:h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Indicadores */}
              {data.imagenesProyectos.length > 1 && (
                <div className="flex justify-center mt-3 md:mt-4 space-x-1 md:space-x-2 carousel-indicators">
                  {data.imagenesProyectos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                        index === currentImageIndex 
                          ? 'bg-yellow-400 scale-125' 
                          : 'bg-gray-400 hover:bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Contador */}
              {data.imagenesProyectos.length > 1 && (
                <div className="text-center mt-2 text-gray-300 text-sm md:text-base">
                  {currentImageIndex + 1} / {data.imagenesProyectos.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Acordeón de Información */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {accordionItems.map((item, index) => (
          <div key={index} className="mb-6">
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl hover:from-gray-700 hover:to-gray-600 transition-all duration-300 shadow-lg"
            >
              <div className="flex items-center space-x-4">
                {item.icon}
                <span className="text-xl font-semibold text-white">{item.title}</span>
              </div>
              {openAccordion === index ? 
                <FaChevronUp className="text-yellow-400" /> : 
                <FaChevronDown className="text-yellow-400" />
              }
            </button>
            {openAccordion === index && (
              <div className="p-8 bg-gray-700 rounded-b-xl shadow-inner">
                <p className="text-gray-300 leading-relaxed whitespace-pre-line text-justify">
                  {item.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      
      {/* Únete a Nuestra Causa */}
      <div className="py-16 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8 text-white">ÚNETE A NUESTRA CAUSA</h2>
          <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-lg text-white leading-relaxed whitespace-pre-line mb-8">
              {data.uneteCausa}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white bg-opacity-20 p-6 rounded-xl hover:bg-opacity-30 transition-all duration-300">
                <FaHandsHelping className="text-3xl mb-4 mx-auto text-yellow-300" />
                <h3 className="font-semibold text-white mb-2">Sé Voluntario</h3>
                <p className="text-white text-sm opacity-90">Pon tus talentos al servicio de la comunidad</p>
              </div>
              <div className="bg-white bg-opacity-20 p-6 rounded-xl hover:bg-opacity-30 transition-all duration-300">
                <FaDonate className="text-3xl mb-4 mx-auto text-green-300" />
                <h3 className="font-semibold text-white mb-2">Haz una Donación</h3>
                <p className="text-white text-sm opacity-90">Invierte en esperanza y oportunidades concretas</p>
              </div>
              <div className="bg-white bg-opacity-20 p-6 rounded-xl hover:bg-opacity-30 transition-all duration-300">
                <FaUsers className="text-3xl mb-4 mx-auto text-blue-300" />
                <h3 className="font-semibold text-white mb-2">Conviértete en Aliado</h3>
                <p className="text-white text-sm opacity-90">Suma tu organización a esta red de impacto</p>
              </div>
              <div className="bg-white bg-opacity-20 p-6 rounded-xl hover:bg-opacity-30 transition-all duration-300">
                <FaShareAlt className="text-3xl mb-4 mx-auto text-pink-300" />
                <h3 className="font-semibold text-white mb-2">Difunde</h3>
                <p className="text-white text-sm opacity-90">Síguenos en redes y ayuda a correr la voz</p>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* Información de Donaciones */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">FORMAS DE COLABORAR</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Donaciones Monetarias */}
            <div className="bank-info-section">
              <div className="text-center mb-6">
                <FaDonate className="text-4xl mb-4 mx-auto text-yellow-400" />
                <h3 className="text-2xl font-semibold text-white">Donaciones Monetarias</h3>
                <p className="text-gray-300 mt-2">Tu apoyo financiero hace posible nuestro trabajo</p>
              </div>
              
              <div className="space-y-2">
                <div className="bank-item">
                  <span className="bank-label">Cooperativa:</span>
                  <span className="bank-value">Cooperativa Autogestionaria Y De Servicios R.L.</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Cédula Jurídica:</span>
                  <span className="bank-value">{data.informacionDonaciones?.cedulaJuridica}</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Email Finanzas:</span>
                  <span className="bank-value">{data.informacionDonaciones?.emailFinanzas}</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Banco:</span>
                  <span className="bank-value">BANCOPOPULAR</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">IBAN:</span>
                  <span className="bank-value font-mono">{data.informacionDonaciones?.iban}</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Cuenta:</span>
                  <span className="bank-value font-mono">{data.informacionDonaciones?.cuentaBancaria}</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Nombre Cuenta:</span>
                  <span className="bank-value">{data.informacionDonaciones?.nombreCuenta}</span>
                </div>
              </div>
            </div>

            {/* Donaciones en Especie */}
            <div className="bank-info-section">
              <div className="text-center mb-6">
                <FaHandHoldingHeart className="text-4xl mb-4 mx-auto text-green-400" />
                <h3 className="text-2xl font-semibold text-white">Donaciones en Especie</h3>
                <p className="text-gray-300 mt-2">Tu contribución material también hace la diferencia</p>
              </div>
              
              <ul className="space-y-3">
                {data.informacionDonaciones?.donacionesEspecie?.map((item, index) => (
                  <li key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="text-yellow-400 mt-1 flex-shrink-0">•</span>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

          {/* Llamado a la acción */}
          <div className="text-center">
            <p className="text-xl text-white mb-6">
              ¡Cada contribución, grande o pequeña, nos ayuda a seguir transformando vidas!
            </p>
          </div>
      </div>

        

      {/* Contacto  */}
      <div className="py-16 contact-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">CONTÁCTANOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 contact-grid">
            <button
              onClick={() => handlePhoneClick(data.contactos?.telefono)}
              className="contact-item bg-blue-600 hover:bg-blue-700"
            >
              <FaPhone className="text-2xl mb-2 mx-auto text-white" />
              <h3 className="font-semibold text-white mb-1">Llámanos</h3>
              <p className="text-white text-sm opacity-90">{data.contactos?.telefono}</p>
            </button>

            <button
              onClick={() => handleEmailClick(data.contactos?.email)}
              className="contact-item bg-red-600 hover:bg-red-700"
            >
              <FaEnvelope className="text-2xl mb-2 mx-auto text-white" />
              <h3 className="font-semibold text-white mb-1">Escríbenos</h3>
              <p className="text-white text-sm opacity-90">{data.contactos?.email}</p>
            </button>

            <button
              onClick={handleWhatsAppClick}
              className="contact-item bg-green-600 hover:bg-green-700"
            >
              <FaWhatsapp className="text-2xl mb-2 mx-auto text-white" />
              <h3 className="font-semibold text-white mb-1">WhatsApp</h3>
              <p className="text-white text-sm opacity-90">Escríbenos</p>
            </button>

            <div className="contact-item bg-gray-700">
              <h3 className="font-semibold text-white mb-3">Síguenos</h3>
              <div className="flex justify-center space-x-4">
                {data.contactos?.facebook && (
                  <a href={data.contactos.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                    <FaFacebook size={20} />
                  </a>
                )}
                {data.contactos?.instagram && (
                  <a href={data.contactos.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 transition-colors">
                    <FaInstagram size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipo - 4 POR FILA  */}
      {data.equipo && data.equipo.length > 0 && (
        <div className="team-section py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-white mb-4">
                Nuestro Equipo
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Conoce a las personas apasionadas que hacen posible este proyecto
              </p>
            </div>
            
            <div className="team-grid">
              {data.equipo.map((miembro, index) => (
                <div 
                  key={index} 
                  className="team-member"
                >
                  {/* Header - Siempre clickeable */}
                  <div 
                    className="team-member-header cursor-pointer"
                    onClick={() => toggleMember(index)}
                  >
                    {miembro.imagen ? (
                      <img
                        src={miembro.imagen}
                        alt={miembro.nombre}
                        className="team-member-avatar"
                        onError={(e) => {
                          console.error('Error cargando imagen de perfil:', miembro.imagen);
                          e.target.style.display = 'none';
                          const fallbackElement = e.target.parentNode.querySelector('.avatar-fallback');
                          if (fallbackElement) {
                            fallbackElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    
                    {/* Avatar de respaldo */}
                    <div 
                      className={`team-member-avatar bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center ${
                        miembro.imagen ? 'hidden' : ''
                      } avatar-fallback`}
                    >
                      <span className="text-white font-bold text-sm">
                        {miembro.nombre ? miembro.nombre.split(' ').map(n => n[0]).join('') : '?'}
                      </span>
                    </div>
                    
                    <div className="team-member-info">
                      <h3 className="team-member-name">
                        {miembro.nombre}
                      </h3>
                      <p className="team-member-position">
                        {miembro.puesto}
                      </p>
                    </div>
                    <FaChevronDown 
                      className={`text-yellow-400 transition-transform duration-300 flex-shrink-0 mt-2 ${
                        expandedMember === index ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>

                  {/* Descripción básica - SIEMPRE VISIBLE Y COMPLETA */}
                  <div className="team-member-content">
                    <p className="team-member-description-full">
                      {miembro.descripcion}
                    </p>
                  </div>

                  {/* Información expandida - SOLO PARA EL MIEMBRO SELECCIONADO */}
                  {expandedMember === index && (
                    <div className="team-member-expanded">
                      {/* Formación */}
                      {miembro.formacion && miembro.formacion.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FaGraduationCap className="text-blue-400" />
                            <h4 className="font-semibold text-white text-sm">Formación</h4>
                          </div>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {miembro.formacion.map((item, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-yellow-400 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Experiencia */}
                      {miembro.experiencia && miembro.experiencia.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FaBriefcase className="text-green-400" />
                            <h4 className="font-semibold text-white text-sm">Experiencia</h4>
                          </div>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {miembro.experiencia.map((item, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-yellow-400 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Proyectos Destacados */}
                      {miembro.proyectosDestacados && miembro.proyectosDestacados.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FaTrophy className="text-purple-400" />
                            <h4 className="font-semibold text-white text-sm">Proyectos Destacados</h4>
                          </div>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {miembro.proyectosDestacados.map((item, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-yellow-400 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Enlaces */}
                      {miembro.enlaces && miembro.enlaces.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <FaLink className="text-blue-400" />
                            <h4 className="font-semibold text-white text-sm">Enlaces</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {miembro.enlaces.map((enlace, idx) => (
                              <a
                                key={idx}
                                href={enlace.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm transition-colors bg-blue-400/10 px-2 py-1 rounded"
                              >
                                {enlace.nombre}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AcercaDeView;
