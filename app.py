from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import pyodbc
import base64
import os
import uuid
import random
import time
import re

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "evidencias")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def inicio():
    return send_from_directory(BASE_DIR, "index.html")


# =========================
# CONFIGURACIÓN DE CORREO (RECUPERAR CONTRASEÑA)
# =========================
# Si dejas esto vacío ("" en EMAIL_REMITENTE), la app NO intentará enviar un
# correo real: en su lugar, el código de verificación se imprimirá en la
# terminal donde corre app.py, para que puedas probar el flujo completo sin
# tener que configurar un correo real todavía.
#
# Para enviar correos reales con Gmail:
#   1. Activa la verificación en 2 pasos en la cuenta de Gmail que usarás.
#   2. Genera una "contraseña de aplicación" en https://myaccount.google.com/apppasswords
#   3. Pon ese correo y esa contraseña de aplicación abajo (NO tu contraseña normal de Gmail).
EMAIL_REMITENTE = ""          # Ejemplo: "focourbano.app@gmail.com"
EMAIL_PASSWORD = ""           # Contraseña de aplicación de Gmail (16 caracteres, sin espacios)
EMAIL_SMTP_HOST = "smtp.gmail.com"
EMAIL_SMTP_PORT = 587

# Guardamos los códigos de recuperación en memoria: { correo: {"codigo": "123456", "expira": timestamp} }
codigos_recuperacion = {}
CODIGO_VALIDEZ_SEGUNDOS = 10 * 60  # 10 minutos


def enviar_correo_codigo(correo_destino, codigo):
    """Intenta enviar el código por correo real. Si no hay credenciales
    configuradas, simplemente lo imprime en la terminal para pruebas."""
    if not EMAIL_REMITENTE or not EMAIL_PASSWORD:
        print("=" * 50)
        print(f"[FOCO URBANO] Código de recuperación para {correo_destino}: {codigo}")
        print("(No hay correo configurado en app.py, por eso solo se imprime aquí)")
        print("=" * 50)
        return True

    try:
        import smtplib
        from email.mime.text import MIMEText

        mensaje = MIMEText(
            f"Tu código de verificación para recuperar tu contraseña en Foco Urbano es: {codigo}\n\n"
            f"Este código vence en 10 minutos. Si no solicitaste este cambio, ignora este mensaje."
        )
        mensaje["Subject"] = "Foco Urbano - Código de recuperación"
        mensaje["From"] = EMAIL_REMITENTE
        mensaje["To"] = correo_destino

        with smtplib.SMTP(EMAIL_SMTP_HOST, EMAIL_SMTP_PORT) as servidor:
            servidor.starttls()
            servidor.login(EMAIL_REMITENTE, EMAIL_PASSWORD)
            servidor.sendmail(EMAIL_REMITENTE, [correo_destino], mensaje.as_string())

        return True
    except Exception as ex:
        print("⚠️ Error enviando correo de recuperación:", ex)
        return False


# CONEXIÓN A SQL SERVER
def get_conn():
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=localhost\\SQLEXPRESSADA;"
        "DATABASE=FocoUrbanoDB;"
        "Trusted_Connection=yes;"
    )


# =========================
# USUARIOS
# =========================

@app.route("/usuarios", methods=["GET"])
def get_usuarios():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.idUsuario, u.nombre, u.apellido, u.correo, r.nombreRol
        FROM Usuarios u
        JOIN Roles r ON u.idRol = r.idRol
    """)

    usuarios = []
    for u in cursor.fetchall():
        usuarios.append({
            "id": u[0],
            "nombre": u[1],
            "apellido": u[2],
            "correo": u[3],
            "rol": u[4]
        })

    conn.close()
    return jsonify(usuarios)


@app.route("/registro", methods=["POST"])
def registro():
    data = request.get_json(force=True) or {}

    nombre = (data.get("nombre") or "").strip()
    apellido = (data.get("apellido") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    contrasena = (data.get("contrasena") or "").strip()
    telefono = (data.get("telefono") or "").strip() or None

    if not nombre or not correo or not contrasena:
        return jsonify({"error": "Faltan campos obligatorios (nombre, correo, contraseña)."}), 400

    # Validar el formato del correo electrónico
    patron_correo = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"

    if not re.fullmatch(patron_correo, correo):
        return jsonify({
        "error": "Ingresa un correo electrónico válido."
    }), 400

    if len(contrasena) < 8:
       return jsonify({"error": "La contraseña debe tener al menos 8 caracteres."
    }), 400 

    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT idUsuario FROM Usuarios WHERE correo = ?", correo)
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Este correo ya está registrado."}), 409

    hash_pass = generate_password_hash(contrasena)

    # idRol = 1 -> Ciudadano (según tus INSERTs de Roles)
    cursor.execute("""
        INSERT INTO Usuarios (nombre, apellido, correo, contrasenaHash, telefono, idRol)
        VALUES (?, ?, ?, ?, ?, 1)
    """, nombre, apellido, correo, hash_pass, telefono)
    conn.commit()

    cursor.execute("""
        SELECT u.idUsuario, u.nombre, u.apellido, u.correo, r.nombreRol
        FROM Usuarios u JOIN Roles r ON u.idRol = r.idRol
        WHERE u.correo = ?
    """, correo)
    u = cursor.fetchone()
    conn.close()

    return jsonify({
        "id": u[0], "nombre": u[1], "apellido": u[2], "correo": u[3], "rol": u[4]
    }), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}

    correo = (data.get("correo") or "").strip().lower()
    contrasena = (data.get("contrasena") or "").strip()

    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.idUsuario, u.nombre, u.apellido, u.correo, u.contrasenaHash, r.nombreRol
        FROM Usuarios u JOIN Roles r ON u.idRol = r.idRol
        WHERE u.correo = ?
    """, correo)
    u = cursor.fetchone()
    conn.close()

    if not u:
        return jsonify({"error": "Correo o contraseña incorrectos."}), 401

    try:
        password_ok = check_password_hash(u[4], contrasena)
    except Exception:
        # La contraseña guardada no está hasheada (ej. usuarios demo antiguos)
        password_ok = (u[4] == contrasena)

    if not password_ok:
        return jsonify({"error": "Correo o contraseña incorrectos."}), 401

    return jsonify({
        "id": u[0], "nombre": u[1], "apellido": u[2], "correo": u[3], "rol": u[5]
    })


# =========================
# RECUPERAR CONTRASEÑA
# =========================

@app.route("/recuperar-password", methods=["POST"])
def recuperar_password():
    data = request.get_json(force=True) or {}
    correo = (data.get("correo") or "").strip().lower()

    if not correo:
        return jsonify({"error": "Ingresa un correo electrónico."}), 400

    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT idUsuario FROM Usuarios WHERE correo = ?", correo)
    existe = cursor.fetchone()
    conn.close()

    if not existe:
        return jsonify({"error": "No existe una cuenta con ese correo."}), 404

    codigo = str(random.randint(100000, 999999))
    codigos_recuperacion[correo] = {
        "codigo": codigo,
        "expira": time.time() + CODIGO_VALIDEZ_SEGUNDOS
    }

    enviado = enviar_correo_codigo(correo, codigo)
    if not enviado:
        return jsonify({"error": "No se pudo enviar el correo. Intenta de nuevo más tarde."}), 500

    respuesta = {"mensaje": "Código enviado correctamente."}

    # Como todavía no hay un correo real configurado (EMAIL_REMITENTE vacío),
    # devolvemos el código también en la respuesta para que la app lo muestre
    # como un mensaje dentro de la propia aplicación. Si más adelante
    # configuras un correo real en EMAIL_REMITENTE/EMAIL_PASSWORD, esto deja
    # de incluirse automáticamente y el código solo llegará por correo.
    if not EMAIL_REMITENTE or not EMAIL_PASSWORD:
        respuesta["codigoDemo"] = codigo

    return jsonify(respuesta)


@app.route("/verificar-codigo", methods=["POST"])
def verificar_codigo():
    data = request.get_json(force=True) or {}
    correo = (data.get("correo") or "").strip().lower()
    codigo = (data.get("codigo") or "").strip()

    registro_codigo = codigos_recuperacion.get(correo)

    if not registro_codigo:
        return jsonify({"error": "Primero solicita un código de recuperación."}), 400

    if time.time() > registro_codigo["expira"]:
        del codigos_recuperacion[correo]
        return jsonify({"error": "El código expiró. Solicita uno nuevo."}), 400

    if codigo != registro_codigo["codigo"]:
        return jsonify({"error": "El código ingresado no es válido."}), 400

    # Marcamos el código como verificado (permite el siguiente paso)
    registro_codigo["verificado"] = True

    return jsonify({"mensaje": "Código verificado correctamente."})


@app.route("/actualizar-password", methods=["POST"])
def actualizar_password():
    data = request.get_json(force=True) or {}
    correo = (data.get("correo") or "").strip().lower()
    nueva_contrasena = (data.get("nuevaContrasena") or "").strip()

    if not correo or not nueva_contrasena:
        return jsonify({"error": "Faltan datos para actualizar la contraseña."}), 400

    if len(nueva_contrasena) < 8:
         return jsonify({
        "error": "La contraseña debe tener al menos 8 caracteres."
    }), 400

    registro_codigo = codigos_recuperacion.get(correo)
    if not registro_codigo or not registro_codigo.get("verificado"):
        return jsonify({"error": "Debes verificar el código antes de cambiar la contraseña."}), 400

    hash_pass = generate_password_hash(nueva_contrasena)

    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE Usuarios SET contrasenaHash = ? WHERE correo = ?", hash_pass, correo)
    conn.commit()
    conn.close()

    codigos_recuperacion.pop(correo, None)

    return jsonify({"mensaje": "Contraseña actualizada correctamente."})


@app.route("/cambiar-password", methods=["POST"])
def cambiar_password():
    data = request.get_json(force=True) or {}
    idUsuario = data.get("idUsuario")
    contrasenaActual = (data.get("contrasenaActual") or "").strip()
    nuevaContrasena = (data.get("nuevaContrasena") or "").strip()

    if not idUsuario or not contrasenaActual or not nuevaContrasena:
        return jsonify({"error": "Faltan datos para cambiar la contraseña."}), 400

    if len(nuevaContrasena) < 8:
            return jsonify({
        "error": "La nueva contraseña debe tener al menos 8 caracteres."
    }), 400

    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT contrasenaHash FROM Usuarios WHERE idUsuario = ?", idUsuario)
    fila = cursor.fetchone()

    if not fila:
        conn.close()
        return jsonify({"error": "Usuario no encontrado."}), 404

    try:
        password_ok = check_password_hash(fila[0], contrasenaActual)
    except Exception:
        password_ok = (fila[0] == contrasenaActual)

    if not password_ok:
        conn.close()
        return jsonify({"error": "La contraseña actual es incorrecta."}), 401

    hash_pass = generate_password_hash(nuevaContrasena)
    cursor.execute("UPDATE Usuarios SET contrasenaHash = ? WHERE idUsuario = ?", hash_pass, idUsuario)
    conn.commit()
    conn.close()

    return jsonify({"mensaje": "Contraseña actualizada correctamente."})
# =========================
# CATÁLOGOS (para llenar los <select> dinámicamente)
# =========================

@app.route("/categorias", methods=["GET"])
def get_categorias():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT idCategoria, nombre FROM CategoriasReporte ORDER BY nombre")
    data = [{"id": c[0], "nombre": c[1]} for c in cursor.fetchall()]
    conn.close()
    return jsonify(data)


@app.route("/corregimientos", methods=["GET"])
def get_corregimientos():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT idCorregimiento, nombre FROM Corregimientos ORDER BY nombre")
    data = [{"id": c[0], "nombre": c[1]} for c in cursor.fetchall()]
    conn.close()
    return jsonify(data)


@app.route("/estados", methods=["GET"])
def get_estados():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT idEstado, nombre FROM EstadosReporte ORDER BY idEstado")
    data = [{"id": e[0], "nombre": e[1]} for e in cursor.fetchall()]
    conn.close()
    return jsonify(data)


# =========================
# REPORTES
# =========================

REPORTE_SELECT = """
    SELECT
        r.idReporte, r.titulo, r.descripcion,
        r.latitud, r.longitud, r.direccionAprox,
        r.fechaCreacion,
        e.idEstado, e.nombre AS estadoNombre,
        c.nombre AS categoriaNombre,
        co.nombre AS corregimientoNombre,
        u.idUsuario, u.nombre, u.apellido, u.correo,
        ev.urlImagen
    FROM Reportes r
    JOIN Usuarios u ON r.idUsuario = u.idUsuario
    JOIN EstadosReporte e ON r.idEstado = e.idEstado
    JOIN CategoriasReporte c ON r.idCategoria = c.idCategoria
    JOIN Corregimientos co ON r.idCorregimiento = co.idCorregimiento
    OUTER APPLY (
        SELECT TOP 1 urlImagen FROM EvidenciasReporte ev2
        WHERE ev2.idReporte = r.idReporte
        ORDER BY ev2.idEvidencia DESC
    ) ev
"""


def fila_a_reporte(r):
    return {
        "id": r[0],
        "titulo": r[1],
        "descripcion": r[2],
        "latitud": float(r[3]),
        "longitud": float(r[4]),
        "direccionAprox": r[5],
        "fecha": r[6].strftime("%d/%m/%Y %I:%M %p"),
        "idEstado": r[7],
        "estado": r[8],
        "categoria": r[9],
        "corregimiento": r[10],
        "idUsuario": r[11],
        "usuario": f"{r[12]} {r[13]}",
        "correoUsuario": r[14],
        "imagen": r[15]
    }


@app.route("/reportes", methods=["GET"])
def get_reportes():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(REPORTE_SELECT + " ORDER BY r.fechaCreacion DESC")
    reportes = [fila_a_reporte(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(reportes)


@app.route("/reportes/<int:id_reporte>", methods=["GET"])
def get_reporte_detalle(id_reporte):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(REPORTE_SELECT + " WHERE r.idReporte = ?", id_reporte)
    r = cursor.fetchone()
    conn.close()

    if not r:
        return jsonify({"error": "Reporte no encontrado"}), 404

    return jsonify(fila_a_reporte(r))


@app.route("/reportes", methods=["POST"])
def crear_reporte():
    data = request.get_json(force=True) or {}

    idUsuario = data.get("idUsuario")
    idCategoria = data.get("idCategoria")
    idCorregimiento = data.get("idCorregimiento")
    titulo = (data.get("titulo") or "").strip()
    descripcion = (data.get("descripcion") or "").strip()
    latitud = data.get("latitud")
    longitud = data.get("longitud")
    direccionAprox = (data.get("direccionAprox") or "").strip() or None
    imagenBase64 = data.get("imagen")

    if not all([idUsuario, idCategoria, idCorregimiento, titulo, descripcion]) or latitud is None or longitud is None:
        return jsonify({"error": "Faltan campos obligatorios."}), 400

    # ------------------------------------------
    # VALIDACIÓN DE EVIDENCIA FOTOGRÁFICA
    # ------------------------------------------

    imagen_bytes = None
    extension_imagen = None
    tamano_maximo = 5 * 1024 * 1024  # 5 MB

    if imagenBase64:

        if not isinstance(imagenBase64, str):
            return jsonify({
                "error": "La fotografía enviada no es válida."
            }), 400

        try:
            # Separar el encabezado Base64, si existe
            if imagenBase64.startswith("data:"):
                contenido = imagenBase64.split(",", 1)[1]
            else:
                contenido = imagenBase64

            # Evitar procesar imágenes excesivamente grandes
            if len(contenido) > ((tamano_maximo + 2) // 3) * 4:
                return jsonify({
                    "error": "La fotografía supera el límite de 5 MB."
                }), 413

            imagen_bytes = base64.b64decode(
                contenido,
                validate=True
            )

        except Exception:
            return jsonify({
                "error": "No se pudo procesar la fotografía."
            }), 400

        # Comprobar tamaño real
        if len(imagen_bytes) > tamano_maximo:
            return jsonify({
                "error": "La fotografía supera el límite de 5 MB."
            }), 413

        # Identificar formato mediante la firma del archivo
        if imagen_bytes.startswith(b"\xff\xd8\xff"):
            extension_imagen = "jpg"

        elif imagen_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            extension_imagen = "png"

        elif (
            imagen_bytes.startswith(b"RIFF")
            and imagen_bytes[8:12] == b"WEBP"
        ):
            extension_imagen = "webp"

        else:
            return jsonify({
                "error": "Formato no permitido. Utiliza JPG, PNG o WebP."
            }), 400

    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Reportes
            (idUsuario, idCategoria, idEstado, idCorregimiento, titulo, descripcion, latitud, longitud, direccionAprox)
        OUTPUT INSERTED.idReporte
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
    """, idUsuario, idCategoria, idCorregimiento, titulo, descripcion, latitud, longitud, direccionAprox)

    id_reporte = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO HistorialEstados (idReporte, idEstado, idUsuarioResponsable, comentario)
        VALUES (?, 1, ?, 'Reporte creado por el ciudadano.')
    """, id_reporte, idUsuario)

        # ------------------------------------------
    # GUARDAR EVIDENCIA FOTOGRÁFICA
    # ------------------------------------------

    if imagen_bytes is not None:

        filename = f"{uuid.uuid4().hex}.{extension_imagen}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        try:
            with open(filepath, "wb") as f:
                f.write(imagen_bytes)

            url_imagen = f"/static/evidencias/{filename}"

            cursor.execute("""
                INSERT INTO EvidenciasReporte (idReporte, urlImagen)
                VALUES (?, ?)
            """, id_reporte, url_imagen)

        except Exception as ex:
            print("Error guardando imagen:", ex)

            conn.rollback()

            if os.path.exists(filepath):
                os.remove(filepath)

            conn.close()

            return jsonify({
                "error": "No se pudo guardar la fotografía. Intenta nuevamente."
            }), 500

    # Notificar a todos los funcionarios municipales de que llegó un reporte nuevo
    try:
        cursor.execute("""
            SELECT u.idUsuario FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            WHERE r.nombreRol = 'Funcionario Municipal'
        """)
        funcionarios = cursor.fetchall()
        for f in funcionarios:
            cursor.execute("""
                INSERT INTO Notificaciones (idUsuario, idReporte, mensaje)
                VALUES (?, ?, ?)
            """, f[0], id_reporte, f"Nuevo reporte recibido: {titulo}")
    except Exception as ex:
        print("⚠️ Error creando notificaciones para funcionarios:", ex) 

    conn.commit()
    conn.close()

    return jsonify({"id": id_reporte, "mensaje": "Reporte creado correctamente."}), 201


@app.route("/reportes/<int:id_reporte>", methods=["PUT"])
def actualizar_reporte(id_reporte):
    data = request.get_json(force=True) or {}

    idEstado = data.get("idEstado")
    comentario = (data.get("comentario") or "").strip() or None
    idUsuarioResponsable = data.get("idUsuarioResponsable")

    if not idEstado:
        return jsonify({"error": "Falta el nuevo estado."}), 400

    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT idUsuario FROM Reportes WHERE idReporte = ?", id_reporte)
    fila = cursor.fetchone()
    if not fila:
        conn.close()
        return jsonify({"error": "Reporte no encontrado."}), 404

    idUsuarioReportador = fila[0]

    cursor.execute("""
        UPDATE Reportes SET idEstado = ?, fechaActualizacion = GETDATE()
        WHERE idReporte = ?
    """, idEstado, id_reporte)

    cursor.execute("""
        INSERT INTO HistorialEstados (idReporte, idEstado, idUsuarioResponsable, comentario)
        VALUES (?, ?, ?, ?)
    """, id_reporte, idEstado, idUsuarioResponsable, comentario)

    cursor.execute("SELECT nombre FROM EstadosReporte WHERE idEstado = ?", idEstado)
    nombreEstado = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO Notificaciones (idUsuario, idReporte, mensaje)
        VALUES (?, ?, ?)
    """, idUsuarioReportador, id_reporte, f"Tu reporte cambió de estado a {nombreEstado}.")

    conn.commit()
    conn.close()

    return jsonify({"mensaje": "Reporte actualizado correctamente."})


# =========================
# NOTIFICACIONES
# =========================

@app.route("/notificaciones/<int:id_usuario>", methods=["GET"])
def get_notificaciones(id_usuario):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT idNotificacion, mensaje, leida, fechaCreacion
        FROM Notificaciones
        WHERE idUsuario = ?
        ORDER BY fechaCreacion DESC
    """, id_usuario)

    notificaciones = []
    for n in cursor.fetchall():
        notificaciones.append({
            "id": n[0],
            "mensaje": n[1],
            "leida": bool(n[2]),
            "fecha": n[3].strftime("%d/%m/%Y %I:%M %p")
        })

    conn.close()
    return jsonify(notificaciones)


@app.route("/notificaciones/<int:id_notificacion>/leida", methods=["PUT"])
def marcar_notificacion_leida(id_notificacion):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE Notificaciones SET leida = 1 WHERE idNotificacion = ?", id_notificacion)
    conn.commit()
    conn.close()
    return jsonify({"mensaje": "Notificación marcada como leída."})


# =====================
#  ARCHIVOS ESTÁTICOS 
# =====================

@app.route("/static/evidencias/<path:filename>")
def servir_evidencia(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# =========================
# ARCHIVOS DEL FRONTEND
# =========================

@app.route("/<path:filename>")
def archivos_frontend(filename):
    extensiones = (".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp", ".gif")

    if not filename.lower().endswith(extensiones):
        return "Archivo no encontrado", 404

    return send_from_directory(BASE_DIR, filename)

# =========================
# INICIAR SERVIDOR
# =========================
if __name__ == "__main__":
    # host 0.0.0.0 permite que otros dispositivos en tu misma red (celular, etc.)
    # se conecten usando la IP local de esta computadora, ej: http://192.168.1.50:5000
    app.run(host="0.0.0.0", port=5000, debug=True)