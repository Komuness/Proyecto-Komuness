import { useEffect, useState } from "react";
import { InicioPrincipal } from "./InicioPrincipal";
import { QuienesSomosSection } from "./QuienesSomosSection";
import { API_URL } from "../utils/api";

export const PantallaInicio = () => {
  const [inicioData, setInicioData] = useState(null);
  const [acercaData, setAcercaData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargarTodo = async () => {
      try {
        setCargando(true);
        const [contenidoRes, acercaRes] = await Promise.all([
          fetch(`${API_URL}/configuracion/inicio-contenido`),
          fetch(`${API_URL}/acerca-de`),
        ]);

        const contenidoData = await contenidoRes.json().catch(() => ({}));
        const acercaData = await acercaRes.json().catch(() => ({}));

        if (!activo) return;

        setInicioData(contenidoData?.data || {});
        setAcercaData(acercaData || null);
      } catch (error) {
        console.error("Error al cargar la pantalla de inicio:", error);
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarTodo();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <>
      <InicioPrincipal
        inicioData={inicioData}
        acercaData={acercaData}
        cargando={cargando}
      />
      <QuienesSomosSection data={acercaData} />
    </>
  );
};

export default PantallaInicio;