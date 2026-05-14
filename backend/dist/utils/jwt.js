"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarToken = exports.generarToken = exports.JWT_SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.JWT_SECRET = process.env.JWT_SECRET || 'secret';
//generamos un token con el objeto usuario
const generarToken = (usuario) => {
    const token = jsonwebtoken_1.default.sign({ usuario }, exports.JWT_SECRET, { expiresIn: '1d' });
    return token;
};
exports.generarToken = generarToken;
/**
 * verificar token
 * @param token
 * @returns user | null
 */
const verificarToken = (token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        return { usuario: decoded.usuario };
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
});
exports.verificarToken = verificarToken;
