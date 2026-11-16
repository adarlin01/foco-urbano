# Foco Urbano — Guía rápida para probarlo en red local

## 1. Instalar dependencias (en tu computadora, donde está SQL Server)

```
pip install -r requirements.txt
```

## 2. (Opcional pero recomendado) Migrar las contraseñas demo

Los 4 usuarios de prueba que insertó tu compañera tienen contraseña en texto
plano (`1234`, `2345`, etc.). El nuevo backend usa contraseñas hasheadas por
seguridad, así que esos usuarios no podrán iniciar sesión hasta que corras:

```
python migrar_passwords.py
```

Esto convierte esas contraseñas a hash **sin cambiarlas** — siguen usando el
mismo `1234`, `2345`, etc. al iniciar sesión.

Si prefieres no correr el script, simplemente crea usuarios nuevos desde la
pantalla de "Registrarse como ciudadano" de la app (esos sí quedan hasheados
automáticamente). Para un funcionario, tendrías que insertar uno nuevo a mano
con `idRol = 3` y una contraseña ya hasheada, o correr el script.

## 3. Encontrar la IP de tu computadora

- **Windows:** abre `cmd` y escribe `ipconfig`. Busca "Dirección IPv4" en tu
  adaptador de red (ej. `192.168.1.50`).
- **Mac/Linux:** `ifconfig` o `ip addr`.

Debe ser la IP de la red **Wi-Fi/LAN a la que también está conectado el celular**,
no `127.0.0.1` (esa solo funciona dentro de la misma máquina).

## 4. Configurar el frontend

Abre `app.js` y cambia esta línea con tu IP real:

```js
const API_URL = "http://192.168.1.50:5000";
```

## 5. Permitir el puerto 5000 en el firewall (Windows)

Si el celular no logra conectarse, es casi siempre el Firewall de Windows
bloqueando conexiones entrantes al puerto 5000. Agrega una regla de entrada
para permitir TCP 5000, o desactiva temporalmente el firewall de red privada
mientras pruebas.

## 6. Correr el servidor

```
python app.py
```

Debe decir algo como:
```
* Running on http://0.0.0.0:5000
```

## 7. Abrir la app

- **En tu computadora:** abre `index.html` directamente en el navegador (doble clic),
  o sírvelo con un servidor simple (`python -m http.server 8080`) y entra a
  `http://localhost:8080`.
- **En el celular (misma red Wi-Fi):** si serviste los archivos con
  `python -m http.server 8080` desde la misma compu, entra desde el celular a
  `http://<IP-de-tu-compu>:8080`. Abrir el archivo `.html` directamente desde
  el celular no funcionará porque el celular no tiene los archivos.

  **Recomendado:** copia la carpeta completa (`index.html`, `styles.css`,
  `app.js`, `fondo.jpeg`, etc.) a una carpeta y corre ese servidor simple
  desde ahí, en la misma computadora donde corre `app.py`.

## Qué cambió respecto a tu versión anterior

- `app.py`: ahora tiene `POST /registro`, `POST /login`, `GET/POST /reportes`,
  `PUT /reportes/<id>`, `GET /categorias`, `GET /corregimientos`, `GET /estados`,
  y `GET /notificaciones/<idUsuario>`. Las imágenes se guardan en
  `static/evidencias/` y se sirven como archivos estáticos.
- `app.js`: ya no usa `localStorage` para usuarios, reportes ni notificaciones
  (todo eso ahora vive en SQL Server y es visible para cualquier dispositivo
  conectado a la misma API). Sí sigue usando `localStorage` para preferencias
  puramente del dispositivo (modo oscuro, tamaño de letra, foto de perfil local).
- `index.html`: el formulario de crear reporte ahora tiene título, categoría y
  corregimiento (llenados dinámicamente desde la base de datos), y un botón
  "Usar mi ubicación" que captura GPS real del navegador para el mapa.
- El mapa (ciudadano y funcionario) ahora muestra marcadores reales según la
  latitud/longitud guardada de cada reporte, coloreados según su estado, y
  puedes tocar un marcador para ir directo al detalle del reporte.
- Se corrigió un bug en tu HTML original: la sección `scr-ayuda` estaba anidada
  dentro de la etiqueta `<nav>`, lo cual es inválido; ahora es una sección
  independiente.

## Limitaciones que debes saber

- Esto sigue siendo un servidor de desarrollo (`debug=True`, sin HTTPS). Está
  bien para pruebas en tu red de casa/universidad, pero no lo dejes así si
  algún día lo publicas en internet.
- No hay sesiones/tokens reales: el "login" simplemente guarda los datos del
  usuario en el `localStorage` de cada dispositivo. Cualquiera con acceso al
  mismo celular podría seguir "logueado". Para un proyecto académico está bien;
  para producción necesitarías JWT o sesiones de Flask.
