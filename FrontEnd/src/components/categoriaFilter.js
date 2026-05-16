// components/categoriaFilter.js
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../utils/api";

export const CategoriaFilter = () => {
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await fetch(`${API_URL}/categorias`);
        const data = await response.json();
        setCategorias(data.data || []);
      } catch (error) {
        console.error("Error al cargar categorÃ­as:", error);
      }
    };

    fetchCategorias();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setSelectedCategoria(searchParams.get("categoria") || "");
  }, [location.search]);

  const handleCategoriaChange = (e) => {
    const categoriaId = e.target.value;
    setSelectedCategoria(categoriaId);

    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    if (categoriaId) {
      searchParams.set("categoria", categoriaId);
    } else {
      searchParams.delete("categoria");
    }

    navigate(`${currentPath}?${searchParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">Categorías</label>
      <select
        value={selectedCategoria}
        onChange={handleCategoriaChange}
        aria-label="Categorías"
        className="w-[170px] max-w-full bg-blue-900 text-gray-50 text-sm border border-gray-300 rounded p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        <option value="">Todas</option>
        {categorias.map((categoria) => (
          <option key={categoria._id} value={categoria._id}>
            {categoria.nombre.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategoriaFilter;
