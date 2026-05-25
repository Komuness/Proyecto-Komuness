import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import logo from "../images/logo.png";
import { API_URL } from "../utils/api";
import "../CSS/inicioPrincipal.css";

export const InicioPrincipal = () => {
  const [eslogan, setEslogan] = useState("");
  const [frase, setFrase] = useState("");
  const [redes, setRedes] = useState({
    facebook: "https://www.facebook.com/komuness",
    instagram: "https://www.instagram.com/komunesscr/",
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarContenidoInicio = async () => {
      try {
        setCargando(true);
        const [contenidoRes, acercaRes] = await Promise.all([
          fetch(`${API_URL}/configuracion/inicio-contenido`),
          fetch(`${API_URL}/acerca-de`),
        ]);

        const contenidoData = await contenidoRes.json().catch(() => ({}));
        const acercaData = await acercaRes.json().catch(() => ({}));

        setEslogan(contenidoData?.data?.eslogan || "");
        setFrase(contenidoData?.data?.frase || "");

        setRedes((prev) => ({
          facebook: acercaData?.contactos?.facebook || prev.facebook,
          instagram: acercaData?.contactos?.instagram || prev.instagram,
        }));
      } catch (error) {
        console.error("Error al cargar contenido de inicio:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarContenidoInicio();
  }, []);

  return (
    <main className="inicio-principal-wrapper">
      <section className="inicio-principal-card">
        <img src={logo} alt="Logo Komuness" className="inicio-principal-logo" />
        <h1 className="inicio-principal-eslogan">
          {eslogan || "[Espacio para eslogan de Komuness]"}
        </h1>

        <div className="inicio-principal-frase-box">
          {cargando ? (
            <p>Cargando frase...</p>
          ) : (
            <p>{frase || "Aqui aparecera una frase motivacional creada por administracion."}</p>
          )}
        </div>

        <div className="inicio-principal-redes" aria-label="Redes sociales de Komuness">
          {redes.facebook && (
            <a href={redes.facebook} target="_blank" rel="noreferrer" aria-label="Facebook de Komuness">
              <FaFacebookF />
            </a>
          )}
          {redes.instagram && (
            <a href={redes.instagram} target="_blank" rel="noreferrer" aria-label="Instagram de Komuness">
              <FaInstagram />
            </a>
          )}
        </div>

        <div className="inicio-principal-actions">
          <Link to="/publicaciones" className="inicio-principal-btn">
            Ir a publicaciones
          </Link>
        </div>
      </section>
    </main>
  );
};

export default InicioPrincipal;
