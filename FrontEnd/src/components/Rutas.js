import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { InicioPrincipal } from './InicioPrincipal';
import {LandingPage} from './landingPage' 
import {PerfilUsuario} from './perfilUsuario'
import {PublicacionDetalle} from './publicacionDetalle'
import {Navbar} from './navbar'
import {Biblioteca} from './biblioteca'

import {IniciarSesion} from './iniciarSesion'
import {RecuperarContra} from './recuperarContra'
import {NuevaContra} from './nuevaContra'
import {CrearUsuario} from './crearUsuario'
import CalendarView from './Calendar';
import AdminCategorias from './adminCategorias';
import AcercaDe from './AcercaDe';
import Footer from './Footer';
import CheckoutPremium from './CheckoutPremium';
import PerfilPublico from './PerfilPublico';
import EditarPerfil from './EditarPerfil';
import BancoProfesionales from './BancoProfesionales';
import TerminosCondiciones from './TerminosCondiciones'; // NUEVO
import Tutoriales from "./tutoriales"; // NUEVO
import NotificacionesMovil from "./notificaciones/NotificacionesMovil";

export const Rutas = () =>{
    
    return(
        <Router>
            <Navbar />
            <Routes>
                <Route path = "/" element= {<InicioPrincipal />}/>
                <Route path = "/eventos" element = {<LandingPage tag="evento" />}/>
                <Route path = "/publicaciones" element = {<LandingPage tag="publicacion" />}/>
                <Route path = "/publicaciones/:id" element = {<PublicacionDetalle/>}/>
                <Route path = "/emprendimientos" element = {<LandingPage tag="emprendimiento" />}/>
                <Route path = "/biblioteca/:id" element = {<Biblioteca/>}/>
                <Route path = "/perfilUsuario" element= {<PerfilUsuario/>}/>
                <Route path = "/iniciarSesion" element= {<IniciarSesion/>}/>
                <Route path = "/recuperar" element= {<RecuperarContra/>}/>
                <Route path = "/nuevaCont" element= {<NuevaContra/>}/>
                <Route path = "/crearUsr" element= {<CrearUsuario/>}/>
                <Route path="/calendario" element={<CalendarView />} />
                <Route path="/admin/categorias" element={<AdminCategorias />} />
                <Route path="/acerca-de" element={<AcercaDe />} />
                <Route path="/checkout-premium" element={<CheckoutPremium />} />
                <Route path="/perfil/:id" element={<PerfilPublico />} />
                <Route path="/mi-perfil/editar" element={<EditarPerfil />} />
                <Route path="/profesionales" element={<BancoProfesionales />} />
                <Route path="/terminos-y-condiciones" element={<TerminosCondiciones />} /> {/* NUEVO */}
                <Route path="/tutoriales" element={<Tutoriales />} /> {/* NUEVO */}
                <Route path="/notificaciones" element={<NotificacionesMovil />} />

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Footer />
        </Router>
    )
}
