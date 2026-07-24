/**
 * ============================================================================
 * PLATAFORMA DE CAPACITACIÓN PINAKER - FRONT-END LOGIC (app.js)
 * ============================================================================
 */

// URL de la Aplicación Web de Google Apps Script (Reemplazar con la URL publicada)
const API_URL = "https://script.google.com/macros/s/AKfycbwPVX2OySvxCba72BvX99PIlO_BjipUxXEP982wSCKfaBXOtYPxTflYVjD4WnRthrFq/exec";

// ESTADO GLOBAL DE LA APLICACIÓN
const state = {
  currentUser: null,        // { cedula, nombre, empresa }
  modules: [],              // Lista de módulos cargados para la empresa
  activeModule: null,       // Módulo actualmente seleccionado
  ytPlayer: null,           // Instancia del reproductor de YouTube
  videoEnded: false,        // Flag de control para habilitar evaluación
  questions: [],            // Preguntas del módulo activo
  currentQuestionIndex: 0,  // Índice de la pregunta actual
  userAnswers: {}           // Respuestas seleccionadas: { id_pregunta: 'A' | 'B' | 'C' | 'D' }
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  bindEvents();
  checkSession();
}

function bindEvents() {
  // Login Form
  document.getElementById("form-login").addEventListener("submit", handleLoginSubmit);

  // Logout Button
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // Video Navigation Back Button
  document.getElementById("btn-video-back").addEventListener("click", () => switchView("view-dashboard"));

  // Start Evaluation Button
  document.getElementById("btn-start-evaluation").addEventListener("click", startEvaluationView);

  // Quiz Next / Submit Button
  document.getElementById("btn-quiz-next").addEventListener("click", handleQuizNext);

  // Modal Close Button
  document.getElementById("btn-modal-close").addEventListener("click", () => {
    closeModal("modal-result");
    switchView("view-dashboard");
    loadDashboardModules();
  });
}

// Check session in sessionStorage
function checkSession() {
  const savedUser = sessionStorage.getItem("pinaker_user");
  if (savedUser) {
    state.currentUser = JSON.parse(savedUser);
    updateUserHeader();
    switchView("view-dashboard");
    loadDashboardModules();
  } else {
    switchView("view-login");
  }
}

// ============================================================================
// CLIENTE API GOOGLE APPS SCRIPT
// ============================================================================
async function apiRequest(endpointParams, method = "GET", bodyData = null) {
  if (!API_URL || API_URL.includes("SU_APPS_SCRIPT_WEB_APP_URL_AQUI")) {
    alert("API_URL no configurada en app.js");
    return { status: "error", message: "API_URL no configurada" };
  }

  try {
    if (method === "GET") {
      const queryStr = new URLSearchParams(endpointParams).toString();
      const response = await fetch(`${API_URL}?${queryStr}`, { redirect: "follow" });
      const text = await response.text();
      
      try {
        return JSON.parse(text);
      } catch (jsonErr) {
        console.error("Respuesta no es JSON válido:", text);
        if (text.includes("Necesitas acceso") || text.includes("accounts.google.com") || text.includes("drive-logo")) {
          alert("⚠️ ERROR DE PERMISOS EN GOOGLE APPS SCRIPT:\n\nEl despliegue en Apps Script requiere cambiar 'Quién tiene acceso' a 'Cualquier persona' (Anyone).\nActualmente solicita inicio de sesión en Google.");
        }
        return { status: "error", message: "Respuesta no válida del servidor" };
      }
    } else if (method === "POST") {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyData),
        redirect: "follow"
      });
      const text = await response.text();
      
      try {
        return JSON.parse(text);
      } catch (jsonErr) {
        console.error("Respuesta POST no es JSON válido:", text);
        if (text.includes("Necesitas acceso") || text.includes("accounts.google.com") || text.includes("drive-logo")) {
          alert("⚠️ ERROR DE PERMISOS EN GOOGLE APPS SCRIPT:\n\nEl despliegue en Apps Script requiere cambiar 'Quién tiene acceso' a 'Cualquier persona' (Anyone).");
        }
        return { status: "error", message: "Error al guardar resultado en el servidor" };
      }
    }
  } catch (error) {
    console.error("Error de conexión con la API de Google Apps Script:", error);
    return { status: "error", message: error.toString() };
  }
}

// ============================================================================
// NAVEGACIÓN Y ROUTER DE VISTAS (SPA)
// ============================================================================
function switchView(viewId) {
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
  }

  // Manejo de visibilidad del Header de usuario
  const userChip = document.getElementById("user-profile-chip");
  if (viewId === "view-login") {
    userChip.style.display = "none";
  } else if (state.currentUser) {
    userChip.style.display = "flex";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateUserHeader() {
  if (state.currentUser) {
    document.getElementById("header-user-name").textContent = state.currentUser.nombre;
    document.getElementById("header-user-company").textContent = state.currentUser.empresa;
  }
}

// ============================================================================
// VISTA A: LOGIN (VALIDACIÓN POR CÉDULA HABILITADA)
// ============================================================================
async function handleLoginSubmit() {
  const inputCedula = document.getElementById("input-cedula");
  const cedula = inputCedula ? inputCedula.value.trim() : "";

  if (!cedula) {
    alert("Por favor ingrese su número de cédula.");
    return;
  }

  const btnSubmit = document.getElementById("btn-login-submit");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.querySelector("span").textContent = "Validando Cédula...";
  }

  const res = await apiRequest({ action: "validateUser", cedula: cedula });

  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.querySelector("span").textContent = "Validar Cédula e Ingresar";
  }

  if (res && res.status === "success" && res.user) {
    state.currentUser = res.user; // { cedula, nombre, empresa }
    sessionStorage.setItem("pinaker_user", JSON.stringify(state.currentUser));

    updateUserHeader();
    switchView("view-dashboard");
    loadDashboardModules();
  } else {
    alert(res ? res.message : "Número de cédula no registrado en el sistema o no habilitado.");
  }
}

function handleLogout() {
  if (confirm("¿Está seguro de que desea cerrar sesión?")) {
    sessionStorage.removeItem("pinaker_user");
    state.currentUser = null;
    state.activeModule = null;
    if (state.ytPlayer && typeof state.ytPlayer.destroy === "function") {
      state.ytPlayer.destroy();
    }
    const inputCedula = document.getElementById("input-cedula");
    if (inputCedula) inputCedula.value = "";
    switchView("view-login");
  }
}

// ============================================================================
// VISTA B: DASHBOARD (SELECCIÓN DE MÓDULOS)
// ============================================================================
async function loadDashboardModules() {
  const container = document.getElementById("modules-grid-container");
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="color: var(--text-muted);">Consultando módulos asignados para ${escapeHTML(state.currentUser.empresa)}...</p>
    </div>
  `;

  const res = await apiRequest({
    action: "getModules",
    empresa: state.currentUser.empresa,
    cedula: state.currentUser.cedula
  });

  if (res && res.status === "success") {
    state.modules = res.data;
    renderModulesGrid(res.data);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--danger);">
        <p>Ocurrió un error al consultar los módulos: ${escapeHTML(res ? res.message : "Error de conexión")}</p>
      </div>
    `;
  }
}

function renderModulesGrid(modules) {
  const container = document.getElementById("modules-grid-container");
  container.innerHTML = "";

  if (modules.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <p>No hay módulos habilitados actualmente para la empresa (${escapeHTML(state.currentUser.empresa)}).</p>
      </div>
    `;
    return;
  }

  modules.forEach(mod => {
    const card = document.createElement("div");
    
    let cardClass = "module-card";
    let badgeHTML = "";
    let buttonHTML = "";

    const estado = mod.estado || (mod.completado ? "APROBADO" : "DISPONIBLE");

    if (estado === "APROBADO") {
      cardClass += " completed";
      badgeHTML = `<span class="module-badge badge-completed">✓ Aprobado (${mod.nota_obtenida}%)</span>`;
      buttonHTML = `<button class="btn-start-module" disabled><span>Módulo Aprobado</span></button>`;
    } else if (estado === "PERDIDO") {
      cardClass += " failed";
      badgeHTML = `<span class="module-badge badge-failed">✕ Reprobado (${mod.nota_obtenida}%)</span>`;
      buttonHTML = `<button class="btn-start-module" disabled><span>Módulo Perdido - Contacte al Admin</span></button>`;
    } else {
      // DISPONIBLE
      badgeHTML = `<span class="module-badge badge-available">● Disponible</span>`;
      buttonHTML = `<button class="btn-start-module" onclick="onSelectModule('${mod.id_modulo}')">
           <span>Iniciar Capacitación</span>
           <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
         </button>`;
    }

    card.className = cardClass;

    card.innerHTML = `
      <div>
        ${badgeHTML}
        <h3 class="module-title">${escapeHTML(mod.nombre_modulo)}</h3>
        <p class="module-desc">${escapeHTML(mod.descripcion)}</p>
      </div>
      <div class="module-footer">
        ${buttonHTML}
      </div>
    `;

    container.appendChild(card);
  });
}

function onSelectModule(idModulo) {
  const mod = state.modules.find(m => m.id_modulo === idModulo);
  if (!mod) return;
  if (mod.estado === "APROBADO" || mod.estado === "PERDIDO" || mod.completado) {
    alert("Este módulo se encuentra bloqueado.");
    return;
  }

  state.activeModule = mod;
  state.videoEnded = false;
  
  switchView("view-video");
  initVideoPlayer(mod);
}

// ============================================================================
// VISTA C: REPRODUCTOR DE VIDEO (CON RESTRICCIÓN STRICTA DE ADELANTO)
// ============================================================================
function extractYouTubeID(urlOrId) {
  if (!urlOrId) return "dQw4w9WgXcQ"; // Fallback por defecto
  if (urlOrId.length === 11) return urlOrId;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
}

function initVideoPlayer(module) {
  document.getElementById("video-module-title").textContent = module.nombre_modulo;
  document.getElementById("video-module-desc").textContent = module.descripcion;

  const btnStartEval = document.getElementById("btn-start-evaluation");
  btnStartEval.disabled = true;
  
  const bannerStatus = document.getElementById("video-banner-status");
  bannerStatus.classList.remove("unlocked");
  document.getElementById("video-status-title").textContent = "Video en reproducción";
  document.getElementById("video-status-text").textContent = "Debe reproducir el video hasta el final para habilitar la evaluación.";

  const videoId = extractYouTubeID(module.video_url);

  // Si el reproductor ya existe, destruir previa instancia
  if (state.ytPlayer && typeof state.ytPlayer.destroy === "function") {
    state.ytPlayer.destroy();
  }

  // Inicializar reproductor iframe de YouTube
  state.ytPlayer = new YT.Player("yt-player", {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,          // REGLA DE NEGOCIO: Ocultar controles de reproducción
      disablekb: 1,         // Deshabilitar atajos de teclado (adelantar con flechas)
      modestbranding: 1,
      rel: 0,
      fs: 0
    },
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

// Evento YouTube Player State Change
function onPlayerStateChange(event) {
  // YT.PlayerState.ENDED === 0
  if (event.data === YT.PlayerState.ENDED) {
    state.videoEnded = true;
    
    // Habilitar botón de evaluación
    const btnStartEval = document.getElementById("btn-start-evaluation");
    btnStartEval.disabled = false;

    // Actualizar estilo del banner informativo
    const bannerStatus = document.getElementById("video-banner-status");
    bannerStatus.classList.add("unlocked");
    document.getElementById("video-status-title").textContent = "¡Video finalizado exitosamente!";
    document.getElementById("video-status-text").textContent = "Ya puede proceder a realizar la evaluación del módulo.";
  }
}

// ============================================================================
// VISTA D: EVALUACIÓN (NAVEGACIÓN UNIDIRECCIONAL ESTRICTA)
// ============================================================================
async function startEvaluationView() {
  if (!state.videoEnded) {
    alert("Debe visualizar todo el video antes de comenzar la evaluación.");
    return;
  }

  // Detener video si sigue activo
  if (state.ytPlayer && typeof state.ytPlayer.pauseVideo === "function") {
    state.ytPlayer.pauseVideo();
  }

  switchView("view-evaluation");
  
  // Reiniciar estado de evaluación
  state.currentQuestionIndex = 0;
  state.userAnswers = {};
  state.questions = [];

  const questionContainer = document.getElementById("quiz-question-text");
  questionContainer.textContent = "Cargando preguntas de la evaluación...";
  document.getElementById("quiz-options-container").innerHTML = `<div class="spinner" style="margin: 2rem auto;"></div>`;

  const res = await apiRequest({
    action: "getQuestions",
    id_modulo: state.activeModule.id_modulo
  });

  if (res && res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
    state.questions = res.data;
    renderCurrentQuestion();
  } else {
    alert("No se pudieron cargar las preguntas del módulo.");
    switchView("view-dashboard");
  }
}

function renderCurrentQuestion() {
  const index = state.currentQuestionIndex;
  const total = state.questions.length;
  const q = state.questions[index];

  // Actualizar Barra de Progreso
  const progressPercent = ((index + 1) / total) * 100;
  document.getElementById("quiz-progress-fill").style.width = `${progressPercent}%`;

  // Actualizar Tag de Paso
  document.getElementById("quiz-step-tag").textContent = `Pregunta ${index + 1} de ${total}`;

  // Renderizar Pregunta
  document.getElementById("quiz-question-text").textContent = q.pregunta;

  // Renderizar Opciones (A, B, C, D)
  const optionsContainer = document.getElementById("quiz-options-container");
  optionsContainer.innerHTML = "";

  const optionsObj = q.opciones || {};
  const currentSelected = state.userAnswers[q.id_pregunta] || null;

  ["A", "B", "C", "D"].forEach(key => {
    if (!optionsObj[key]) return;

    const optItem = document.createElement("div");
    optItem.className = `option-item ${currentSelected === key ? "selected" : ""}`;
    optItem.onclick = () => selectOption(q.id_pregunta, key);

    optItem.innerHTML = `
      <div class="option-badge">${key}</div>
      <div class="option-content">${escapeHTML(optionsObj[key])}</div>
    `;

    optionsContainer.appendChild(optItem);
  });

  // Botón Siguiente (Deshabilitado hasta seleccionar opción)
  const btnNext = document.getElementById("btn-quiz-next");
  btnNext.disabled = !currentSelected;

  // Cambiar texto de botón en la última pregunta
  const btnSpan = btnNext.querySelector("span");
  if (index === total - 1) {
    btnSpan.textContent = "Finalizar y Enviar";
  } else {
    btnSpan.textContent = "Siguiente";
  }
}

function selectOption(idPregunta, keyOption) {
  state.userAnswers[idPregunta] = keyOption;

  // Actualizar visualmente la opción seleccionada
  document.querySelectorAll(".option-item").forEach(item => {
    item.classList.remove("selected");
  });

  const selectedBadge = Array.from(document.querySelectorAll(".option-badge")).find(el => el.textContent === keyOption);
  if (selectedBadge) {
    selectedBadge.closest(".option-item").classList.add("selected");
  }

  // REGLA DE NEGOCIO: Habilitar botón "Siguiente" una vez seleccionada una opción
  document.getElementById("btn-quiz-next").disabled = false;
}

// REGLA DE NEGOCIO: Navegación estrictamente hacia adelante (Sin botón volver)
async function handleQuizNext() {
  const index = state.currentQuestionIndex;
  const total = state.questions.length;

  if (index < total - 1) {
    // Pasar a la siguiente pregunta sin opción de regresar
    state.currentQuestionIndex++;
    renderCurrentQuestion();
  } else {
    // Es la última pregunta: procesar y enviar resultados
    await submitEvaluationResults();
  }
}

async function submitEvaluationResults() {
  const btnNext = document.getElementById("btn-quiz-next");
  btnNext.disabled = true;
  btnNext.querySelector("span").textContent = "Enviando...";

  // Calcular nota final
  let correctCount = 0;
  state.questions.forEach(q => {
    const userAns = state.userAnswers[q.id_pregunta];
    if (userAns && userAns.toUpperCase() === q.respuesta_correcta.toUpperCase()) {
      correctCount++;
    }
  });

  const totalQuestions = state.questions.length;
  const notaFinal = Math.round((correctCount / totalQuestions) * 100);
  const notaMinima = state.activeModule.nota_minima || 70;
  const aprobado = notaFinal >= notaMinima;

  // Payload para el backend
  const payload = {
    cedula: state.currentUser.cedula,
    nombre: state.currentUser.nombre,
    empresa: state.currentUser.empresa,
    id_modulo: state.activeModule.id_modulo,
    nota_final: notaFinal,
    nota_minima: notaMinima
  };

  const res = await apiRequest({}, "POST", payload);

  showResultModal(notaFinal, notaMinima, aprobado);
}

// ============================================================================
// MODAL DE RESULTADOS
// ============================================================================
function showResultModal(score, minScore, isApproved) {
  const modal = document.getElementById("modal-result");
  const icon = document.getElementById("modal-icon");
  const title = document.getElementById("modal-title");
  const scoreDisplay = document.getElementById("modal-score");
  const detail = document.getElementById("modal-detail-text");

  scoreDisplay.textContent = `${score}%`;

  if (isApproved) {
    icon.className = "modal-icon-circle success";
    icon.textContent = "✓";
    title.textContent = "¡Felicitaciones! Has Aprobado";
    scoreDisplay.style.color = "var(--success)";
    detail.textContent = `Has alcanzado la nota requerida (${minScore}%). Tu registro de certificación ha sido actualizado.`;
  } else {
    icon.className = "modal-icon-circle fail";
    icon.textContent = "✕";
    title.textContent = "Evaluación No Aprobada";
    scoreDisplay.style.color = "var(--danger)";
    detail.textContent = `Tu nota (${score}%) no alcanzó el mínimo requerido (${minScore}%). Puedes intentar nuevamente este módulo.`;
  }

  modal.classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// Helper para escapar HTML
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
