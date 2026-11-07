# Frontend - BP

Autor: Ing. Adrian Veas.

[Repositorio en GitHub](https://github.com/adrianveas-dev/frontend-bp)

Interfaz Angular para administrar productos financieros. Permite listar, buscar, agregar, editar y eliminar productos. Incluye un middleware Node.js para conectarse con el backend usando una clave privada.

## Requisitos

Node.js 24.19 de la rama 24 y npm 11.
Puertos 4200 y 4201 disponibles.
Backend - BP iniciado en el puerto 3002.

## Instalación

Ejecutar desde esta carpeta:

    npm ci

## Configuración

En una instalación nueva, copiar .env.example a .env y completar los valores:

    BP_BACKEND_URL=http://127.0.0.1:3002
    BP_API_KEY=clave_privada_compartida
    BP_MIDDLEWARE_PORT=4201
    BP_FRONTEND_PORT=4200

Reemplazar la clave de ejemplo por la misma clave aleatoria del backend. Debe tener al menos 32 caracteres. El archivo .env no se sube al repositorio y sus valores no deben copiarse al código Angular.

## Ejecución

    npm start

Abrir [la aplicación](http://127.0.0.1:4200).

El comando inicia Angular y el middleware. El navegador usa la ruta local /bp/products. El middleware añade la clave y conecta con el backend.

Para iniciar solo el middleware:

    npm run start:middleware

## Pruebas

    npm test
    npm run test:coverage

Se ejecutan las pruebas de Angular y del middleware con Jest. Se exige un mínimo del 70 por ciento en líneas, sentencias, ramas y funciones. No hace falta iniciar el backend para estas pruebas.

Los reportes están en coverage/index.html y coverage-server/index.html. Las pruebas del middleware necesitan conexiones locales.

## Producción

    npm run build
    npm run start:prod

Detener antes los servidores de desarrollo. La compilación queda en dist/frontend-bp/browser. El servidor Node.js debe seguir activo para servir Angular y conectar con la API.

Los servidores escuchan en 127.0.0.1. Un despliegue remoto necesita un proxy y HTTPS. La clave protege la conexión con el backend; el proyecto no incluye inicio de sesión de usuarios.

## Documentación

Logos de prueba para el campo Logo:

[Tarjeta](https://raw.githubusercontent.com/adrianveas-dev/frontend-bp/main/frontend-bp/public/logos/tarjeta.svg)

[Ahorro](https://raw.githubusercontent.com/adrianveas-dev/frontend-bp/main/frontend-bp/public/logos/ahorro.svg)

[Inversión](https://raw.githubusercontent.com/adrianveas-dev/frontend-bp/main/frontend-bp/public/logos/inversion.svg)

[Dominio y arquitectura](https://docs.google.com/document/d/1_X_phGaBK4g7nDaxyJhIwYTmnyV_70XldUiC07FXBzo/edit)

[Resultados de pruebas](https://docs.google.com/document/d/1z_K7TeOnKTCGz3j43ixGn5d9OMwOxtGEcbgZ-9CfA6Q/edit)

El informe registra las pruebas anteriores al middleware. Este README describe su configuración actual.
