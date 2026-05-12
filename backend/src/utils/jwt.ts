import jwt from 'jsonwebtoken';
import { IUsuario } from '../interfaces/usuario.interface';
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'secret';

//generamos un token con el objeto usuario
export const generarToken = (usuario: IUsuario): string => {
    const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '1d' });
    return token;
}

/**
 * verificar token
 * @param token
 * @returns user | null
 */
export const verificarToken = async (token: string): Promise<{ usuario: IUsuario | null, error?: string }> => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { usuario: IUsuario };
        return { usuario: decoded.usuario };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return {
                usuario: null,
                error: 'Token expirado'
            };
        }
        console.error('Error verificando token:', error);
        return {
            usuario: null,
            error: 'Token invalido'
        };
    }
};