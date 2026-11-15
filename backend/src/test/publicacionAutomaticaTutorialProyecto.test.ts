// BKD70: al publicar un tutorial o un proyecto destacado se genera una
// publicación automática en el feed, igual que con eventos y emprendimientos.
import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { crearUsuarioConToken } from './helpers/testData';
import { modelPublicacion } from '../models/publicacion.model';
import { modelTutorial } from '../models/tutorial.model';
import { modelProyectoDestacado } from '../models/ProyectoDestacado.model';
import { modelNotificacion } from '../models/notificacion.model';

jest.setTimeout(30000);

describe('Publicación automática de tutoriales y proyectos destacados (BKD70)', () => {
    let auth: string;
    let usuarioId: string;
    const tutoriales: string[] = [];
    const proyectos: string[] = [];
    const publicaciones: string[] = [];

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        const admin = await crearUsuarioConToken(1);
        auth = admin.auth;
        usuarioId = String(admin.usuario._id);
    });

    afterAll(async () => {
        await modelNotificacion.deleteMany({ publicacionId: { $in: publicaciones } });
        await modelPublicacion.deleteMany({ _id: { $in: publicaciones } });
        await modelTutorial.deleteMany({ _id: { $in: tutoriales } });
        await modelProyectoDestacado.deleteMany({ _id: { $in: proyectos } });
        await mongoose.connection.close();
    });

    async function verificarPublicacionAutomatica(
        origenId: string,
        titulo: string,
        url: string,
        etiquetaNotificacion: string,
    ) {
        const publicacion = await modelPublicacion
            .findOne({ publicacionOrigenId: origenId })
            .lean();

        expect(publicacion).not.toBeNull();
        expect(publicacion?.tag).toBe('publicacion');
        expect(publicacion?.titulo).toBe(titulo);
        expect(publicacion?.publicado).toBe(true);
        expect(String(publicacion?.autor)).toBe(usuarioId);
        // Los tutoriales y proyectos destacados no manejan categoría.
        expect(publicacion?.categoria).toBeUndefined();
        expect(publicacion?.enlacesExternos?.[0]?.url).toBe(url);

        publicaciones.push(String(publicacion?._id));

        const notificacion = await modelNotificacion
            .findOne({ publicacionId: publicacion?._id, tipo: 'general' })
            .lean();
        expect(notificacion).not.toBeNull();
        expect(notificacion?.nombre).toBe(`Nuevo ${etiquetaNotificacion}`);
        expect(notificacion?.recipientes).toEqual([]);

        return publicacion!;
    }

    test('Crear un tutorial genera su publicación automática', async () => {
        const nombre = `Tutorial auto ${Date.now()}`;
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const descripcion = 'Aprende a usar la plataforma paso a paso.';

        const res = await request(app)
            .post('/api/tutoriales/create-tutorial')
            .set('Authorization', auth)
            .send({ nombre, url, descripcion });

        expect(res.status).toBe(201);
        tutoriales.push(res.body._id);

        const publicacion = await verificarPublicacionAutomatica(
            res.body._id,
            nombre,
            url,
            'tutorial',
        );
        expect(publicacion.contenido).toBe(descripcion);
        expect(publicacion.contenidoBreve).toBe(descripcion);
    });

    test('Crear un proyecto destacado genera su publicación automática', async () => {
        const nombre = `Proyecto auto ${Date.now()}`;
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const descripcion = 'Proyecto comunitario que transforma el barrio.';

        const res = await request(app)
            .post('/api/proyectos-destacados/create-proyecto')
            .set('Authorization', auth)
            .send({ nombre, url, descripcion });

        expect(res.status).toBe(201);
        proyectos.push(res.body._id);

        const publicacion = await verificarPublicacionAutomatica(
            res.body._id,
            nombre,
            url,
            'proyecto destacado',
        );
        expect(publicacion.contenido).toBe(descripcion);
    });

    test('Una publicación normal sigue exigiendo categoría aunque envíe publicacionOrigenId', async () => {
        const publicacionOrigenId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .post('/api/publicaciones')
            .set('Authorization', auth)
            .send({
                titulo: `Sin categoria ${Date.now()}`,
                contenido: 'Contenido',
                contenidoBreve: 'Breve',
                fecha: new Date().toISOString(),
                tag: 'publicacion',
                publicado: true,
                publicacionOrigenId,
            });

        expect(res.status).not.toBe(201);
        expect(await modelPublicacion.countDocuments({ publicacionOrigenId })).toBe(0);
    });
});
