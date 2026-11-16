// =====================================================
// FOCO URBANO - FRONTEND CONECTADO A FLASK + SQL SERVER
// =====================================================

// ⚠️ CAMBIA ESTO por la IP local de la computadora donde corre app.py

const API_URL = "http://172.19.172.106:5000"; 

// Coordenadas por defecto (centro de David, Chiriquí) si el GPS falla o se niega
const COORD_DAVID_DEFAULT = { lat: 8.4273, lng: -82.4308 };

let usuarioActual = null;
let todosLosReportes = [];
let filtroReporteActual = "todos";
let categoriasCache = [];
let corregimientosCache = [];
let estadosCache = [];
let ubicacionSeleccionada = null; // {lat, lng, precisa}
let filtroEstadoFuncionarioActual = "Todos";
let filtroCorregimientoFuncionarioActual = null; // null = todos los corregimientos

// -----------------------------
// NAVEGACIÓN ENTRE PANTALLAS
// -----------------------------
function cambiarPantalla(idPantalla) {
  const pantallaDestino = document.getElementById(idPantalla);

  if (!pantallaDestino) {
    alert("No existe la pantalla: " + idPantalla);
    return;
  }

  document.querySelectorAll(".screen").forEach((pantalla) => {
    pantalla.classList.remove("active");
  });

  pantallaDestino.classList.add("active");

  const navCiudadano = document.getElementById("bottom-nav");
  const navFuncionario = document.getElementById("bottom-nav-funcionario");

  const pantallasCiudadano = [
    "scr-home-ciudadano",
    "scr-crear-reporte",
    "scr-mis-reportes",
    "scr-detalle-reporte",
    "scr-mapa",
    "scr-notificaciones",
    "scr-ayuda"
  ];

  const pantallasFuncionario = [
    "scr-panel-funcionario",
    "scr-detalle-funcionario",
    "scr-mapa-funcionario",
    "scr-notificaciones-funcionario",
    "scr-perfil-funcionario",
    "scr-ayuda-funcionario"
  ];

  if (navCiudadano) {
    navCiudadano.style.display = pantallasCiudadano.includes(idPantalla) ? "flex" : "none";
  }

  if (navFuncionario) {
    navFuncionario.style.display = pantallasFuncionario.includes(idPantalla) ? "flex" : "none";
  }

  if (idPantalla === "scr-mis-reportes") {
    renderizarReportesCiudadano();
  }

  if (idPantalla === "scr-crear-reporte") {
    prepararFormularioReporte();
  }

  if (idPantalla === "scr-panel-funcionario") {
    renderizarReportesFuncionario();
  }

  if (idPantalla === "scr-mapa-funcionario") {
    setTimeout(inicializarMapaFuncionario, 200);
  }

  if (idPantalla === "scr-notificaciones") {
    renderizarNotificaciones();
  }

  if (idPantalla === "scr-notificaciones-funcionario") {
    renderizarNotificacionesFuncionario();
  }

  if (idPantalla === "scr-home-ciudadano") {
    actualizarNombreInicio();
  }

  if (idPantalla === "scr-mapa") {
    setTimeout(inicializarMapaDavid, 200);
  }

  if (idPantalla === "scr-perfil-funcionario") {
    actualizarPerfilFuncionario();
  }

  actualizarMenuActivo(idPantalla);
}

// -----------------------------
// USUARIOS: REGISTRO / LOGIN
// -----------------------------
async function registrarCiudadano() {
  const nombreCompleto = document.getElementById("reg-nombre").value.trim();
  const correo = document.getElementById("reg-correo").value.trim().toLowerCase();
  const pass = document.getElementById("reg-pass").value.trim();

  if (!nombreCompleto || !correo || !pass) {
    alert("Por favor completa todos los campos.");
    return;
  }

  if (pass.length < 4) {
    alert("La contraseña debe tener al menos 4 caracteres.");
    return;
  }

  const partes = nombreCompleto.split(" ");
  const nombre = partes[0];
  const apellido = partes.slice(1).join(" ") || "-";

  try {
    const res = await fetch(`${API_URL}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellido, correo, contrasena: pass })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo crear la cuenta.");
      return;
    }

    alert("Cuenta creada correctamente. Ahora puedes iniciar sesión.");

    document.getElementById("reg-nombre").value = "";
    document.getElementById("reg-correo").value = "";
    document.getElementById("reg-pass").value = "";

    cambiarPantalla("scr-login");
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
  }
}

async function loginCiudadano() {
  const correo = document.getElementById("login-correo").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena: pass })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Correo o contraseña incorrectos.");
      return;
    }

    usuarioActual = data;
    localStorage.setItem("foco_usuario_actual", JSON.stringify(usuarioActual));

    const checkRecordar = document.getElementById("check-recordar");
    if (checkRecordar && checkRecordar.checked) {
      localStorage.setItem("foco_correo_recordado", correo);
    } else {
      localStorage.removeItem("foco_correo_recordado");
    }

    document.getElementById("login-correo").value = "";
    document.getElementById("login-pass").value = "";

    if (data.rol === "Funcionario Municipal") {
      cambiarPantalla("scr-panel-funcionario");
    } else {
      cambiarPantalla("scr-home-ciudadano");
    }
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
  }
}

async function loginFuncionario() {
  const correo = document.getElementById("func-correo").value.trim().toLowerCase();
  const pass = document.getElementById("func-pass").value.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena: pass })
    });

    const data = await res.json();

    if (!res.ok || data.rol !== "Funcionario Municipal") {
      alert("Acceso denegado. Verifica tu correo institucional y contraseña.");
      return;
    }

    usuarioActual = data;
    localStorage.setItem("foco_usuario_actual", JSON.stringify(usuarioActual));

    document.getElementById("func-correo").value = "";
    document.getElementById("func-pass").value = "";

    cambiarPantalla("scr-panel-funcionario");
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
  }
}

function cerrarSesion() {
  usuarioActual = null;
  localStorage.removeItem("foco_usuario_actual");
  cambiarPantalla("scr-bienvenida");
}

function actualizarNombreInicio() {
  const nombre = document.getElementById("nombre-ciudadano");
  if (!nombre) return;

  if (usuarioActual && usuarioActual.nombre) {
    nombre.textContent = `Hola, ${usuarioActual.nombre.split(" ")[0]}`;
  } else {
    nombre.textContent = "Hola, ciudadano";
  }
}

// -----------------------------
// CATÁLOGOS DINÁMICOS (categorías / corregimientos / estados)
// -----------------------------
async function cargarCatalogos() {
  try {
    const [resCat, resCorr, resEst] = await Promise.all([
      fetch(`${API_URL}/categorias`),
      fetch(`${API_URL}/corregimientos`),
      fetch(`${API_URL}/estados`)
    ]);

    categoriasCache = await resCat.json();
    corregimientosCache = await resCorr.json();
    estadosCache = await resEst.json();
  } catch (error) {
    console.error("Error cargando catálogos:", error);
  }
}

function llenarSelect(selectId, lista, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  lista.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.nombre;
    select.appendChild(opt);
  });
}

async function prepararFormularioReporte() {
  if (categoriasCache.length === 0 || corregimientosCache.length === 0) {
    await cargarCatalogos();
  }

  llenarSelect("reporte-categoria", categoriasCache, "Selecciona una categoría");
  llenarSelect("reporte-corregimiento", corregimientosCache, "Selecciona un corregimiento");

  ubicacionSeleccionada = null;
  const estadoUbicacion = document.getElementById("estado-ubicacion");
  if (estadoUbicacion) {
    estadoUbicacion.textContent = "Ubicación no detectada todavía.";
  }
}

// -----------------------------
// UBICACIÓN (GPS)
// -----------------------------
function detectarUbicacionGPS() {
  const estadoUbicacion = document.getElementById("estado-ubicacion");

  if (!navigator.geolocation) {
    ubicacionSeleccionada = { ...COORD_DAVID_DEFAULT, precisa: false };
    if (estadoUbicacion) estadoUbicacion.textContent = "⚠️ Tu navegador no soporta GPS. Se usará una ubicación aproximada.";
    return;
  }

  if (estadoUbicacion) estadoUbicacion.textContent = "📡 Detectando tu ubicación...";

  navigator.geolocation.getCurrentPosition(
    (posicion) => {
      ubicacionSeleccionada = {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
        precisa: true
      };
      if (estadoUbicacion) {
        estadoUbicacion.textContent = `✅ Ubicación detectada (precisión ~${Math.round(posicion.coords.accuracy)}m).`;
      }
    },
    (error) => {
      console.warn("GPS no disponible:", error);
      ubicacionSeleccionada = { ...COORD_DAVID_DEFAULT, precisa: false };
      if (estadoUbicacion) {
        estadoUbicacion.textContent = "⚠️ No se pudo obtener el GPS. Se usará una ubicación aproximada de David.";
      }
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}


function actualizarNombreArchivoReporte(input) {
  const span = document.getElementById("nombre-archivo-reporte");
  if (!span) return;

  if (input.files && input.files[0]) {
    span.textContent = input.files[0].name;
  } else {
    span.textContent = "Seleccionar foto";
  }
}

// -----------------------------
// REPORTES: CREAR
// -----------------------------
function crearReporte() {
  if (!usuarioActual) {
    alert("Debes iniciar sesión antes de crear un reporte.");
    cambiarPantalla("scr-login");
    return;
  }

  const idCategoria = document.getElementById("reporte-categoria").value;
  const idCorregimiento = document.getElementById("reporte-corregimiento").value;
  const titulo = document.getElementById("reporte-titulo").value.trim();
  const descripcion = document.getElementById("reporte-descripcion").value.trim();
  const direccionAprox = document.getElementById("reporte-ubicacion").value.trim();
  const archivoImagen = document.getElementById("reporte-imagen").files[0];

  if (!idCategoria || !idCorregimiento || !titulo || !descripcion || !direccionAprox) {
    alert("Completa la categoría, el corregimiento, el título, la descripción y la referencia de ubicación.");
    return;
  }

  // La ubicación GPS es opcional: si el usuario no la usó, se envía una
  // ubicación aproximada de David como respaldo, con una pequeña variación
  // aleatoria para que los marcadores no queden apilados exactamente en el
  // mismo punto en el mapa.
  if (!ubicacionSeleccionada) {
    const jitter = () => (Math.random() - 0.5) * 0.02; // ~ ±1km aprox.
    ubicacionSeleccionada = {
      lat: COORD_DAVID_DEFAULT.lat + jitter(),
      lng: COORD_DAVID_DEFAULT.lng + jitter(),
      precisa: false
    };
  }

  if (archivoImagen) {
    const lector = new FileReader();
    lector.onload = function (e) {
      enviarReporteAlServidor(idCategoria, idCorregimiento, titulo, descripcion, direccionAprox, e.target.result);
    };
    lector.readAsDataURL(archivoImagen);
  } else {
    enviarReporteAlServidor(idCategoria, idCorregimiento, titulo, descripcion, direccionAprox, null);
  }
}

async function enviarReporteAlServidor(idCategoria, idCorregimiento, titulo, descripcion, direccionAprox, imagenBase64) {
  try {
    const res = await fetch(`${API_URL}/reportes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idUsuario: usuarioActual.id,
        idCategoria,
        idCorregimiento,
        titulo,
        descripcion,
        latitud: ubicacionSeleccionada.lat,
        longitud: ubicacionSeleccionada.lng,
        direccionAprox,
        imagen: imagenBase64
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo enviar el reporte.");
      return;
    }

    alert("Reporte enviado correctamente.");
    limpiarFormularioReporte();
    cambiarPantalla("scr-mis-reportes");
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
  }
}

function limpiarFormularioReporte() {
  document.getElementById("reporte-categoria").value = "";
  document.getElementById("reporte-corregimiento").value = "";
  document.getElementById("reporte-titulo").value = "";
  document.getElementById("reporte-descripcion").value = "";
  document.getElementById("reporte-ubicacion").value = "";
  document.getElementById("reporte-imagen").value = "";
  ubicacionSeleccionada = null;
}

// -----------------------------
// REPORTES: LISTAR / FILTRAR (CIUDADANO - VISTA TIPO RED SOCIAL, TODOS VEN TODOS)
// -----------------------------
function claseEstado(estado) {
  const e = (estado || "").toLowerCase();
  if (e.includes("pendiente")) return "pendiente";
  if (e.includes("proceso")) return "en-proceso";
  if (e.includes("revis")) return "revision";
  if (e.includes("resuelto")) return "resuelto";
  if (e.includes("rechaz")) return "rechazado";
  return "pendiente";
}

async function renderizarReportesCiudadano() {
  const contenedor = document.getElementById("lista-reportes-ciudadano");
  if (!contenedor) return;

  contenedor.innerHTML = "<p style='padding:14px;color:#6c7a71;'>Cargando reportes...</p>";

  try {
    const res = await fetch(`${API_URL}/reportes`);
    const data = await res.json();

    todosLosReportes = data;
    aplicarFiltroReportes();
  } catch (error) {
    console.error("Error cargando reportes:", error);
    contenedor.innerHTML = "<p style='padding:14px;color:#d9534f;'>No se pudo conectar con el servidor.</p>";
  }
}

function filtrarReportesCiudadano(estado) {
  filtroReporteActual = estado;

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.classList.remove("active-tab");
  });

  const map = {
    todos: "tab-todos",
    pendiente: "tab-pendiente",
    proceso: "tab-en-proceso",
    resuelto: "tab-resuelto",
    revision: "tab-revision",
    rechazado: "tab-rechazado"
  };

  if (map[estado]) {
    document.getElementById(map[estado]).classList.add("active-tab");
  }

  aplicarFiltroReportes();
}

function aplicarFiltroReportes() {
  const contenedor = document.getElementById("lista-reportes-ciudadano");
  if (!contenedor) return;

  let filtrados = todosLosReportes;

  if (filtroReporteActual !== "todos") {
    filtrados = todosLosReportes.filter((r) =>
      claseEstado(r.estado) === filtroReporteActual ||
      (r.estado || "").toLowerCase().includes(filtroReporteActual)
    );
  }

  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <img src="vacio.png" alt="Sin reportes">
        <p>No hay reportes en esta categoría todavía.</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = "";

  filtrados.forEach((r) => {
    const clase = claseEstado(r.estado);
    const imagenHTML = r.imagen
      ? `<img class="report-img" src="${API_URL}${r.imagen}" alt="Imagen del reporte">`
      : `<div class="report-img"><img class="report-img-logo" src="logo.png" alt="Foco Urbano"></div>`;

    contenedor.innerHTML += `
      <div class="report-card ${clase}" onclick="abrirDetalleReporte(${r.id})">
        ${imagenHTML}
        <div class="report-info">
          <h4>${r.titulo}</h4>
          <p class="report-user">👤 ${r.usuario} · ${r.corregimiento}</p>
          <p>${r.descripcion}</p>
          <span class="status ${clase}">${r.estado}</span>
        </div>
        <div class="arrow">›</div>
      </div>
    `;
  });
}

// -----------------------------
// DETALLE CIUDADANO
// -----------------------------
function abrirDetalleReporte(idReporte) {
  const reporte = todosLosReportes.find((r) => r.id === idReporte);

  if (!reporte) {
    alert("No se encontró el reporte.");
    return;
  }

  const contenedor = document.getElementById("detalle-reporte");

  const imagenHTML = reporte.imagen
    ? `<img class="detail-image" src="${API_URL}${reporte.imagen}" alt="Imagen del reporte">`
    : `<div class="detail-image" style="display:flex;align-items:center;justify-content:center;"><img class="detail-image-logo" src="logo.png" alt="Foco Urbano"></div>`;

  contenedor.innerHTML = `
    ${imagenHTML}
    <span class="status ${claseEstado(reporte.estado)}">${reporte.estado}</span>
    <h2>${reporte.titulo}</h2>
    <p><strong>Reportado por:</strong> ${reporte.usuario}</p>
    <p><strong>Categoría:</strong> ${reporte.categoria}</p>
    <p><strong>Fecha:</strong> ${reporte.fecha}</p>

    <div class="detail-box">
      <strong>Descripción</strong>
      <p>${reporte.descripcion}</p>
    </div>

    <div class="detail-box">
      <strong>Ubicación</strong>
      <p>${reporte.corregimiento}${reporte.direccionAprox ? " — " + reporte.direccionAprox : ""}</p>
    </div>
  `;

  cambiarPantalla("scr-detalle-reporte");
}

// -----------------------------
// PANEL FUNCIONARIO
// -----------------------------
async function renderizarReportesFuncionario(filtro = "Todos") {
  filtroEstadoFuncionarioActual = filtro;

  const contenedor = document.getElementById("lista-reportes-funcionario");
  if (!contenedor) return;

  contenedor.innerHTML = "<p style='padding:14px;color:#6c7a71;'>Cargando reportes...</p>";

  try {
    const res = await fetch(`${API_URL}/reportes`);
    const data = await res.json();
    todosLosReportes = data;

    let filtrados = data;
    if (filtro !== "Todos") {
      filtrados = filtrados.filter((r) => r.estado === filtro);
    }

    if (filtroCorregimientoFuncionarioActual) {
      filtrados = filtrados.filter((r) => r.corregimiento === filtroCorregimientoFuncionarioActual);
    }

    if (filtrados.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <img src="vacio.png" alt="Sin reportes">
          <p>No hay reportes recibidos todavía.</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    filtrados.forEach((reporte) => {
      contenedor.innerHTML += crearTarjetaReporteFuncionario(reporte);
    });
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = "<p style='padding:14px;color:#d9534f;'>No se pudo conectar con el servidor.</p>";
  }
}

function filtrarReportesFuncionario(estado) {
  document.querySelectorAll(".funcionario-tabs button").forEach((btn) => btn.classList.remove("active-tab"));

  const map = {
    "Todos": "func-tab-todos",
    "Pendiente": "func-tab-pendiente",
    "En proceso": "func-tab-en-proceso",
    "Resuelto": "func-tab-resuelto",
    "Rechazado": "func-tab-rechazado"
  };

  if (map[estado]) document.getElementById(map[estado]).classList.add("active-tab");

  renderizarReportesFuncionario(estado);
}

async function toggleSubmenuCorregimientos() {
  if (corregimientosCache.length === 0) {
    await cargarCatalogos();
  }

  document.getElementById("menu-orden-funcionario").classList.remove("show");

  const submenu = document.getElementById("submenu-corregimientos-funcionario");
  if (!submenu) return;

  let html = `<div onclick="mostrarMenuOrdenFuncionario()">← Volver</div>`;
  html += `<div onclick="seleccionarCorregimientoFuncionario(null, 'Todos')">Todos</div>`;

  corregimientosCache.forEach((c) => {
    html += `<div onclick="seleccionarCorregimientoFuncionario('${c.nombre}', '${c.nombre}')">${c.nombre}</div>`;
  });

  submenu.innerHTML = html;
  submenu.classList.add("show");
}

function seleccionarCorregimientoFuncionario(nombreCorregimiento, etiqueta) {
  filtroCorregimientoFuncionarioActual = nombreCorregimiento;

  const submenu = document.getElementById("submenu-corregimientos-funcionario");
  if (submenu) submenu.classList.remove("show");

  renderizarReportesFuncionario(filtroEstadoFuncionarioActual);

  mostrarToast(
    nombreCorregimiento
      ? `Mostrando reportes de ${etiqueta}.`
      : "Mostrando reportes de todos los corregimientos.",
    2500
  );
}

function crearTarjetaReporteFuncionario(reporte) {
  const imagenHTML = reporte.imagen
    ? `<img class="report-img" src="${API_URL}${reporte.imagen}" alt="Imagen del reporte">`
    : `<div class="report-img"><img class="report-img-logo" src="logo.png" alt="Foco Urbano"></div>`;

  return `
    <div class="report-card ${claseEstado(reporte.estado)}" onclick="abrirDetalleFuncionario(${reporte.id})">
      ${imagenHTML}
      <div class="report-info">
        <h4>${reporte.titulo}</h4>
        <p class="report-user">👤 ${reporte.usuario} · ${reporte.fecha}</p>
        <span class="status ${claseEstado(reporte.estado)}">${reporte.estado}</span>
      </div>
      <div class="arrow">›</div>
    </div>
  `;
}

function crearTarjetaAvisoFuncionario(reporte) {
  return `
    <div class="notification-card" style="cursor:pointer;" onclick="cambiarPantalla('scr-panel-funcionario'); setTimeout(() => abrirDetalleFuncionario(${reporte.id}), 150);">
      <strong>@${reporte.usuario}</strong> hizo un reporte de <strong>${reporte.categoria}</strong>
      <br><small>${reporte.fecha}</small>
    </div>
  `;
}

async function abrirDetalleFuncionario(idReporte) {
  if (estadosCache.length === 0) {
    await cargarCatalogos();
  }

  const reporte = todosLosReportes.find((r) => r.id === idReporte);

  if (!reporte) {
    alert("No se encontró el reporte.");
    return;
  }

  let contenedor = document.getElementById("detalle-funcionario");

  if (!contenedor) {
    // Si la pantalla no existe todavía en el HTML, la creamos dinámicamente
    const pantalla = document.createElement("section");
    pantalla.id = "scr-detalle-funcionario";
    pantalla.className = "screen funcionario-screen";
    pantalla.innerHTML = `
      <header class="top-header">
        <button onclick="cambiarPantalla('scr-panel-funcionario')">←</button>
        <h3>Detalle del reporte</h3>
      </header>
      <div id="detalle-funcionario" class="detail-container"></div>
    `;
    document.querySelector(".phone-container").appendChild(pantalla);
    contenedor = document.getElementById("detalle-funcionario");
  }

  const imagenHTML = reporte.imagen
    ? `<img class="detail-image" src="${API_URL}${reporte.imagen}" alt="Imagen del reporte">`
    : `<div class="detail-image" style="display:flex;align-items:center;justify-content:center;"><img class="detail-image-logo" src="logo.png" alt="Foco Urbano"></div>`;

  const opcionesEstado = estadosCache
    .map((e) => `<option value="${e.id}" ${e.nombre === reporte.estado ? "selected" : ""}>${e.nombre}</option>`)
    .join("");

  contenedor.innerHTML = `
    ${imagenHTML}
    <span class="status ${claseEstado(reporte.estado)}">${reporte.estado}</span>
    <h2>${reporte.titulo}</h2>
    <p><strong>Ciudadano:</strong> ${reporte.usuario} (${reporte.correoUsuario})</p>
    <p><strong>Categoría:</strong> ${reporte.categoria}</p>
    <p><strong>Fecha:</strong> ${reporte.fecha}</p>

    <div class="detail-box">
      <strong>Descripción</strong>
      <p>${reporte.descripcion}</p>
    </div>

    <div class="detail-box">
      <strong>Ubicación</strong>
      <p>${reporte.corregimiento}${reporte.direccionAprox ? " — " + reporte.direccionAprox : ""}</p>
    </div>

    <div class="admin-actions">
      <h3>Actualizar reporte</h3>

      <label>Nuevo estado</label>
      <select id="nuevo-estado">${opcionesEstado}</select>

      <label>Comentario del funcionario</label>
      <textarea id="comentario-funcionario" placeholder="Escribe una observación..."></textarea>

      <button class="btn-primary" onclick="actualizarReporteFuncionario(${reporte.id})">
        Guardar cambios
      </button>
    </div>
  `;

  cambiarPantalla("scr-detalle-funcionario");
}

async function actualizarReporteFuncionario(idReporte) {
  const idEstado = document.getElementById("nuevo-estado").value;
  const comentario = document.getElementById("comentario-funcionario").value.trim();

  try {
    const res = await fetch(`${API_URL}/reportes/${idReporte}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idEstado,
        comentario,
        idUsuarioResponsable: usuarioActual ? usuarioActual.id : null
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo actualizar el reporte.");
      return;
    }

    alert("Reporte actualizado correctamente.");
    cambiarPantalla("scr-panel-funcionario");
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor.");
  }
}

// -----------------------------
// NOTIFICACIONES (CIUDADANO)
// -----------------------------
async function renderizarNotificaciones() {
  const pantalla = document.getElementById("scr-notificaciones");
  if (!pantalla) return;

  let contenedor = pantalla.querySelector(".notificaciones-dinamicas");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.className = "notificaciones-dinamicas";
    pantalla.appendChild(contenedor);
  }

  if (!usuarioActual) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <img src="vacio.png" alt="Sin notificaciones">
        <p>Inicia sesión para ver tus notificaciones.</p>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/notificaciones/${usuarioActual.id}`);
    const notificaciones = await res.json();

    if (notificaciones.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <img src="vacio.png" alt="Sin notificaciones">
          <p>No tienes notificaciones nuevas.</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    notificaciones.forEach((n) => {
      contenedor.innerHTML += `
        <div class="notification-card">
          ${n.leida ? "" : "🟢 "}<strong>${n.mensaje}</strong>
          <br><small>${n.fecha}</small>
        </div>
      `;
    });
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = "<p style='padding:14px;color:#d9534f;'>No se pudo conectar con el servidor.</p>";
  }
}

// -----------------------------
// NOTIFICACIONES (FUNCIONARIO)
// -----------------------------
// Muestra, a modo de "avisos", TODOS los reportes hechos por los ciudadanos
// (los ya existentes y los que se vayan creando), con toda su información,
// en vez de depender únicamente de la tabla de notificaciones.
async function renderizarNotificacionesFuncionario() {
  const pantalla = document.getElementById("scr-notificaciones-funcionario");
  if (!pantalla) return;

  let contenedor = pantalla.querySelector(".notificaciones-dinamicas");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.className = "notificaciones-dinamicas";
    pantalla.appendChild(contenedor);
  }

  if (!usuarioActual) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <img src="vacio.png" alt="Sin notificaciones">
        <p>Inicia sesión para ver los avisos.</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = "<p style='padding:14px;color:#6c7a71;'>Cargando avisos...</p>";

  try {
    const res = await fetch(`${API_URL}/reportes`);
    const reportes = await res.json();

    todosLosReportes = reportes;

    if (reportes.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <img src="vacio.png" alt="Sin notificaciones">
          <p>No hay reportes de ciudadanos todavía.</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    reportes.forEach((reporte) => {
      contenedor.innerHTML += crearTarjetaAvisoFuncionario(reporte);
    });
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = "<p style='padding:14px;color:#d9534f;'>No se pudo conectar con el servidor.</p>";
  }
}

// -----------------------------
// MAPA (CIUDADANO) - REPORTES REALES DE TODOS LOS USUARIOS
// -----------------------------
let mapaDavid = null;
let marcadoresDavid = [];

async function inicializarMapaDavid() {
  const contenedorMapa = document.getElementById("mapa-david");
  if (!contenedorMapa) return;

  if (!mapaDavid) {
    mapaDavid = L.map("mapa-david").setView([COORD_DAVID_DEFAULT.lat, COORD_DAVID_DEFAULT.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(mapaDavid);
  } else {
    setTimeout(() => mapaDavid.invalidateSize(), 200);
  }

  await cargarMarcadoresReportes(mapaDavid, (m) => (marcadoresDavid = m), false);
}

let mapaFuncionario = null;
let marcadoresFuncionario = [];

async function inicializarMapaFuncionario() {
  const contenedor = document.getElementById("mapa-reportes-funcionario");
  if (!contenedor) return;

  // Reemplaza el placeholder estático por un mapa real la primera vez
  if (!mapaFuncionario) {
    contenedor.innerHTML = "";
    contenedor.style.padding = "0";
    contenedor.style.margin = "18px";
    contenedor.style.height = "540px";
    contenedor.style.borderRadius = "22px";
    contenedor.style.overflow = "hidden";
    contenedor.id = "mapa-funcionario-real";

    mapaFuncionario = L.map("mapa-funcionario-real").setView([COORD_DAVID_DEFAULT.lat, COORD_DAVID_DEFAULT.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(mapaFuncionario);
  } else {
    setTimeout(() => mapaFuncionario.invalidateSize(), 200);
  }

  await cargarMarcadoresReportes(mapaFuncionario, (m) => (marcadoresFuncionario = m), true);
}

const COLOR_POR_ESTADO = {
  "pendiente": "#f6c85f",
  "en-proceso": "#4a90e2",
  "revision": "#1b5eaa",
  "resuelto": "#017765",
  "rechazado": "#d9534f"
};

async function cargarMarcadoresReportes(mapa, guardarMarcadores, esFuncionario) {
  // limpiar marcadores previos
  const marcadoresActuales = esFuncionario ? marcadoresFuncionario : marcadoresDavid;
  marcadoresActuales.forEach((m) => mapa.removeLayer(m));

  try {
    const res = await fetch(`${API_URL}/reportes`);
    const reportes = await res.json();

    const nuevosMarcadores = reportes.map((r) => {
      const clase = claseEstado(r.estado);
      const color = COLOR_POR_ESTADO[clase] || "#017765";

      const icono = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marcador = L.marker([r.latitud, r.longitud], { icon: icono }).addTo(mapa);

      const botonAccion = esFuncionario
        ? `<button onclick="cambiarPantalla('scr-panel-funcionario'); setTimeout(() => abrirDetalleFuncionario(${r.id}), 150);" style="margin-top:6px;padding:5px 10px;border:none;border-radius:8px;background:#017765;color:white;font-size:11px;">Gestionar</button>`
        : `<button onclick="cambiarPantalla('scr-mis-reportes'); setTimeout(() => abrirDetalleReporte(${r.id}), 150);" style="margin-top:6px;padding:5px 10px;border:none;border-radius:8px;background:#017765;color:white;font-size:11px;">Ver detalle</button>`;

      marcador.bindPopup(`
        <strong>${r.titulo}</strong><br>
        ${r.categoria}<br>
        👤 ${r.usuario}<br>
        Estado: ${r.estado}<br>
        ${botonAccion}
      `);

      return marcador;
    });

    guardarMarcadores(nuevosMarcadores);
  } catch (error) {
    console.error("Error cargando reportes en el mapa:", error);
  }
}

// -----------------------------
// MENÚ LATERAL CIUDADANO
// -----------------------------
function abrirMenuCiudadano() {
  actualizarMenuCiudadano();
  document.getElementById("menu-ciudadano").classList.add("open");
}

function cerrarMenuCiudadano() {
  document.getElementById("menu-ciudadano").classList.remove("open");
}

async function actualizarMenuCiudadano() {
  const nombre = document.getElementById("drawer-nombre-ciudadano");
  const correo = document.getElementById("drawer-correo-ciudadano");
  const contador = document.getElementById("contador-reportes-menu");
  const lista = document.getElementById("lista-reportes-menu");

  if (usuarioActual) {
    nombre.textContent = `${usuarioActual.nombre} ${usuarioActual.apellido || ""}`.trim();
    correo.textContent = usuarioActual.correo || "correo@ejemplo.com";
  }

  if (!usuarioActual) {
    contador.textContent = "Reportes realizados: 0";
    lista.innerHTML = `<p style="font-size:12px; color:#6c7a71;">Inicia sesión para ver tu historial.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/reportes`);
    const data = await res.json();

    const misReportes = data.filter((r) => r.correoUsuario === usuarioActual.correo);

    contador.textContent = `Reportes realizados: ${misReportes.length}`;

    if (misReportes.length === 0) {
      lista.innerHTML = `<p style="font-size:12px; color:#6c7a71;">Aún no has realizado reportes.</p>`;
      return;
    }

    lista.innerHTML = "";
    misReportes.forEach((reporte) => {
      lista.innerHTML += `
        <div class="menu-report-item">
          <strong>${reporte.titulo}</strong>
          <small>${reporte.estado}</small>
        </div>
      `;
    });
  } catch (error) {
    console.error(error);
    lista.innerHTML = `<p style="font-size:12px; color:#d9534f;">No se pudo conectar con el servidor.</p>`;
  }
}

function cambiarFotoCiudadano(input) {
  if (!input.files || !input.files[0]) return;

  const lector = new FileReader();
  lector.onload = function (e) {
    document.getElementById("foto-ciudadano").src = e.target.result;
    localStorage.setItem("foco_foto_ciudadano", e.target.result);
  };
  lector.readAsDataURL(input.files[0]);
}


function cambiarFotoFuncionario(input) {
  if (!input.files || !input.files[0]) return;

  const lector = new FileReader();

  lector.onload = function (e) {
    const foto = document.getElementById("foto-funcionario");
    if (foto) foto.src = e.target.result;

    localStorage.setItem("foco_foto_funcionario", e.target.result);
  };

  lector.readAsDataURL(input.files[0]);
}


// Preferencias visuales: son por dispositivo, así que sí se guardan localmente
function activarModoOscuroCiudadano(activado) {
  const phone = document.querySelector(".phone-container");
  if (activado) {
    phone.classList.add("dark-mode");
    localStorage.setItem("foco_modo_oscuro", "true");
  } else {
    phone.classList.remove("dark-mode");
    localStorage.setItem("foco_modo_oscuro", "false");
  }

  // Mantiene sincronizados los dos interruptores (ciudadano y funcionario)
  const checkCiudadano = document.getElementById("check-modo-oscuro");
  const checkFuncionario = document.getElementById("check-modo-oscuro-func");
  if (checkCiudadano) checkCiudadano.checked = activado;
  if (checkFuncionario) checkFuncionario.checked = activado;
}

function cambiarTamanoLetraCiudadano(valor) {
  const phone = document.querySelector(".phone-container");
  phone.classList.remove("font-large", "font-small");
  if (valor === "grande") phone.classList.add("font-large");
  if (valor === "pequena") phone.classList.add("font-small");
  localStorage.setItem("foco_tamano_letra", valor);

  // Mantiene sincronizados los dos selectores (ciudadano y funcionario)
  const selectCiudadano = document.getElementById("select-tamano-letra");
  const selectFuncionario = document.getElementById("select-tamano-letra-func");
  if (selectCiudadano) selectCiudadano.value = valor;
  if (selectFuncionario) selectFuncionario.value = valor;
}

function actualizarMenuActivo(idPantalla) {
  document.querySelectorAll("#bottom-nav button").forEach((btn) => {
    btn.classList.remove("active-nav");
  });

  if (idPantalla === "scr-home-ciudadano") document.getElementById("nav-inicio").classList.add("active-nav");
  if (idPantalla === "scr-mis-reportes" || idPantalla === "scr-detalle-reporte") document.getElementById("nav-reportes").classList.add("active-nav");
  if (idPantalla === "scr-mapa") document.getElementById("nav-mapa").classList.add("active-nav");
  if (idPantalla === "scr-notificaciones") document.getElementById("nav-avisos").classList.add("active-nav");

  document.querySelectorAll("#bottom-nav-funcionario button").forEach((btn) => {
    btn.classList.remove("active-nav");
  });

  if (idPantalla === "scr-panel-funcionario" || idPantalla === "scr-detalle-funcionario") {
    document.getElementById("nav-func-inicio").classList.add("active-nav");
  }
  if (idPantalla === "scr-mapa-funcionario") document.getElementById("nav-func-mapa").classList.add("active-nav");
  if (idPantalla === "scr-notificaciones-funcionario") document.getElementById("nav-func-avisos").classList.add("active-nav");
  if (idPantalla === "scr-perfil-funcionario" || idPantalla === "scr-ayuda-funcionario") {
    document.getElementById("nav-func-perfil").classList.add("active-nav");
  }
}

function abrirAyudaApp() {
  cambiarPantalla("scr-ayuda");
}

function toggleFaq(elemento) {
  const item = elemento.parentElement;
  item.classList.toggle("open");
}

function enviarFeedback() {
  mostrarToast("¡Gracias por tu comentario! Nos ayuda a mejorar Foco Urbano 💚", 6000);
}

function mostrarProximamente() {
  mostrarToast("El inicio de sesión con Google y Apple estará disponible muy pronto.", 6000);
}

function mostrarMenuOrdenFuncionario() {
  const submenu = document.getElementById("submenu-corregimientos-funcionario");
  if (submenu) submenu.classList.remove("show");

  const menu = document.getElementById("menu-orden-funcionario");
  if (menu) menu.classList.toggle("show");
}

function cambiarOrdenFuncionario(orden) {
  todosLosReportes.sort((a, b) => (orden === "desc" ? b.id - a.id : a.id - b.id));
  const contenedor = document.getElementById("lista-reportes-funcionario");
  contenedor.innerHTML = "";
  todosLosReportes.forEach((r) => (contenedor.innerHTML += crearTarjetaReporteFuncionario(r)));
  document.getElementById("menu-orden-funcionario").classList.remove("show");
}

// -----------------------------
// PERFIL FUNCIONARIO
// -----------------------------
function actualizarPerfilFuncionario() {
  const nombre = document.getElementById("nombre-funcionario");
  const correo = document.getElementById("correo-funcionario");

  if (usuarioActual) {
    if (nombre) nombre.textContent = `${usuarioActual.nombre} ${usuarioActual.apellido || ""}`.trim();
    if (correo) correo.textContent = usuarioActual.correo || "funcionario@municipio.com";
  }

  // Sincroniza los controles de configuración con las preferencias guardadas
  const modoOscuro = localStorage.getItem("foco_modo_oscuro") === "true";
  const checkFuncionario = document.getElementById("check-modo-oscuro-func");
  if (checkFuncionario) checkFuncionario.checked = modoOscuro;

  const tamanoLetra = localStorage.getItem("foco_tamano_letra") || "normal";
  const selectFuncionario = document.getElementById("select-tamano-letra-func");
  if (selectFuncionario) selectFuncionario.value = tamanoLetra;
  }

// -----------------------------
// SOPORTE (FUNCIONARIO)
// -----------------------------
function abrirModalSoporteFuncionario() {
  const modal = document.getElementById("modal-soporte-funcionario");
  const textarea = document.getElementById("mensaje-soporte-funcionario");
  if (textarea) textarea.value = "";
  if (modal) modal.classList.add("show");
}

function cerrarModalSoporteFuncionario() {
  const modal = document.getElementById("modal-soporte-funcionario");
  if (modal) modal.classList.remove("show");
}

function enviarSoporteFuncionario() {
  const textarea = document.getElementById("mensaje-soporte-funcionario");
  const mensaje = textarea ? textarea.value.trim() : "";

  if (!mensaje) {
    alert("Escribe un mensaje antes de enviarlo.");
    return;
  }

  // Aquí, más adelante, se puede conectar a un endpoint real (ej. POST /soporte)
  cerrarModalSoporteFuncionario();
  mostrarToast("Gracias por escribirnos. Nuestro equipo lo revisará.", 4000);
}

// -----------------------------
// RECUPERAR CONTRASEÑA
// -----------------------------
let correoRecuperacion = "";

function enviarCodigoRecuperacion() {
  const inputCorreo = document.getElementById("recuperar-correo");
  const correo = inputCorreo.value.trim().toLowerCase();

  if (!correo) {
    alert("Ingresa tu correo electrónico.");
    return;
  }

  correoRecuperacion = correo;

  fetch(`${API_URL}/recuperar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo })
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        alert((data && data.error) || "No se pudo enviar el código a ese correo.");
        return;
      }

      document.getElementById("recuperar-codigo").value = "";
      cambiarPantalla("scr-recuperar-codigo");

      // Mientras no haya un correo real configurado en app.py, el backend
      // devuelve el código aquí mismo para poder mostrarlo como mensaje
      // dentro de la app (en vez de tener que revisar la terminal).
      if (data && data.codigoDemo) {
        setTimeout(() => {
          mostrarToast(`Tu código de verificación es: ${data.codigoDemo}`, 8000);
        }, 300);
      }
    })
    .catch((error) => {
      console.error(error);
      alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
    });
}

function verificarCodigoRecuperacion() {
  const codigo = document.getElementById("recuperar-codigo").value.trim();

  if (!codigo) {
    alert("Ingresa el código que recibiste por correo.");
    return;
  }

  fetch(`${API_URL}/verificar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correoRecuperacion, codigo })
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        alert((data && data.error) || "El código ingresado no es válido.");
        return;
      }

      document.getElementById("recuperar-nueva-pass").value = "";
      document.getElementById("recuperar-confirmar-pass").value = "";
      cambiarPantalla("scr-recuperar-nueva");
    })
    .catch((error) => {
      console.error(error);
      alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
    });
}

function guardarNuevaPasswordRecuperacion() {
  const nueva = document.getElementById("recuperar-nueva-pass").value.trim();
  const confirmar = document.getElementById("recuperar-confirmar-pass").value.trim();

  if (!nueva || !confirmar) {
    alert("Completa los dos campos de contraseña.");
    return;
  }

  if (nueva.length < 4) {
    alert("La contraseña debe tener al menos 4 caracteres.");
    return;
  }

  if (nueva !== confirmar) {
    alert("Las contraseñas no coinciden. Vuelve a escribirlas.");
    return;
  }

  fetch(`${API_URL}/actualizar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correoRecuperacion, nuevaContrasena: nueva })
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        alert((data && data.error) || "No se pudo actualizar la contraseña.");
        return;
      }

      document.getElementById("recuperar-correo").value = "";
      document.getElementById("recuperar-codigo").value = "";
      document.getElementById("recuperar-nueva-pass").value = "";
      document.getElementById("recuperar-confirmar-pass").value = "";
      correoRecuperacion = "";

      cambiarPantalla("scr-login");
      mostrarToast("Su contraseña ha sido actualizada con éxito.");
    })
    .catch((error) => {
      console.error(error);
      alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo y que API_URL sea correcta.");
    });
}


// -----------------------------
// CAMBIAR CONTRASEÑA (DESDE EL PERFIL)
// -----------------------------
let pantallaAntesDeCambiarPassword = null;

function abrirCambiarPasswordCiudadano() {
  if (!usuarioActual) {
    alert("Debes iniciar sesión para cambiar tu contraseña.");
    return;
  }

  const pantallaActiva = document.querySelector(".screen.active");
  pantallaAntesDeCambiarPassword = pantallaActiva ? pantallaActiva.id : "scr-home-ciudadano";

  document.getElementById("cambiar-pass-actual").value = "";
  document.getElementById("cambiar-pass-nueva").value = "";
  document.getElementById("cambiar-pass-confirmar").value = "";

  cerrarMenuCiudadano();
  cambiarPantalla("scr-cambiar-password-ciudadano");
}

function volverDesdeCambiarPassword() {
  cambiarPantalla(pantallaAntesDeCambiarPassword || "scr-home-ciudadano");
  abrirMenuCiudadano(); // vuelve a abrir el panel de perfil, tal como pediste
}

function guardarCambioPasswordCiudadano() {
  const actual = document.getElementById("cambiar-pass-actual").value.trim();
  const nueva = document.getElementById("cambiar-pass-nueva").value.trim();
  const confirmar = document.getElementById("cambiar-pass-confirmar").value.trim();

  if (!actual || !nueva || !confirmar) {
    alert("Completa todos los campos.");
    return;
  }

  if (nueva.length < 4) {
    alert("La nueva contraseña debe tener al menos 4 caracteres.");
    return;
  }

  if (nueva !== confirmar) {
    alert("Las contraseñas nuevas no coinciden.");
    return;
  }

  fetch(`${API_URL}/cambiar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idUsuario: usuarioActual.id,
      contrasenaActual: actual,
      nuevaContrasena: nueva
    })
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        alert((data && data.error) || "No se pudo actualizar la contraseña.");
        return;
      }

      mostrarToast("Tu contraseña ha sido actualizada con éxito.");
      volverDesdeCambiarPassword();
    })
    .catch((error) => {
      console.error(error);
      alert("No se pudo conectar con el servidor. Verifica que app.py esté corriendo.");
    });
}

// -----------------------------
// MENSAJE FLOTANTE (TOAST)
// -----------------------------
function mostrarToast(mensaje, duracionMs = 3500) {
  const toast = document.getElementById("toast-mensaje");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duracionMs);
}

// -----------------------------
// INICIO DE LA APP
// -----------------------------
window.addEventListener("load", function () {
  usuarioActual = JSON.parse(localStorage.getItem("foco_usuario_actual") || "null");
  actualizarNombreInicio();

  const fotoFuncionarioGuardada = localStorage.getItem("foco_foto_funcionario");
  const fotoFuncionario = document.getElementById("foto-funcionario");

  if (fotoFuncionarioGuardada && fotoFuncionario) {
  fotoFuncionario.src = fotoFuncionarioGuardada;
  }


  const fotoGuardada = localStorage.getItem("foco_foto_ciudadano");
  if (fotoGuardada) document.getElementById("foto-ciudadano").src = fotoGuardada;

  const modoOscuro = localStorage.getItem("foco_modo_oscuro") === "true";
  const checkOscuro = document.getElementById("check-modo-oscuro");
  if (checkOscuro) checkOscuro.checked = modoOscuro;
  const checkOscuroFunc = document.getElementById("check-modo-oscuro-func");
  if (checkOscuroFunc) checkOscuroFunc.checked = modoOscuro;
  activarModoOscuroCiudadano(modoOscuro);


  const tamanoLetra = localStorage.getItem("foco_tamano_letra") || "normal";
  const selectLetra = document.getElementById("select-tamano-letra");
  if (selectLetra) selectLetra.value = tamanoLetra;
  const selectLetraFunc = document.getElementById("select-tamano-letra-func");
  if (selectLetraFunc) selectLetraFunc.value = tamanoLetra;
  cambiarTamanoLetraCiudadano(tamanoLetra);

  const correoRecordado = localStorage.getItem("foco_correo_recordado");
  if (correoRecordado) {
    const inputCorreoLogin = document.getElementById("login-correo");
    const checkRecordarInicio = document.getElementById("check-recordar");
    if (inputCorreoLogin) inputCorreoLogin.value = correoRecordado;
    if (checkRecordarInicio) checkRecordarInicio.checked = true;
  }

  cargarCatalogos();

  const pantallaActiva = document.querySelector(".screen.active");
  if (pantallaActiva && pantallaActiva.classList.contains("with-nav")) {
    document.getElementById("bottom-nav").style.display = "flex";
  } else {
    document.getElementById("bottom-nav").style.display = "none";
  }
});