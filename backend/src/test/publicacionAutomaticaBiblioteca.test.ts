// Al aprobar/subir un archivo a la biblioteca se genera una publicación
// automática en el feed, igual que con eventos, emprendimientos y tutoriales.
import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { crearUsuarioConToken, crearCategoria } from './helpers/testData';
import { Archivo } from '../models/archivo.model';
import { modelPublicacion } from '../models/publicacion.model';
import { modelNotificacion } from '../models/notificacion.model';
import { modelCategoria } from '../models/categoria.model';
import { modelUsuario } from '../models/usuario.model';
import { publicarArchivoAutomatico } from '../controllers/biblioteca.controller';

jest.setTimeout(30000);

describe('Publicación automática de archivos de biblioteca', () => {
    let auth: string;
    let usuarioId: string;
    let categoriaId: string;
    const archivos: string[] = [];
    const publicaciones: string[] = [];

    const crearArchivo = async (estado: 'pendiente' | 'aprobado') => {
        const _id = new mongoose.Types.ObjectId();
        const archivo = await Archivo.create({
            _id,
            nombre: `Guía ${_id}.pdf`,
            fechaSubida: new Date().toISOString(),
            tipoArchivo: 'application/pdf',
            tamano: 10,
            autor: usuarioId,
            uploadedBy: usuarioId,
            esPublico: estado === 'aprobado',
            key: `test/${_id}.pdf`,
            url: `http://localhost:5050/api/biblioteca/files/${_id}`,
            categoria: categoriaId,
            estado,
        });
        archivos.push(String(archivo._id));
        return archivo;
    };

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        const admin = await crearUsuarioConToken(1);
        auth = admin.auth;
        usuarioId = String(admin.usuario._id);
        categoriaId = String((await crearCategoria())._id);
    });

    afterAll(async () => {
        await modelNotificacion.deleteMany({ publicacionId: { $in: publicaciones } });
        await modelPublicacion.deleteMany({ publicacionOrigenId: { $in: archivos } });
        await Archivo.deleteMany({ _id: { $in: archivos } });
        await modelCategoria.deleteMany({ _id: categoriaId });
        await modelUsuario.deleteMany({ _id: usuarioId });
        await mongoose.connection.close();
    });

    test('aprobar un archivo pendiente crea la publicación y la notificación', async () => {
        const archivo = await crearArchivo('pendiente');
        const res = await request(app)
            .put(`/api/biblioteca/approve/${archivo._id}`)
            .set('Authorization', auth);
        expect(res.status).toBe(200);

        const publicacion = await modelPublicacion.findOne({ publicacionOrigenId: archivo._id }).lean();
        expect(publicacion).not.toBeNull();
        expect(publicacion?.tag).toBe('publicacion');
        expect(publicacion?.titulo).toBe(archivo.nombre);
        expect(publicacion?.publicado).toBe(true);
        expect(String(publicacion?.categoria)).toBe(categoriaId);
        expect(String(publicacion?.autor)).toBe(usuarioId);
        expect(publicacion?.enlacesExternos?.[0]?.url).toBe(archivo.url);
        publicaciones.push(String(publicacion?._id));

        const notificacion = await modelNotificacion
            .findOne({ publicacionId: publicacion?._id, tipo: 'general' })
            .lean();
        expect(notificacion).not.toBeNull();
    });

    test('no duplica la publicación si se invoca de nuevo', async () => {
        const archivo = await crearArchivo('aprobado');
        const primera = await publicarArchivoAutomatico(archivo as any);
        const segunda = await publicarArchivoAutomatico(archivo as any);
        expect(primera).not.toBeNull();
        expect(segunda).toBeNull();
        publicaciones.push(String(primera?._id));
        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: archivo._id })).toBe(1);
    });

    test('eliminar el archivo elimina su publicación automática', async () => {
        const archivo = await crearArchivo('aprobado');
        await publicarArchivoAutomatico(archivo as any);
        const res = await request(app)
            .delete(`/api/biblioteca/delete/${archivo._id}`)
            .set('Authorization', auth);
        expect(res.status).toBe(200);
        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: archivo._id })).toBe(0);
    });
});
