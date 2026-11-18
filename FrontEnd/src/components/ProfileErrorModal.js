import '../CSS/profileErrorModal.css';
import { useFormShortcuts } from '../hooks/useFormShortcuts';

const ProfileErrorModal = ({ isOpen, onClose, type = 'private' }) => {
  useFormShortcuts({ isOpen, onClose });

  if (!isOpen) return null;

  const config = {
    private: {
      title: 'Perfil no disponible',
      message: 'Este usuario ha configurado su perfil como privado.',
      submessage: 'Los perfiles privados solo son visibles para el propietario.',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    notFound: {
      title: 'Perfil no encontrado',
      message: 'El perfil de este usuario no existe o ha sido eliminado.',
      submessage: 'Puede que el usuario haya eliminado su cuenta.',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  };

  const { title, message, submessage, gradient } = config[type];

  return (
    <div className="profile-error-modal-overlay">
      <div className="profile-error-modal-card" style={{ background: gradient }}>
        <div className="profile-error-modal-icon">
          <svg className="profile-error-modal-icon-svg" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3 className="profile-error-modal-title">{title}</h3>
        <p className="profile-error-modal-message">{message}</p>
        <p className="profile-error-modal-submessage">{submessage}</p>
        <button className="profile-error-modal-close-btn" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
};

export default ProfileErrorModal;