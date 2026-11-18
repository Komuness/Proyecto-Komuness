import { useId } from "react";
import "../CSS/confirmDialog.css";
import { useFormShortcuts } from "../hooks/useFormShortcuts";

/**
 * Diálogo de confirmación reutilizable.
 *
 * Uso:
 * <ConfirmDialog
 *   dialog={{
 *     isOpen,
 *     title,
 *     message,        // string o JSX (ej. con <strong>)
 *     hint,
 *     confirmText,
 *     cancelText,
 *     tone: "primary" | "danger",
 *     icon,           // nodo React opcional
 *     loading,        // deshabilita botones y cierres mientras se procesa
 *     closeOnOverlayClick,
 *   }}
 *   onConfirm={...}
 *   onCancel={...}
 * />
 */
const ConfirmDialog = ({ dialog, onConfirm, onCancel }) => {
  const titleId = useId();
  const messageId = useId();

  const {
    isOpen,
    title,
    message,
    hint,
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    tone = "primary",
    icon,
    loading = false,
    closeOnOverlayClick = true,
  } = dialog || {};

  useFormShortcuts({
    isOpen: !!isOpen && !loading,
    onClose: onCancel,
  });

  if (!isOpen) return null;

  const handleOverlayMouseDown = (event) => {
    if (
      closeOnOverlayClick &&
      !loading &&
      event.target === event.currentTarget
    ) {
      onCancel?.();
    }
  };

  return (
    <div
      className="confirm-dialog-overlay"
      role={tone === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onMouseDown={handleOverlayMouseDown}
    >
      <div className={`confirm-dialog-card confirm-dialog-card--${tone}`}>
        {icon ? <div className="confirm-dialog-icon">{icon}</div> : null}

        <h3 id={titleId} className="confirm-dialog-title">
          {title}
        </h3>

        <div id={messageId} className="confirm-dialog-message">
          {message}
        </div>

        {hint ? <p className="confirm-dialog-hint">{hint}</p> : null}

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
