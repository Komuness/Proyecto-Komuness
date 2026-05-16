const hasSessionStorage = () => {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
};

export const readSessionDraft = (key, fallbackValue = null) => {
  if (!hasSessionStorage() || !key) return fallbackValue;

  try {
    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) return fallbackValue;
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

export const writeSessionDraft = (key, value) => {
  if (!hasSessionStorage() || !key) return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar errores de storage (modo privado/cuota excedida)
  }
};

export const removeSessionDraft = (key) => {
  if (!hasSessionStorage() || !key) return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignorar errores de storage
  }
};
