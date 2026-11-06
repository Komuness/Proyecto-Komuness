// BKD38: cada evento/emprendimiento genera una publicación automática que
// se aprueba o se rechaza junto con su original.
import { describe, expect, test, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelPublicacion } from '../models/publicacion.model';
import { crearUsuarioConToken, crearCategoria } from './helpers/testData';
import { purgeExpiredPublicaciones } from '../services/publicacionExpiration.service';
import { modelNotificacion } from '../models/notificacion.model';
import { modelCuentaRegresiva } from '../models/cuentaRegresiva.model';

jest.setTimeout(30000);

// PNG de 1x1 completo (el backend revisa la firma y que el archivo termine en IEND).
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

describe('Publicación automática de eventos y emprendimientos (BKD38)', () => {
    let auth: string;
    let categoriaId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        ({ auth } = await crearUsuarioConToken(0));
        categoriaId = (await crearCategoria())._id.toString();
    });

    const crear = (tag: 'evento' | 'emprendimiento' | 'publicacion', titulo: string) => {
        const req = request(app)
            .post('/api/publicaciones/v2')
            .set('Authorization', auth)
            .field('titulo', titulo)
            .field('contenido', 'Contenido de prueba')
            .field('contenidoBreve', 'Breve')
            .field('fecha', new Date().toISOString())
            .field('tag', tag)
            .field('publicado', 'false')
            .field('categoria', categoriaId)
            .field('comunidad', 'San Carlos')
            .attach('imagenes', PNG, { filename: 'a.png', contentType: 'image/png' });
        if (tag !== 'publicacion') req.field('precio', '1000');
        if (tag === 'evento') req.field('fechaEvento', '2099-01-01').field('horaEvento', '10:00');
        return req;
    };

    test.each(['evento', 'emprendimiento'] as const)('Crear %s genera su publicación', async (tag) => {
        const res = await crear(tag, `Original ${tag} ${Date.now()}`);
        expect(res.status).toBe(201);

        const copia = await modelPublicacion.findOne({ publicacionOrigenId: res.body._id }).lean();
        expect(copia).not.toBeNull();
        expect(copia?.tag).toBe('publicacion');
        expect(copia?.titulo).toBe(res.body.titulo);
        expect(copia?.adjunto?.[0]?.key).not.toBe(res.body.adjunto?.[0]?.key);
    });

    test('Crear una publicación normal no genera copia', async () => {
        const res = await crear('publicacion', `Normal ${Date.now()}`);
        expect(res.status).toBe(201);
        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: res.body._id })).toBe(0);
    });

    test('Aprobar el original aprueba también su publicación', async () => {
        const res = await crear('evento', `Aprobar ${Date.now()}`);
        const aprobar = await request(app)
            .put(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth)
            .send({ publicado: true });
        expect(aprobar.status).toBe(200);

        const copia = await modelPublicacion.findOne({ publicacionOrigenId: res.body._id }).lean();
        expect(copia?.publicado).toBe(true);
    });

    test('Rechazar el original borra también su publicación pendiente', async () => {
        const res = await crear('emprendimiento', `Rechazar ${Date.now()}`);
        const rechazar = await request(app)
            .delete(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth);
        expect(rechazar.status).toBe(200);

        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: res.body._id })).toBe(0);
    });

});

// BKD67: el original y su publicación automática quedan enlazados al
// editar y al eliminar, sin importar cuál de los dos se toque.
describe('Enlace entre original y publicación automática (BKD67)', () => {
    let auth: string;
    let categoriaId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        ({ auth } = await crearUsuarioConToken(0));
        categoriaId = (await crearCategoria())._id.toString();
    });

    const crearEnlazado = async (tag: 'evento' | 'emprendimiento') => {
        const req = request(app)
            .post('/api/publicaciones/v2')
            .set('Authorization', auth)
            .field('titulo', `Enlace ${tag} ${Date.now()}`)
            .field('contenido', 'Contenido original')
            .field('contenidoBreve', 'Breve')
            .field('fecha', new Date().toISOString())
            .field('tag', tag)
            .field('publicado', 'false')
            .field('categoria', categoriaId)
            .field('precio', '1000')
            .attach('imagenes', PNG, { filename: 'a.png', contentType: 'image/png' });
        if (tag === 'evento') req.field('fechaEvento', '2099-01-01').field('horaEvento', '10:00');
        const res = await req;
        expect(res.status).toBe(201);
        const copia = await modelPublicacion.findOne({ publicacionOrigenId: res.body._id });
        return { origenId: res.body._id as string, copiaId: copia!._id.toString() };
    };

    const editar = (id: string, cambios: object) =>
        request(app).put(`/api/publicaciones/${id}`).set('Authorization', auth).send(cambios);
    const borrar = (id: string) =>
        request(app).delete(`/api/publicaciones/${id}`).set('Authorization', auth);
    const existe = async (id: string) => (await modelPublicacion.countDocuments({ _id: id })) === 1;

    test('Editar el original actualiza su publicación', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');

        const ubicacion = { latitude: 10.32, longitude: -84.43, direccion: 'Ciudad Quesada' };
        const res = await editar(origenId, { titulo: 'Título nuevo', horaEvento: '18:30', ubicacion });
        expect(res.status).toBe(200);

        const copia = await modelPublicacion.findById(copiaId).lean();
        expect(copia?.titulo).toBe('Título nuevo');
        expect(copia?.horaEvento).toBe('18:30');
        expect(copia?.ubicacion).toMatchObject(ubicacion);
        expect(copia?.tag).toBe('publicacion');
    });

    test('Editar la publicación actualiza el original', async () => {
        const { origenId, copiaId } = await crearEnlazado('emprendimiento');

        await editar(copiaId, { contenido: 'Contenido editado desde la publicación' });

        const original = await modelPublicacion.findById(origenId).lean();
        expect(original?.contenido).toBe('Contenido editado desde la publicación');
        expect(original?.tag).toBe('emprendimiento');
    });

    test('Una edición solicitada desde la app se aplica a ambos al aprobarla', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');

        const solicitud = await request(app)
            .put(`/api/publicaciones/${origenId}/request-update`)
            .set('Authorization', auth)
            .field('titulo', 'Título aprobado por admin')
            .field('horaEvento', '20:00');
        expect(solicitud.status).toBe(200);
        // Mientras esté pendiente, la publicación no cambia
        expect((await modelPublicacion.findById(copiaId).lean())?.titulo).not.toBe('Título aprobado por admin');

        const aprobar = await request(app)
            .put(`/api/publicaciones/admin/${origenId}/approve-update`)
            .set('Authorization', auth);
        expect(aprobar.status).toBe(200);

        const copia = await modelPublicacion.findById(copiaId).lean();
        expect(copia?.titulo).toBe('Título aprobado por admin');
        expect(copia?.horaEvento).toBe('20:00');
    });

    test('Los campos propios del original no se copian a la publicación', async () => {
        const { origenId, copiaId } = await crearEnlazado('emprendimiento');

        await editar(origenId, { precio: 5000 });

        expect((await modelPublicacion.findById(origenId).lean())?.precio).toBe(5000);
        expect((await modelPublicacion.findById(copiaId).lean())?.precio).not.toBe(5000);
    });

    test('Aprobar la publicación aprueba también el original', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');

        await editar(copiaId, { publicado: true });

        expect((await modelPublicacion.findById(origenId).lean())?.publicado).toBe(true);
    });

    test('Eliminar un original ya aprobado elimina su publicación', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');
        await editar(origenId, { publicado: true });

        expect((await borrar(origenId)).status).toBe(200);

        expect(await existe(origenId)).toBe(false);
        expect(await existe(copiaId)).toBe(false);
    });

    test('Aprobar el original sigue notificando su publicación automática (BKD68)', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');

        await editar(origenId, { publicado: true });

        expect((await modelPublicacion.findById(copiaId).lean())?.publicado).toBe(true);
        expect(await modelNotificacion.countDocuments({ publicacionId: copiaId, tipo: 'general' })).toBe(1);
    });

    test('Eliminar la publicación borra la cuenta regresiva de su evento (UI65)', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');
        const { usuario } = await crearUsuarioConToken(0);
        await modelCuentaRegresiva.create({
            titulo: 'Cuenta del evento',
            fechaObjetivo: new Date('2099-01-01T10:00:00'),
            publicacion: origenId,
            creadoPor: usuario._id,
        });

        expect((await borrar(copiaId)).status).toBe(200);

        expect(await modelCuentaRegresiva.countDocuments({ publicacion: origenId })).toBe(0);
    });

    test('Eliminar la publicación elimina también el original', async () => {
        const { origenId, copiaId } = await crearEnlazado('emprendimiento');
        await editar(origenId, { publicado: true });

        expect((await borrar(copiaId)).status).toBe(200);

        expect(await existe(copiaId)).toBe(false);
        expect(await existe(origenId)).toBe(false);
    });

    test('Una publicación normal se edita y se borra sola', async () => {
        const otra = await crearEnlazado('evento');
        const res = await request(app)
            .post('/api/publicaciones/v2')
            .set('Authorization', auth)
            .field('titulo', `Normal ${Date.now()}`)
            .field('contenido', 'x')
            .field('contenidoBreve', 'x')
            .field('fecha', new Date().toISOString())
            .field('tag', 'publicacion')
            .field('publicado', 'false')
            .field('categoria', categoriaId)
            .attach('imagenes', PNG, { filename: 'a.png', contentType: 'image/png' });

        await editar(res.body._id, { titulo: 'Solo esta' });
        expect((await borrar(res.body._id)).status).toBe(200);

        expect(await existe(otra.origenId)).toBe(true);
        expect(await existe(otra.copiaId)).toBe(true);
        expect((await modelPublicacion.findById(otra.copiaId).lean())?.titulo).not.toBe('Solo esta');
    });

    test('Cuando un evento vence, su publicación se elimina con él', async () => {
        const { origenId, copiaId } = await crearEnlazado('evento');
        await modelPublicacion.updateOne({ _id: origenId }, { fechaExpiracion: new Date(Date.now() - 1000) });

        await purgeExpiredPublicaciones();

        expect(await existe(origenId)).toBe(false);
        expect(await existe(copiaId)).toBe(false);
    });
});
