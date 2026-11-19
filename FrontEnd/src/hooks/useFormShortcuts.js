import { useEffect, useRef } from "react";

export const useFormShortcuts = ({
  isOpen = true,
  enabled = true,
  onSave,
  onClose,
} = {}) => {
  const onSaveRef = useRef(onSave);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !enabled) return undefined;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;

      const key = (event.key || "").toLowerCase();

      if (key === "escape") {
        if (!onCloseRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (key === "s" || key === "enter")
      ) {
        if (!onSaveRef.current) return;
        event.preventDefault();
        onSaveRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, enabled]);
};
