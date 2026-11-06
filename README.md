# Frontend - BP

Autor: Ing. Adrian Veas.

[Repositorio en GitHub](https://github.com/adrianveas-dev/frontend-bp)

Aplicación para administrar productos financieros. Permite buscar, listar, agregar, editar y eliminar productos.

La carpeta frontend-bp contiene Angular y el middleware Node.js. La carpeta backend-bp contiene la API con Express. Cada proyecto tiene sus propias dependencias y pruebas.

## Requisitos

Node.js 24.19 de la rama 24 y npm 11.
Puertos 4200, 4201 y 3002 disponibles.

## Instalación

Desde la carpeta principal:

    npm ci --prefix backend-bp
    npm ci --prefix frontend-bp

## Configuración

En una instalación nueva, copiar .env.example a .env dentro de cada proyecto.

Generar una clave privada:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Usar esa misma clave en BP_API_KEY en ambos archivos .env.

En el .env del frontend, configurar también estos valores:

    BP_BACKEND_URL=http://127.0.0.1:3002
    BP_MIDDLEWARE_PORT=4201
    BP_FRONTEND_PORT=4200

Los archivos .env no se suben al repositorio.

## Iniciar la aplicación

En una terminal:

    npm run start:dev --prefix backend-bp

En otra terminal:

    npm start --prefix frontend-bp

Abrir [la aplicación](http://127.0.0.1:4200).

El frontend inicia Angular y el middleware. El middleware se conecta al backend con la clave privada. La API devuelve 401 si se intenta acceder sin esa clave.

## Pruebas

    npm test --prefix backend-bp
    npm test --prefix frontend-bp

Para obtener la cobertura:

    npm run test:coverage --prefix backend-bp
    npm run test:coverage --prefix frontend-bp

Se usa Jest y se exige un mínimo del 70 por ciento de cobertura. Las pruebas del middleware y de la API necesitan conexiones locales.

## Compilación

    npm run build --prefix backend-bp
    npm run build --prefix frontend-bp

Para iniciar producción, detener los servidores de desarrollo y ejecutar estos comandos en terminales separadas:

    npm start --prefix backend-bp

    npm run start:prod --prefix frontend-bp

## Datos

Los productos se guardan en memoria. Recargar el navegador conserva los datos, pero reiniciar el backend los elimina.

## Documentación

[Dominio y arquitectura](https://docs.google.com/document/d/1_X_phGaBK4g7nDaxyJhIwYTmnyV_70XldUiC07FXBzo/edit)

[Resultados de pruebas](https://docs.google.com/document/d/1z_K7TeOnKTCGz3j43ixGn5d9OMwOxtGEcbgZ-9CfA6Q/edit)

El informe registra las pruebas anteriores al middleware. Los README de cada proyecto explican la configuración actual.
