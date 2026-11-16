# foco-urbano
Sistema de reportes urbanos - Proyecto de Ingeniería de Software II

# Foco Urbano

Sistema de reportes urbanos que permite a los ciudadanos registrar incidencias en su comunidad, consultar su estado y visualizar los reportes mediante un mapa. Cuenta con funcionalidades para ciudadanos y funcionarios municipales.

## 1. Tecnologías utilizadas

- Python.
- JavaScript.
- HTML5.
- CSS3.
- SQL Server.

## 2. Estructura del proyecto

```text
foco-urbano/
│
├── static/
├── app.py
├── app.js
├── index.html
├── styles.css
├── requirements.txt
├── migrar_passwords.py
└── README.md
```

## 3. Requisitos previos

- Python instalado.
- SQL Server instalado y configurado.
- Navegador web.
- Computadora y celular conectados a la misma red Wi-Fi (para pruebas desde dispositivos móviles).

## 4. Instalación

Instalar las dependencias del proyecto:

```bash
pip install -r requirements.txt
```

### Migración de contraseñas (opcional)

Los cuatro usuarios de prueba iniciales tienen contraseñas almacenadas en texto plano. El nuevo backend utiliza contraseñas hasheadas.

Para migrarlas, ejecutar:

```bash
python migrar_passwords.py
```

Este procedimiento convierte las contraseñas a hashes sin modificar las contraseñas originales utilizadas por los usuarios.

También es posible registrar nuevos ciudadanos desde la aplicación.

## 5. Configuración de red local

Para permitir que otros dispositivos accedan al sistema:

1. Obtener la dirección IPv4 de la computadora mediante:

```bash
ipconfig
```

2. Identificar la dirección IPv4 del adaptador de red utilizado.

3. Abrir `app.js` y configurar la dirección de la API:

```javascript
const API_URL = "http://192.168.1.50:5000";
```

Sustituir la dirección de ejemplo por la IP real de la computadora.

4. Si existen problemas de conexión, permitir las conexiones TCP entrantes por el puerto 5000 en el Firewall de Windows.

## 6. Ejecución del servidor

Ejecutar:

```bash
python app.py
```

El servidor debe iniciarse en:

```text
http://0.0.0.0:5000
```

## 7. Acceso a la aplicación

### Desde la computadora

Abrir `index.html` directamente en el navegador o utilizar:

```bash
python -m http.server 8080
```

Acceder mediante:

```text
http://localhost:8080
```

### Desde un dispositivo móvil

Conectar el celular a la misma red Wi-Fi que la computadora.

Si se utiliza el servidor HTTP anterior, acceder desde el navegador del celular mediante:

```text
http://IP-DE-TU-COMPUTADORA:8080
```

Es necesario servir los archivos desde la computadora; abrir directamente el archivo HTML desde el celular no funcionará.

## 8. Funcionalidades principales

- Registro e inicio de sesión.
- Creación de reportes urbanos.
- Registro de fotografías como evidencias.
- Captura de ubicación mediante GPS.
- Consulta y seguimiento de reportes.
- Visualización de reportes en mapas.
- Gestión de estados de los reportes.
- Notificaciones.
- Funcionalidades para ciudadanos y funcionarios municipales.

## 9. Cambios implementados

### Backend (`app.py`)

Se incorporaron los siguientes endpoints:

- `POST /registro`
- `POST /login`
- `GET/POST /reportes`
- `PUT /reportes/<id>`
- `GET /categorias`
- `GET /corregimientos`
- `GET /estados`
- `GET /notificaciones/<idUsuario>`

Las imágenes de evidencias se almacenan en `static/evidencias/`.

### Frontend (`app.js`)

Los usuarios, reportes y notificaciones se gestionan mediante SQL Server y la API. Las preferencias locales del dispositivo continúan utilizando `localStorage`.

### Interfaz (`index.html`)

Se incorporaron formularios de reportes con título, categoría y corregimiento, además de la funcionalidad para utilizar la ubicación GPS.

### Mapas

Se incorporaron marcadores que representan los reportes según sus coordenadas y estados.

## 10. Limitaciones conocidas

- El sistema utiliza un servidor de desarrollo con `debug=True` y no cuenta con HTTPS.
- El inicio de sesión almacena información del usuario en `localStorage`, sin implementar todavía sesiones seguras o tokens JWT.
- La aplicación está orientada a pruebas en una red local y no debe considerarse una implementación lista para producción.

## 11. Integrantes del equipo

Proyecto desarrollado por estudiantes de Ingeniería de Sistemas y Computación, como parte de la asignatura Ingeniería de Software II.

- Integrante 1: Adarlin Montenegro
- Integrante 2: Arelys Samudio
- Integrante 3: Alisson Montes
- Integrante 4: Yathniciell Rodriguez