// UI69: cada usuario puede eliminar sus notificaciones (individualmente o
// vaciarlas) sin afectar a los demás usuarios. Las notificaciones generales
// (recipientes: []) deben seguir siendo visibles para el resto.
import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { crearUsuarioConToken } from './helpers/testData';
import { modelNotificacion } from '../models/notificacion.model';
import { modelUsuario } from '../models/usuario.model';

jest.setTimeout(30000);

describe('Eliminación de notificaciones por usuario (UI69)', () => {
    let authA: string;
    let authB: string;
    let usuarioAId: string;
    let usuarioBId: string;
    const notificacionesCreadas: string[] = [];
    const usuariosCreados: string[] = [];

    const crearNotificacion = async (nombre: string, recipientes: mongoose.Types.ObjectId[]) => {
        const notificacion = await modelNotificacion.create({
            nombre,
            descripcion: `Descripción de ${nombre}`,
            recipientes,
            tipo: 'general',
        });
        notificacionesCreadas.push(String(notificacion._id));
        return notificacion;
    };

    const listar = (auth: string) =>
        request(app)
            .get('/api/notificaciones')
            .set('Authorization', auth);

    const contiene = (res: any, id: string) =>
        Array.isArray(res.body?.data) &&
        res.body.data.some((n: any) => String(n._id) === id);

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');

        const a = await crearUsuarioConToken(2);
        const b = await crearUsuarioConToken(2);
        authA = a.auth;
        authB = b.auth;
        usuarioAId = String(a.usuario._id);
        usuarioBId = String(b.usuario._id);
        usuariosCreados.push(usuarioAId, usuarioBId);
    });

    afterAll(async () => {
        await modelNotificacion.deleteMany({ _id: { $in: notificacionesCreadas } });
        await modelUsuario.deleteMany({ _id: { $in: usuariosCreados } });
        await mongoose.connection.close();
    });

    test('La notificación general es visible para todos los usuarios', async () => {
        const general = await crearNotificacion(`General visible ${Date.now()}`, []);

        const resA = await listar(authA);
        const resB = await listar(authB);

        expect(resA.status).toBe(200);
        expect(resB.status).toBe(200);
        expect(contiene(resA, String(general._id))).toBe(true);
        expect(contiene(resB, String(general._id))).toBe(true);
    });

    test('Un usuario elimina una notificación general sin afectar a los demás', async () => {
        const general = await crearNotificacion(`General individual ${Date.now()}`, []);

        const borrarA = await request(app)
            .delete(`/api/notificaciones/${general._id}`)
            .set('Authorization', authA);
        expect(borrarA.status).toBe(200);

        const resA = await listar(authA);
        const resB = await listar(authB);
        expect(contiene(resA, String(general._id))).toBe(false);
        expect(contiene(resB, String(general._id))).toBe(true);

        // El documento no se borra de la base: solo se oculta para A.
        const enBD = await modelNotificacion.findById(general._id).lean();
        expect(enBD).not.toBeNull();
        expect(enBD?.eliminadasPor?.map((id) => String(id))).toContain(usuarioAId);
    });

    test('Un usuario no puede eliminar una notificación dirigida a otro', async () => {
        const soloA = await crearNotificacion(`Solo para A ${Date.now()}`, [
            new mongoose.Types.ObjectId(usuarioAId),
        ]);

        const borrarB = await request(app)
            .delete(`/api/notificaciones/${soloA._id}`)
            .set('Authorization', authB);
        expect(borrarB.status).toBe(404);

        const enBD = await modelNotificacion.findById(soloA._id).lean();
        expect(enBD).not.toBeNull();
        expect(enBD?.eliminadasPor?.map((id) => String(id))).not.toContain(usuarioBId);
    });

    test('Vaciar notificaciones solo afecta al usuario que lo solicita', async () => {
        const general = await crearNotificacion(`General para vaciar ${Date.now()}`, []);
        const soloA = await crearNotificacion(`Para A antes de vaciar ${Date.now()}`, [
            new mongoose.Types.ObjectId(usuarioAId),
        ]);

        const vaciar = await request(app)
            .delete('/api/notificaciones')
            .set('Authorization', authA);
        expect(vaciar.status).toBe(200);

        const resA = await listar(authA);
        const resB = await listar(authB);
        expect(contiene(resA, String(general._id))).toBe(false);
        expect(contiene(resA, String(soloA._id))).toBe(false);
        expect(contiene(resB, String(general._id))).toBe(true);

        const generalEnBD = await modelNotificacion.findById(general._id).lean();
        const eliminadasPor = generalEnBD?.eliminadasPor?.map((id) => String(id)) || [];
        expect(eliminadasPor).toContain(usuarioAId);
        expect(eliminadasPor).not.toContain(usuarioBId);
    });

    test('Una notificación eliminada deja de contar como no leída para ese usuario', async () => {
        const general = await crearNotificacion(`General no leída ${Date.now()}`, []);

        const antesB = await request(app)
            .get('/api/notificaciones?onlyUnread=true')
            .set('Authorization', authB);
        expect(contiene(antesB, String(general._id))).toBe(true);

        const borrarB = await request(app)
            .delete(`/api/notificaciones/${general._id}`)
            .set('Authorization', authB);
        expect(borrarB.status).toBe(200);

        const despuesB = await request(app)
            .get('/api/notificaciones?onlyUnread=true')
            .set('Authorization', authB);
        expect(contiene(despuesB, String(general._id))).toBe(false);

        // Sigue disponible para el otro usuario.
        const resA = await listar(authA);
        expect(contiene(resA, String(general._id))).toBe(true);
    });

    test('No se puede vaciar notificaciones sin autenticación', async () => {
        const res = await request(app).delete('/api/notificaciones');
        expect(res.status).toBe(401);
    });
});
