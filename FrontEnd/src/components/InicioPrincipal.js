import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import "../CSS/inicioPrincipal.css";

export const InicioPrincipal = ({ inicioData, acercaData, cargando, heroImage }) => {
  const eslogan = inicioData?.eslogan || "";
  const frase = inicioData?.frase || "";
  const redes = {
    facebook: acercaData?.contactos?.facebook || "https://www.facebook.com/komuness",
    instagram: acercaData?.contactos?.instagram || "https://www.instagram.com/komunesscr/",
  };

  return (
    <main className="hero-wrapper">
      {/* Región del patrón: el mismo fondo del sitio se ve tanto dentro
          como alrededor del cuadro, en un área de tamaño normal (no
          estirada por toda la página) para que no pierda calidad. */}
      <div className="hero-pattern-region">
        <div
          className="hero-frame"
          style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
        >
          <div className="hero-frame-overlay" />
          <span className="hero-frame-word">Komuness</span>
        </div>

        {/* Línea decorativa con un único indicador circular */}
        <div className="hero-divider" aria-hidden="true">
          <span className="hero-divider-line" />
          <span className="hero-divider-dot" />
          <span className="hero-divider-line" />
        </div>
      </div>

      {/* Banda sólida: presentación (título + descripción breve) */}
      <section className="hero-copy-band">
        <div className="hero-copy">
          <h1 className="hero-copy-title">
            {eslogan || "Comunidad, arte y cooperación en un mismo espacio"}
          </h1>
          <p className="hero-copy-text">
            {cargando
              ? "Cargando..."
              : frase ||
                "Aquí aparecerá una frase motivacional creada por administración."}
          </p>

          <div className="hero-copy-redes" aria-label="Redes sociales de Komuness">
            {redes.facebook && (
              <a
                href={redes.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook de Komuness"
              >
                <FaFacebookF />
              </a>
            )}
            {redes.instagram && (
              <a
                href={redes.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de Komuness"
              >
                <FaInstagram />
              </a>
            )}
          </div>

          <Link to="/publicaciones" className="hero-copy-btn">
            Ir a publicaciones
          </Link>

          <span className="hero-copy-divider" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
};

export default InicioPrincipal;