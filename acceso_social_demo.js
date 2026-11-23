/*
 * FOCO URBANO - Demostración de acceso social (Google y Apple)
 * No utiliza OAuth, Google, Apple ID ni biometría real.
 * Solo prepara el formulario normal de registro con cuentas de ejemplo.
 */

const FOCO_SOCIAL_DEMO = {
  google: {
    nombre: "Adarlin Montenegro",
    correo: "adarlin.montenegro@gmail.com"
  },
  googleAlternativa: {
    nombre: "Ciudadano de Prueba",
    correo: "ciudadano.focourbano@gmail.com"
  },
  apple: {
    nombre: "Adarlin Montenegro",
    correo: "adarlin.montenegro@icloud.com"
  }
};

let focoSocialTemporizadores = [];

function focoSocialProgramar(funcion, espera) {
  const id = window.setTimeout(funcion, espera);
  focoSocialTemporizadores.push(id);
}

function cerrarDemoSocial() {
  focoSocialTemporizadores.forEach((id) => window.clearTimeout(id));
  focoSocialTemporizadores = [];
  const ventana = document.getElementById("social-demo-root");
  if (ventana) ventana.remove();
}

function focoSocialMarco(contenido, tipo = "google") {
  let ventana = document.getElementById("social-demo-root");
  if (!ventana) {
    ventana = document.createElement("div");
    ventana.id = "social-demo-root";
    (document.querySelector(".phone-container") || document.body).appendChild(ventana);
    ventana.addEventListener("click", (evento) => {
      const control = evento.target.closest("[data-demo-action]");
      if (!control) return;
      const accion = control.dataset.demoAction;
      if (accion === "cerrar") cerrarDemoSocial();
      if (accion === "google-cuentas") focoSocialGoogleCuentas();
      if (accion === "google-adarlin") focoSocialIrRegistro(FOCO_SOCIAL_DEMO.google, "Google");
      if (accion === "google-otra") focoSocialIrRegistro(FOCO_SOCIAL_DEMO.googleAlternativa, "Google");
      if (accion === "apple-faceid") focoSocialAppleFaceId();
    });
  }
  ventana.className = `sd-mode-${tipo}`;
  ventana.innerHTML = `
    <div class="sd-backdrop" data-demo-action="cerrar"></div>
    ${contenido}
  `;
}

// Google: autorización ilustrativa -> selector de cuenta de prueba -> formulario.
function focoSocialGooglePermiso() {
  focoSocialMarco(`
    <section class="sd-sheet sd-google-permission"
             role="dialog"
             aria-modal="true"
             aria-label="Continuar con Google">

      <div class="sd-brand">
        <img src="google.png" alt="Google">
        <span>Continuar con Google</span>
      </div>

      <h2>Foco Urbano quiere continuar con Google</h2>

      <p>
        Selecciona una cuenta para continuar en Foco Urbano.
      </p>

      <div class="sd-actions">
        <button type="button"
                class="sd-btn sd-btn-quiet"
                data-demo-action="cerrar">
          Cancelar
        </button>

        <button type="button"
                class="sd-btn sd-btn-main"
                data-demo-action="google-cuentas">
          Continuar
        </button>
      </div>

      <p class="sd-legal">Vista de prueba de Foco Urbano</p>

    </section>
  `);
}

function focoSocialGoogleCuentas() {
  focoSocialMarco(`
    <section class="sd-sheet sd-google-accounts" role="dialog" aria-modal="true" aria-label="Elegir cuenta de Google, demostración">
      <button type="button" class="sd-close" data-demo-action="cerrar" aria-label="Cerrar">×</button>
      <div class="sd-brand"><img src="google.png" alt="Google"><span>Acceder con Google</span></div>
      <span class="sd-demo-badge">CUENTAS DE PRUEBA</span>
      <h2>Elige una cuenta</h2>
      <p>Continuar en <strong>Foco Urbano</strong></p>
      <button type="button" class="sd-account" data-demo-action="google-adarlin">
        <span class="sd-avatar">A</span>
        <span class="sd-account-details"><strong>Adarlin Montenegro</strong><small>adarlin.google.demo@example.com</small></span>
        <span class="sd-chevron">›</span>
      </button>
      <button type="button" class="sd-account" data-demo-action="google-otra">
        <span class="sd-avatar sd-avatar-outline">+</span>
        <span class="sd-account-details"><strong>Usar otra cuenta de prueba</strong><small>Ciudadano de Prueba</small></span>
        <span class="sd-chevron">›</span>
      </button>
      <p class="sd-legal">Simulación local: no ingreses contraseñas reales de Google.</p>
    </section>
  `);
}

// Apple: panel tipo hoja -> simulación de Face ID -> Listo -> formulario.
function focoSocialAppleInicio() {
  focoSocialMarco(`
    <section class="sd-sheet sd-apple-sheet"
             role="dialog"
             aria-modal="true"
             aria-label="Iniciar sesión con Apple">

      <div class="sd-handle"></div>

      <button type="button"
              class="sd-close"
              data-demo-action="cerrar">×</button>

      <h2>Iniciar sesión con Apple</h2>

      <div class="sd-provider-line">
        <img src="apple.png" alt="Apple">
        <span>
          Inicia sesión en Foco Urbano utilizando tu cuenta de Apple.
        </span>
      </div>

      <div class="sd-apple-user">
        <span class="sd-avatar">A</span>

        <span>
          <strong>Adarlin Montenegro</strong>
          <small>Cuenta de prueba</small>
        </span>
      </div>

      <button type="button"
              class="sd-btn sd-btn-main sd-wide"
              data-demo-action="apple-faceid">
        Iniciar sesión
      </button>

      <p class="sd-legal">Vista de prueba de Foco Urbano</p>

    </section>
  `, "apple");
}

function focoSocialAppleFaceId() {

  // Mostrar animación de reconocimiento facial
  focoSocialMarco(`
    <section class="sd-sheet sd-apple-sheet sd-faceid"
             role="dialog"
             aria-modal="true"
             aria-label="Face ID de demostración">

      <div class="sd-handle"></div>

      <button type="button"
              class="sd-close"
              data-demo-action="cerrar">×</button>

      <h2>Face ID</h2>

      <div class="sd-face-symbol">
        <span>☺</span>
      </div>

      <p>Verificando identidad...</p>

    </section>
  `, "apple");

  // Mostrar confirmación después de la animación
  focoSocialProgramar(() => {

    if (!document.getElementById("social-demo-root")) return;

    focoSocialMarco(`
      <section class="sd-sheet sd-apple-sheet sd-faceid"
               role="dialog"
               aria-modal="true"
               aria-label="Proceso completado">

        <div class="sd-handle"></div>

        <h2>Adarlin Montenegro</h2>

        <div class="sd-done-icon">✓</div>

        <h3>Listo</h3>

      </section>
    `, "apple");

    // Completar automáticamente los datos del registro
    focoSocialProgramar(() => {
      focoSocialIrRegistro(FOCO_SOCIAL_DEMO.apple, "Apple");
    }, 1200);

  }, 1600);
}

  focoSocialProgramar(() => {
    if (!document.getElementById("social-demo-root")) return;
    focoSocialMarco(`
      <section class="sd-sheet sd-apple-sheet sd-faceid" role="dialog" aria-modal="true" aria-label="Verificación simulada completada">
        <div class="sd-handle" aria-hidden="true"></div>
        <span class="sd-demo-badge">SIMULACIÓN COMPLETADA</span>
        <h2>Adarlin Montenegro</h2>
        <div class="sd-done-icon">✓</div>
        <h3>Listo</h3>
        <p>Preparando tu registro de Foco Urbano...</p>
      </section>
    `, "apple");
    focoSocialProgramar(() => focoSocialIrRegistro(FOCO_SOCIAL_DEMO.apple, "Apple"), 1000);
  }, 1500);


function focoSocialIrRegistro(cuenta, proveedor) {
  const nombre = document.getElementById("reg-nombre");
  const correo = document.getElementById("reg-correo");
  const password = document.getElementById("reg-pass");
  const pantalla = nombre && nombre.closest(".screen");

  cerrarDemoSocial();
  if (!nombre || !correo || !password || !pantalla || !pantalla.id) {
    alert("No se encontró el formulario de registro. Comprueba los identificadores reg-nombre, reg-correo y reg-pass.");
    return;
  }

  nombre.value = cuenta.nombre;
  correo.value = cuenta.correo;
  password.value = "";

  if (typeof cambiarPantalla === "function") {
    cambiarPantalla(pantalla.id);
  } else {
    alert("No se encontró cambiarPantalla(). Comprueba que app.js se cargue antes de acceso_social_demo.js.");
    return;
  }

  password.focus();
  const mensaje = `${proveedor} :Solo elige una contraseña local de al menos 8 caracteres.`;
  if (typeof mostrarToast === "function") mostrarToast(mensaje, 6500);
  else alert(mensaje);
}

// Utilizar desde el onclick de los botones existentes del registro.
function abrirDemoSocial(proveedor) {
  cerrarDemoSocial();
  if (proveedor === "google") focoSocialGooglePermiso();
  else if (proveedor === "apple") focoSocialAppleInicio();
}
