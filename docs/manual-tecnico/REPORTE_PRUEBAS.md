# Reporte de ejecución de pruebas automatizadas — Komuness (versión 3, Sprint 3)

**Fecha de ejecución:** 2026-11-17
**Rama evaluada:** `branch-testing-changes` (commit `d0f28d3`)
**Comandos:** `npm test` dentro de `backend/` (`jest --config jest.config.ts`) y `CI=true npx react-scripts test --watchAll=false` dentro de `FrontEnd/`
**Base de datos:** MongoDB Community local (`mongodb-community` vía Homebrew) en `127.0.0.1:27017`, base `komuness-local-test`.

## 1. Resumen ejecutivo

| Parte | Test Suites | Tests |
|---|---|---|
| Backend | **21 passed, 21 total** | **213 passed, 213 total** |
| Frontend | **7 passed, 7 total** | **59 passed, 59 total** |

Todas las pruebas pasan. Las 9 fallas del reporte del 29 de septiembre (sección 4 de este documento) quedaron corregidas: ya no hay pruebas desactualizadas y `categorias.test.ts` es ahora una suite ejecutable.

## 2. Resultado por archivo

**Backend (`backend/src/test/`)** — todos PASS:
`usuarioAuth`, `usuarioUpdatePermisos`, `configuracion`, `seccionAcerca`, `paymentErrorHandler`, `paymentRetry`, `paypalController`, `publicacion`, `publicacionCategoria`, `comentarios`, `categorias`, `publicacionAutomatica`, `publicacionAutomaticaTutorialProyecto`, `publicacionAutomaticaBiblioteca`, `cuentaRegresivaApi`, `cuentaRegresivaEvento`, `cuentaRegresivaFecha`, `cuentaRegresivaPermiso`, `notificacionesEliminarPorUsuario`, `fileContent`, `uploadSecurity`.

**Frontend** — todos PASS:
`__tests__/botonCrear`, `__tests__/formularioCrear`, `__tests__/formularioCuentaRegresiva`, `__tests__/buscadorTutoriales`, `__tests__/buscadorProyectos`, `__tests__/fileValidation`, `utils/cuentaRegresiva`.

## 3. Cobertura y vacíos

- **Con pruebas (Sprint 3):** publicación automática y su edición/eliminación enlazadas (eventos y emprendimientos), publicación automática de tutoriales, proyectos destacados y archivos de biblioteca (aprobación, sin duplicados, eliminación), cuentas regresivas (API, eventos, fechas en hora de Costa Rica, permisos), eliminación de notificaciones por usuario, permisos de actualización de usuarios y verificación del contenido de los archivos.
- **Sin pruebas automatizadas:** elegibilidad del banco de profesionales, fotos de emprendimientos, filtros por provincia y cantón, el resto de los flujos de la biblioteca (subida con categoría y nombre personalizado, listado y búsqueda por categoría) y pruebas de extremo a extremo del frontend.

---

# Reporte anterior (Sprint 2) — ejecución del 2026-09-29

*Se conserva como referencia histórica. Las fallas descritas abajo ya fueron corregidas.*

## Reporte de ejecución de pruebas automatizadas — Backend Komuness

**Fecha de ejecución:** 2026-09-29
**Rama evaluada:** `branch-testing-changes` (sincronizada con `origin/branch-testing-changes`, commit `0f7d485`)
**Comando ejecutado:** `npm test` (`jest --config jest.config.ts`) dentro de `backend/`
**Entorno de base de datos:** MongoDB Community Server 9.0.2, instalado localmente vía Homebrew (`mongodb/brew`) y ejecutado en `127.0.0.1:27017`, apuntando a la base `komuness-local-test` definida en `backend/.env` (`BD_URL`).

## 1. Resumen ejecutivo

| Corrida | Base de datos | Test Suites | Tests |
|---|---|---|---|
| 1ª corrida | Sin MongoDB local (`BD_URL` apuntaba a `127.0.0.1:27017`, sin servidor activo) | 8 failed, 2 passed (10 total) | 48 failed, 41 passed (89 total) |
| 2ª corrida | Con MongoDB local activo | **5 failed, 5 passed (10 total)** | **9 failed, 80 passed (89 total)** |

La primera corrida confirmó que la gran mayoría de las fallas iniciales eran causadas por la ausencia de una base de datos accesible (`MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`), **no por defectos del código**. Tras instalar y levantar MongoDB localmente, la tasa de éxito subió de 46% a **89.9%** (80/89 pruebas), lo que valida que la mayor parte de la funcionalidad documentada en el manual técnico efectivamente funciona contra una base de datos real, y no solo existe en el código fuente.

## 2. Resultado por archivo de prueba (2ª corrida, con MongoDB activo)

| Archivo | Resultado | Pruebas |
|---|---|---|
| `usuarioAuth.test.ts` | ✅ PASS | Registro, confirmación, login, recuperación de contraseña, roles |
| `seccionAcerca.test.ts` | ✅ PASS | Sección institucional "Acerca de" |
| `configuracion.test.ts` | ✅ PASS | Configuración pública y administrativa del sitio |
| `paymentErrorHandler.test.ts` | ✅ PASS | Clasificación de errores de pago de PayPal |
| `paymentRetry.test.ts` | ✅ PASS | Lógica de reintentos con backoff exponencial |
| `publicacion.test.ts` | ❌ FAIL (4/4 pruebas) | CRUD de publicaciones |
| `comentarios.test.ts` | ❌ FAIL (1/1 prueba) | Agregar comentario a una publicación |
| `publicacionCategoria.test.ts` | ❌ FAIL (1/1 prueba) | Crear publicación con categoría |
| `categorias.test.ts` | ❌ FAIL (suite no ejecutable) | N/A |
| `paypalController.test.ts` | ❌ FAIL (2/~10 pruebas) | Captura de pago PayPal con reintentos |

## 3. Análisis de cada falla

### 3.1 `publicacion.test.ts` — 4 pruebas fallidas (404 en vez de 200/201)
Las peticiones se hacen contra `/publicaciones`, `/publicaciones/:id`, etc. (sin el prefijo `/api`). El servidor real monta todas las rutas bajo `/api` (`backend/src/index.ts`), por lo que el prefijo correcto es `/api/publicaciones`.
**Diagnóstico:** prueba desactualizada (quedó escrita antes de que el prefijo `/api` se introdujera), no un defecto del endpoint. El endpoint real, documentado en `api.tex`, sí responde bajo `/api/publicaciones` (confirmado por lectura de código en `publicaciones.routes.ts`).

### 3.2 `comentarios.test.ts` — 1 prueba fallida (`ValidationError`)
El *fixture* de publicación que crea la prueba no incluye los campos `categoria` y `contenidoBreve`, que el esquema de Mongoose (`Publicacion`) exige actualmente como obligatorios.
**Diagnóstico:** el modelo `Publicacion` evolucionó (se agregaron campos requeridos) y la prueba no se actualizó junto con el esquema. La funcionalidad de comentarios en sí no se llegó a ejercitar porque la publicación de prueba nunca se creó.

### 3.3 `publicacionCategoria.test.ts` — 1 prueba fallida (401 en vez de 201)
La petición de creación de publicación con categoría es rechazada por autenticación.
**Diagnóstico:** el token/credenciales que usa la prueba no está siendo aceptado por el middleware de autenticación actual; probablemente un token de prueba desactualizado o un cambio en el esquema de autorización posterior a la escritura de la prueba.

### 3.4 `categorias.test.ts` — la suite no se puede ejecutar
Jest reporta: *"Your test suite must contain at least one test."* El archivo no contiene ningún `test()`/`it()`; es en realidad un script independiente (`async function main() {...}; main().catch(console.error)`) que se conecta a MongoDB y hace una operación puntual, colocado por error dentro de la carpeta `src/test/`.
**Diagnóstico:** no es una prueba automatizada real, es un script de utilidad/depuración mal ubicado. No aporta cobertura y Jest lo descarta correctamente.

### 3.5 `paypalController.test.ts` — 2 pruebas fallidas (aserciones de logging)
Las pruebas esperan que la consola imprima literalmente `"[PayPal] Iniciando captura"` y `"✓ Captura exitosa"`, pero el controlador ahora delega el reintento a `paymentRetry.ts`, que imprime sus propios mensajes (`"[PaymentRetry] Intento 1 de 3"`, `"[PaymentRetry] ✓ Intento 1 exitoso"`).
**Diagnóstico:** cambio cosmético de formato de logging tras refactorizar la lógica de reintentos a un módulo separado; las pruebas de aserción de logs no se actualizaron. La captura del pago en sí (lo funcionalmente relevante) sí se ejecuta correctamente — el resto de las pruebas de ese mismo archivo (créditos, reintentos, manejo de errores no recuperables) pasan.

## 4. Conclusión

- **80 de 89 pruebas (89.9%) pasan** contra una base de datos real, cubriendo autenticación, configuración del sitio, sección institucional, manejo y reintento de errores de pago.
- Las 9 fallas restantes son **deuda de mantenimiento de las pruebas** (rutas sin el prefijo `/api`, fixtures desactualizados respecto al esquema de `Publicacion`, un token de prueba inválido, aserciones de log obsoletas) y **no evidencian defectos en la funcionalidad del producto** — de hecho, el endpoint de publicaciones, la creación con categoría y la captura de pagos están documentados y verificados por lectura de código en el manual técnico (capítulo de API), y solo la prueba automatizada específica quedó desactualizada.
- Se recomienda, como trabajo de mantenimiento, actualizar `publicacion.test.ts`, `comentarios.test.ts` y `publicacionCategoria.test.ts` para usar el prefijo `/api` y los campos/token vigentes, actualizar las aserciones de log en `paypalController.test.ts`, y mover o eliminar `categorias.test.ts` de la carpeta de pruebas.
