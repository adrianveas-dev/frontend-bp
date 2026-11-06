# Backend - BP

[Repositorio en GitHub](https://github.com/adrianveas-dev/frontend-bp)

API Node.js con Express para administrar productos financieros. Recibe las solicitudes del middleware del frontend y guarda los productos en memoria.

## Requisitos

Node.js 24.19 de la rama 24 y npm 11.
Puerto 3002 disponible.

## Instalación

Ejecutar desde esta carpeta:

    npm ci

## Configuración

En una instalación nueva, copiar .env.example a .env.

Generar una clave privada:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Guardar el valor en BP_API_KEY y usar la misma clave en el frontend. Debe tener al menos 32 caracteres. El archivo .env no se sube al repositorio.

## Ejecución

    npm run start:dev

La API escucha en http://127.0.0.1:3002. Las solicitudes de productos requieren la cabecera X-BP-API-Key, que añade el middleware. Sin una clave válida, la API devuelve 401.

Los productos se pierden al reiniciar el backend. No se necesita una base de datos.

## Rutas

    GET /bp/products
    GET /bp/products/verification/:id
    GET /bp/products/:id
    POST /bp/products
    PUT /bp/products/:id
    DELETE /bp/products/:id

Permiten listar productos, verificar un ID, consultar, crear, editar y eliminar. La actualización recibe los cinco campos editables, sin ID en el cuerpo.

Las operaciones correctas devuelven 200. Los datos inválidos o duplicados devuelven 400 y los productos inexistentes, 404. Los errores de validación se detallan por campo.

## Validaciones

El ID debe ser único y tener entre 3 y 10 caracteres. El nombre acepta entre 5 y 100, y la descripción entre 10 y 200. El logo es obligatorio. No se aceptan textos vacíos o formados solo por espacios.

La liberación debe ser igual o posterior a hoy en America/Guayaquil. La revisión debe ser un año después. Si la liberación es un 29 de febrero, se usa el 28 de febrero cuando el año siguiente no es bisiesto. Las fechas se envían como YYYY-MM-DD y el ID no se puede cambiar al editar.

## Pruebas

    npm test
    npm run test:coverage

Se usa Jest y Supertest con datos aislados y conexiones locales. Se exige un mínimo del 70 por ciento en líneas, sentencias, ramas y funciones. El reporte está en coverage/index.html.

## Producción

    npm run build
    npm start

Detener antes el servidor de desarrollo. La compilación queda en dist. La API escucha en 127.0.0.1; un despliegue remoto necesita un proxy y HTTPS.

## Documentación

[Dominio y arquitectura](https://docs.google.com/document/d/1_X_phGaBK4g7nDaxyJhIwYTmnyV_70XldUiC07FXBzo/edit)

[Resultados de pruebas](https://docs.google.com/document/d/1z_K7TeOnKTCGz3j43ixGn5d9OMwOxtGEcbgZ-9CfA6Q/edit)

El informe registra las pruebas anteriores al middleware. El acceso con clave privada se describe en este README.
