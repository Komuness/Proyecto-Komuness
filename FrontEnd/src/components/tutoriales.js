import { useState, useEffect } from 'react'
import { useAuth } from "../components/context/AuthContext";
import { toast } from 'react-hot-toast';
import { API_URL } from '../utils/api';
import TutorialModal from '../components/tutorialModal';
import ReactMarkdown from "react-markdown";

export const Tutoriales = () => {
    const { user } = useAuth()
    const [mostrarModal, setMostrarModal] = useState(false);
    const [tutoriales, setTutoriales] = useState([]);
    const [tutorialEditando, setTutorialEditando] = useState(null); // null = crear desde cero, objeto = editar tutorial

    useEffect(()=>{
       fetchTutoriales(); 
    }, []);


    ///////////////////// CRUD
    const handleDeleteTutorial = async (tutorial) => {
        if (!window.confirm('¿Está seguro de que quiere eliminar este tutorial?')) return;

        try {
            const response = await fetch(`${API_URL}/tutoriales/delete-tutorial/${tutorial._id}`, {
                method: 'DELETE',
                headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                toast.success('Tutorial eliminado');
                fetchTutoriales();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Error al eliminar el tutorial');
            }
        } catch (e) {
            toast.error('Error al eliminar el tutorial');
            console.error(e);
        }
    }

    const handleSubmitTutorial = async ({nombre, url, descripcion}) => {
        try {
            const modoCrear = (tutorialEditando == null);
            const petition_url = modoCrear
                ? `${API_URL}/tutoriales/create-tutorial`
                : `${API_URL}/tutoriales/update-tutorial/${tutorialEditando._id}`;
            const method = modoCrear ? "POST" : "PUT";

            const res = await fetch(petition_url,{
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({nombre, url, descripcion}),
            });

            if (res.ok) {
                toast.success(modoCrear ? "Tutorial creado" : "Tutorial actualizado");
                cerrarModal();
                fetchTutoriales();
              } else {
                const errorData = await res.json();
                toast.error(errorData.message || "Error al guardar el tutorial");
              }
        } catch (e) {
            console.error("ERROR TUTORIAL: ", e);
            toast.error("Error al guardar el tutorial");
        }
    };
    
    const fetchTutoriales = async () => {
        try {
          const response = await fetch(`${API_URL}/tutoriales/get-tutoriales`);
          if (!response.ok) {
            console.log(response);
            throw new Error('Error al cargar tutoriales');
          }
          
          const data = await response.json();
          setTutoriales(data.data || []);
        } catch (error) {
          console.error('Error:', error);
          toast.error('Error al cargar tutoriales');
        }
    };

    /////////////////// MODAL 
    const abrirModalCrear = () => {
        setTutorialEditando(null);
        setMostrarModal(true);
    }


    const abrirModalEditar = (tutorial) => {
        setTutorialEditando(tutorial);
        setMostrarModal(true);
    }


    const cerrarModal = () => {
        setTutorialEditando(null);
        setMostrarModal(false);
    }

    ///////////////////////////////////// helpers
    const isYouTube = (url) => url?.includes("www.youtube.com");

    const getYTEmbedUrl = (url) =>{
        const id = new URL(url).searchParams.get("v"); // el key para el id de un video de YT es "v"
        return `https://www.youtube.com/embed/${id}`;
    };  


    const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

    ///////////////////////////////////////

    return (
    <div className="flex flex-col items-center gap-4 bg-gray-800/80 pt-16 min-h-screen p-4 sm:p-8">
      
      {/* Título */}
      <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
        <span className="text-gray-200">Tutoriales</span>
      </h1>

      {/*Boton para crear, solo para admin*/}
      {esAdmin && (
        <div>
          <div className="w-full max-w-6xl px-4 py-2 text-white">
            <button
                onClick={() => abrirModalCrear()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-4 rounded-lg shadow"
            >
                + Agregar Tutorial
            </button>
          </div>
          
          {/*Modal para crear o editar tutorial*/}
          {mostrarModal && (
              <TutorialModal
                tutorial={tutorialEditando}
                onClose={cerrarModal}
                onSubmit={handleSubmitTutorial}
              />
          )}
        </div>
      )}

    {/* cada tutorial tiene video si es de YT o link si no y el boton de borrar*/}
    {tutoriales.map((tutorial) => (
        <div
          key={tutorial._id}
          className="w-full max-w-6xl bg-white/10 rounded-xl p-4"
        >
          {/* Nombre */}
          <h2 className="text-4xl text-white font-semibold flex items-center gap-2 justify-center">
            {tutorial.nombre}
          </h2>
 
          {/* Descripción */}
          {tutorial.descripcion && (
            <div className="mt-5">
                <div className="prose prose-invert max-w-none mt-2">
                <ReactMarkdown>
                    {tutorial.descripcion}
                </ReactMarkdown>
                </div>
            </div>
          )}
 
          {/* Video o enlace, solo si tiene url */}
          {tutorial.url && (
            <div className="mt-5">
            <h3 className="text-3xl text-white font-semibold flex gap-2">
                Video del tutorial:
            </h3>
            {isYouTube(tutorial.url) ? (
              <div className="mt-3 aspect-video w-full">
                <iframe
                  title={tutorial.nombre}
                  src={getYTEmbedUrl(tutorial.url)}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div>
                <a
                    href={tutorial.url}
                    className="text-blue-300 hover:text-blue-200 underline"
                    target="_blank"
                    rel="noreferrer"
                >
                    {tutorial.url}
                </a>
              </div>
            )}
            </div>
          )}
 
          {/* Botones admin */}
          {esAdmin && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => abrirModalEditar(tutorial)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow"
              >
                + Editar
              </button>
              <button
                onClick={() => handleDeleteTutorial(tutorial)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow"
              >
                − Eliminar
              </button>
            </div>
          )}
        </div>
    ))}
    </div>
    )
}

export default Tutoriales;
