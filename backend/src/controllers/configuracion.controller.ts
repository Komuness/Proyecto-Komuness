import { Request, Response } from 'express';
import { IConfiguracion } from '../interfaces/configuracion.interface';
import { modelConfiguracion } from '../models/configuracion.model';
import { IUsuario } from '../interfaces/usuario.interface';
import { modelInicioContenido } from '../models/inicioContenido.model';

const normalizarTexto = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

/**
 * Obtener todas las configuraciones (solo para admins)
 */
export const getConfiguraciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const configuraciones = await modelConfiguracion.find()
            .populate('actualizadoPor', 'nombre apellido email');
        
        res.status(200).json({
            success: true,
            data: configuraciones
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Obtener una configuración específica por clave
 */
export const getConfiguracionPorClave = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clave } = req.params;
        const configuracion = await modelConfiguracion.findOne({ clave })
            .populate('actualizadoPor', 'nombre apellido email');

        if (!configuracion) {
            res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: configuracion
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Actualizar o crear configuración (solo admins)
 */
export const actualizarConfiguracion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clave, valor, descripcion } = req.body;
        const user = (req as Request & { user?: IUsuario }).user;

        if (!clave || valor === undefined) {
            res.status(400).json({
                success: false,
                message: 'Se requieren los campos: clave y valor'
            });
            return;
        }

        // Validar que el valor sea un número para configuraciones de límites
        if ((clave === 'limite_publicaciones_basico' || clave === 'limite_publicaciones_premium') 
            && (typeof valor !== 'number' || valor < 0)) {
            res.status(400).json({
                success: false,
                message: 'El valor debe ser un número mayor o igual a 0 para límites de publicaciones'
            });
            return;
        }

        const configuracion = await modelConfiguracion.findOneAndUpdate(
            { clave },
            {
                valor,
                descripcion,
                actualizadoPor: user?._id,
                actualizadoEn: new Date()
            },
            { 
                new: true, 
                upsert: true, // Crear si no existe
                runValidators: true 
            }
        ).populate('actualizadoPor', 'nombre apellido email');

        res.status(200).json({
            success: true,
            message: 'Configuración actualizada correctamente',
            data: configuracion
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Actualizar límites de publicaciones (endpoint específico para facilidad de uso)
 */
export const actualizarLimitesPublicaciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limiteBasico, limitePremium } = req.body;
        const user = (req as Request & { user?: IUsuario }).user;

        if (limiteBasico === undefined && limitePremium === undefined) {
            res.status(400).json({
                success: false,
                message: 'Debe proporcionar al menos un límite (limiteBasico o limitePremium)'
            });
            return;
        }

        const actualizaciones: any[] = [];

        // Actualizar límite para usuarios básicos
        if (limiteBasico !== undefined) {
            if (typeof limiteBasico !== 'number' || limiteBasico < 0) {
                res.status(400).json({
                    success: false,
                    message: 'limiteBasico debe ser un número mayor o igual a 0'
                });
                return;
            }

            actualizaciones.push(
                modelConfiguracion.findOneAndUpdate(
                    { clave: 'limite_publicaciones_basico' },
                    {
                        valor: limiteBasico,
                        descripcion: 'Límite de publicaciones para usuarios básicos',
                        actualizadoPor: user?._id,
                        actualizadoEn: new Date()
                    },
                    { new: true, upsert: true }
                )
            );
        }

        // Actualizar límite para usuarios premium
        if (limitePremium !== undefined) {
            if (typeof limitePremium !== 'number' || limitePremium < 0) {
                res.status(400).json({
                    success: false,
                    message: 'limitePremium debe ser un número mayor o igual a 0'
                });
                return;
            }

            actualizaciones.push(
                modelConfiguracion.findOneAndUpdate(
                    { clave: 'limite_publicaciones_premium' },
                    {
                        valor: limitePremium,
                        descripcion: 'Límite de publicaciones para usuarios premium',
                        actualizadoPor: user?._id,
                        actualizadoEn: new Date()
                    },
                    { new: true, upsert: true }
                )
            );
        }

        const resultados = await Promise.all(actualizaciones);

        res.status(200).json({
            success: true,
            message: 'Límites de publicaciones actualizados correctamente',
            data: {
                limiteBasico: resultados.find(r => r?.clave === 'limite_publicaciones_basico'),
                limitePremium: resultados.find(r => r?.clave === 'limite_publicaciones_premium')
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Obtener información de límites y uso actual del usuario autenticado
 */
export const getMisLimitesPublicaciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as Request & { user?: IUsuario }).user;

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }

        // Importar el modelo de publicaciones
        const { modelPublicacion } = await import('../models/publicacion.model');
        const { modelUsuario } = await import('../models/usuario.model');

        const usuarioCompleto = await modelUsuario.findById(user._id);

        if (!usuarioCompleto) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
            return;
        }

        // Super-admin y admin no tienen límites
        if (usuarioCompleto.tipoUsuario === 0 || usuarioCompleto.tipoUsuario === 1) {
            res.status(200).json({
                success: true,
                data: {
                    tipoUsuario: usuarioCompleto.tipoUsuario,
                    nombreTipo: usuarioCompleto.tipoUsuario === 0 ? 'super-admin' : 'admin',
                    limite: null,
                    publicacionesActuales: await modelPublicacion.countDocuments({ autor: usuarioCompleto._id }),
                    sinLimite: true
                }
            });
            return;
        }

        // Obtener límite aplicable
        let limiteAplicable: number;

        if (usuarioCompleto.limitePublicaciones !== undefined && usuarioCompleto.limitePublicaciones !== null) {
            limiteAplicable = usuarioCompleto.limitePublicaciones;
        } else {
            const claveConfiguracion = usuarioCompleto.tipoUsuario === 3
                ? 'limite_publicaciones_premium'
                : 'limite_publicaciones_basico';

            const configuracion = await modelConfiguracion.findOne({ clave: claveConfiguracion });
            limiteAplicable = configuracion?.valor ?? (usuarioCompleto.tipoUsuario === 3 ? 50 : 10);
        }

        const cantidadPublicaciones = await modelPublicacion.countDocuments({ autor: usuarioCompleto._id });

        // Validar si premium está vencido
        let premiumVencido = false;
        if (usuarioCompleto.tipoUsuario === 3 && usuarioCompleto.fechaVencimientoPremium) {
            const ahora = new Date();
            const vencimiento = new Date(usuarioCompleto.fechaVencimientoPremium);
            premiumVencido = ahora > vencimiento;
        }

        res.status(200).json({
            success: true,
            data: {
                tipoUsuario: usuarioCompleto.tipoUsuario,
                nombreTipo: usuarioCompleto.tipoUsuario === 3 ? 'premium' : 'básico',
                limite: limiteAplicable,
                publicacionesActuales: cantidadPublicaciones,
                publicacionesRestantes: Math.max(0, limiteAplicable - cantidadPublicaciones),
                limiteAlcanzado: cantidadPublicaciones >= limiteAplicable,
                premiumVencido,
                fechaVencimientoPremium: usuarioCompleto.fechaVencimientoPremium,
                limitePersonalizado: usuarioCompleto.limitePublicaciones !== undefined && usuarioCompleto.limitePublicaciones !== null
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Eliminar una configuración (solo super-admin)
 */
export const deleteConfiguracion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clave } = req.params;

        const configuracion = await modelConfiguracion.findOneAndDelete({ clave });

        if (!configuracion) {
            res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Configuración eliminada correctamente'
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


export const getConfiguracionPagos = async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await modelConfiguracion.find({
      clave: { $in: [
        'sinpe_numero',
        'sinpe_nombre',
        'whatsapp_numero',  
        'plan_mensual_monto',
        'plan_anual_monto'
      ]}
    });

    const configMap: Record<string, any> = {};
    configs.forEach(config => {
      configMap[config.clave] = config.valor;
    });

    res.status(200).json({
      success: true,
      data: {
        sinpeNumero: configMap['sinpe_numero'] || '',
        sinpeNombre: configMap['sinpe_nombre'] || '',
        whatsappNumero: configMap['whatsapp_numero'] || '',  
        planMensualMonto: configMap['plan_mensual_monto'] || 4.0,
        planAnualMonto: configMap['plan_anual_monto'] || 8.0
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Actualizar configuración de pagos
 */
export const actualizarConfiguracionPagos = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const actualizadoPor = authReq.user?._id;
    
    const { 
      sinpeNumero, 
      sinpeNombre, 
      whatsappNumero, 
      planMensualMonto, 
      planAnualMonto 
    } = req.body;

    const configuraciones = [
      { clave: 'sinpe_numero', valor: sinpeNumero, descripcion: 'Número de SINPE Móvil para pagos' },
      { clave: 'sinpe_nombre', valor: sinpeNombre, descripcion: 'Nombre asociado al SINPE Móvil' },
      { clave: 'whatsapp_numero', valor: whatsappNumero, descripcion: 'Número de WhatsApp para enviar comprobantes' }, 
      { clave: 'plan_mensual_monto', valor: parseFloat(planMensualMonto) || 4.0, descripcion: 'Monto del plan premium mensual en USD' },
      { clave: 'plan_anual_monto', valor: parseFloat(planAnualMonto) || 8.0, descripcion: 'Monto del plan premium anual en USD' }
    ];

    const results = [];

    for (const config of configuraciones) {
      const resultado = await modelConfiguracion.findOneAndUpdate(
        { clave: config.clave },
        { 
          $set: { 
            valor: config.valor,
            descripcion: config.descripcion,
            actualizadoPor,
            actualizadoEn: new Date()
          }
        },
        { upsert: true, new: true }
      );
      results.push(resultado);
    }

    res.status(200).json({
      success: true,
      message: 'Configuración de pagos actualizada correctamente',
      data: results
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Obtener frase motivacional de la pagina de inicio (publica)
 */
export const getFraseInicioPublica = async (_req: Request, res: Response): Promise<void> => {
    try {
        const contenidoInicio = await modelInicioContenido
            .findOne()
            .sort({ updatedAt: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                frase: normalizarTexto(contenidoInicio?.frase)
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Actualizar frase motivacional de la pagina de inicio (solo admins)
 */
export const actualizarFraseInicio = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as Request & { user?: IUsuario }).user;
        const fraseRaw = req.body?.frase;

        if (typeof fraseRaw !== 'string') {
            res.status(400).json({
                success: false,
                message: 'El campo frase es obligatorio y debe ser texto'
            });
            return;
        }

        const frase = fraseRaw.trim();

        if (frase.length === 0) {
            res.status(400).json({
                success: false,
                message: 'La frase no puede estar vacia'
            });
            return;
        }

        if (frase.length > 280) {
            res.status(400).json({
                success: false,
                message: 'La frase no puede superar los 280 caracteres'
            });
            return;
        }

        const actual = await modelInicioContenido
            .findOne()
            .sort({ updatedAt: -1, createdAt: -1 });

        if (!actual) {
            await modelInicioContenido.create({
                eslogan: '',
                frase,
                actualizadoPor: user?._id
            });
        } else {
            actual.frase = frase;
            actual.actualizadoPor = user?._id as any;
            await actual.save();
        }

        res.status(200).json({
            success: true,
            message: 'Frase motivacional actualizada correctamente',
            data: {
                frase
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Obtener contenido de portada (eslogan + frase motivacional)
 */
export const getContenidoInicioPublico = async (_req: Request, res: Response): Promise<void> => {
    try {
        const contenidoInicio = await modelInicioContenido
            .findOne()
            .sort({ updatedAt: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                eslogan: normalizarTexto(contenidoInicio?.eslogan),
                frase: normalizarTexto(contenidoInicio?.frase)
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Actualizar contenido de portada (eslogan + frase motivacional) - solo admins
 */
export const actualizarContenidoInicio = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as Request & { user?: IUsuario }).user;
        const esloganRaw = req.body?.eslogan;
        const fraseRaw = req.body?.frase;

        const tieneEslogan = esloganRaw !== undefined;
        const tieneFrase = fraseRaw !== undefined;

        if (!tieneEslogan && !tieneFrase) {
            res.status(400).json({
                success: false,
                message: 'Debe enviar al menos uno de los campos: eslogan o frase'
            });
            return;
        }

        if (tieneEslogan && typeof esloganRaw !== 'string') {
            res.status(400).json({
                success: false,
                message: 'El campo eslogan debe ser texto'
            });
            return;
        }

        if (tieneFrase && typeof fraseRaw !== 'string') {
            res.status(400).json({
                success: false,
                message: 'El campo frase debe ser texto'
            });
            return;
        }

        const eslogan = tieneEslogan ? esloganRaw.trim() : undefined;
        const frase = tieneFrase ? fraseRaw.trim() : undefined;

        if (eslogan !== undefined && eslogan.length > 180) {
            res.status(400).json({
                success: false,
                message: 'El eslogan no puede superar los 180 caracteres'
            });
            return;
        }

        if (frase !== undefined && frase.length > 280) {
            res.status(400).json({
                success: false,
                message: 'La frase no puede superar los 280 caracteres'
            });
            return;
        }

        const actual = await modelInicioContenido
            .findOne()
            .sort({ updatedAt: -1, createdAt: -1 });

        const esloganActual = normalizarTexto(actual?.eslogan);
        const fraseActual = normalizarTexto(actual?.frase);

        const cambiaEslogan = eslogan !== undefined && eslogan !== esloganActual;
        const cambiaFrase = frase !== undefined && frase !== fraseActual;

        // Regla solicitada: si cambian ambos, borrar informacion anterior y crear registro nuevo.
        if (cambiaEslogan && cambiaFrase) {
            await modelInicioContenido.deleteMany({});
            await modelInicioContenido.create({
                eslogan,
                frase,
                actualizadoPor: user?._id
            });
        } else {
            if (!actual) {
                await modelInicioContenido.create({
                    eslogan: eslogan ?? '',
                    frase: frase ?? '',
                    actualizadoPor: user?._id
                });
            } else {
                if (eslogan !== undefined) {
                    actual.eslogan = eslogan;
                }
                if (frase !== undefined) {
                    actual.frase = frase;
                }
                actual.actualizadoPor = user?._id as any;
                await actual.save();
            }
        }

        const actualizado = await modelInicioContenido
            .findOne()
            .sort({ updatedAt: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Contenido de inicio actualizado correctamente',
            data: {
                eslogan: normalizarTexto(actualizado?.eslogan),
                frase: normalizarTexto(actualizado?.frase)
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

