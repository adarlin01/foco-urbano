# Ejecuta esto UNA SOLA VEZ si quieres conservar los 4 usuarios de prueba
# (Arelys, Adarlin, Yani, Alisson) que tu compañera insertó con contraseña
# en texto plano ('1234', '2345', etc.). Esto las convierte en hash seguro
# manteniendo la MISMA contraseña, para que puedan seguir usándola con /login.
#
# Uso:
#   pip install pyodbc werkzeug
#   python migrar_passwords.py

import pyodbc
from werkzeug.security import generate_password_hash

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESSADA;"
    "DATABASE=FocoUrbanoDB;"
    "Trusted_Connection=yes;"
)
cursor = conn.cursor()

cursor.execute("SELECT idUsuario, contrasenaHash FROM Usuarios")
usuarios = cursor.fetchall()

actualizados = 0
for idUsuario, contrasenaActual in usuarios:
    # Si ya empieza con "pbkdf2:" o "scrypt:" ya está hasheada, se salta.
    if contrasenaActual.startswith("pbkdf2:") or contrasenaActual.startswith("scrypt:"):
        continue

    nuevo_hash = generate_password_hash(contrasenaActual)
    cursor.execute(
        "UPDATE Usuarios SET contrasenaHash = ? WHERE idUsuario = ?",
        nuevo_hash, idUsuario
    )
    actualizados += 1

conn.commit()
conn.close()

print(f"Listo. Se re-hashearon {actualizados} contraseña(s). Los usuarios pueden seguir iniciando sesión con su misma contraseña de antes.")
