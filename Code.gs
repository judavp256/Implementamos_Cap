/**
 * ============================================================================
 * PLATAFORMA DE CAPACITACIÓN ISG-MÓNICA BETANCUR - BACK-END GOOGLE APPS SCRIPT (Code.gs)
 * ============================================================================
 * 
 * ESTRUCTURA DE LA BASE DE DATOS EN GOOGLE SHEETS (4 PESTAÑAS OBLIGATORIAS):
 * 
 * 1. Pestaña: "Base_Usuarios"
 *    Columnas (Fila 1): [Cedula, Nombre, Empresa, Estado]
 *    Ejemplo: 1098765432 | Juan Pérez | Empresa A | Habilitado
 * 
 * 2. Pestaña: "Resultados"
 *    Columnas (Fila 1): [Timestamp, Cedula, Nombre, Empresa, ID_Modulo, Nota_Final, Aprobado]
 * 
 * 3. Pestaña: "Matriz_Empresas"
 *    Columnas (Fila 1): [Empresa, ID_Modulo, Nombre_Modulo, Descripcion, Video_URL, Nota_Minima]
 * 
 * 4. Pestaña: "Base_Preguntas"
 *    Columnas (Fila 1): [ID_Modulo, ID_Pregunta, Pregunta, Opcion_A, Opcion_B, Opcion_C, Opcion_D, Respuesta_Correcta]
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Crear una hoja de cálculo en Google Sheets con las 4 pestañas indicadas arriba.
 * 2. Ir a Extensiones > Apps Script y pegar este código en Code.gs.
 * 3. Hacer clic en "Desplegar" > "Gestionar despliegues" > Editar > Versión: "Nueva versión".
 * 4. Ejecutar como: "Yo" (tu cuenta).
 * 5. Quién tiene acceso: "Cualquier persona" (Anyone).
 * ============================================================================
 */

// Helper para respuestas JSON con encabezados CORS explícitos
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Manejo de peticiones HTTP GET
 * Soporta las siguientes acciones:
 * - action=validateUser&cedula=... : Valida si la cédula está habilitada en Base_Usuarios
 * - action=getModules&empresa=...&cedula=... : Módulos habilitados y su estado (DISPONIBLE, APROBADO, PERDIDO)
 * - action=getQuestions&id_modulo=... : Banco de preguntas para un módulo específico
 * - action=checkStatus&cedula=...&id_modulo=... : Valida si una cédula aprobó o reprobó un módulo
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Validar usuario por Cédula en la pestaña Base_Usuarios
    if (action === "validateUser") {
      var cedulaReq = String(params.cedula || "").trim();
      if (!cedulaReq) return createJsonResponse({ status: "error", message: "Por favor ingrese su número de cédula." });

      var sheetUsuarios = ss.getSheetByName("Base_Usuarios");
      if (!sheetUsuarios) return createJsonResponse({ status: "error", message: "La pestaña Base_Usuarios no existe en el Google Sheet." });

      var dataUsuarios = sheetUsuarios.getDataRange().getValues();
      var usuarioEncontrado = null;

      for (var i = 1; i < dataUsuarios.length; i++) {
        var uCedula = String(dataUsuarios[i][0]).trim();
        var uNombre = String(dataUsuarios[i][1]).trim();
        var uEmpresa = String(dataUsuarios[i][2]).trim();
        var uEstado = String(dataUsuarios[i][3]).trim().toUpperCase();

        if (uCedula === cedulaReq) {
          // Verificar si el estado es Habilitado, Activo, o no está explícitamente Inhabilitado
          if (uEstado === "HABILITADO" || uEstado === "ACTIVO" || uEstado === "SI" || uEstado === "OK" || uEstado === "") {
            usuarioEncontrado = {
              cedula: uCedula,
              nombre: uNombre,
              empresa: uEmpresa
            };
            break;
          } else {
            return createJsonResponse({
              status: "error",
              message: "El usuario registrado con esta cédula se encuentra inhabilitado."
            });
          }
        }
      }

      if (usuarioEncontrado) {
        return createJsonResponse({ status: "success", user: usuarioEncontrado });
      } else {
        return createJsonResponse({
          status: "error",
          message: "Número de cédula no registrado en el sistema o no habilitado."
        });
      }
    }

    // 2. Obtener módulos habilitados para una empresa y estado por cédula
    if (action === "getModules") {
      var empresa = params.empresa;
      var cedula = params.cedula;
      if (!empresa || !cedula) {
        return createJsonResponse({ status: "error", message: "Faltan los parámetros 'empresa' y 'cedula'." });
      }

      var sheetMatriz = ss.getSheetByName("Matriz_Empresas");
      var sheetResultados = ss.getSheetByName("Resultados");
      
      if (!sheetMatriz) return createJsonResponse({ status: "error", message: "Pestaña Matriz_Empresas no encontrada" });

      var dataMatriz = sheetMatriz.getDataRange().getValues();
      var dataResultados = sheetResultados ? sheetResultados.getDataRange().getValues() : [];

      // Mapear intentos por módulo para el usuario en Resultados
      // Posibles estados por módulo: "APROBADO", "PERDIDO", "DISPONIBLE"
      var intentosMap = {};
      for (var r = 1; r < dataResultados.length; r++) {
        var rCedula = String(dataResultados[r][1]).trim();
        var rModulo = String(dataResultados[r][4]).trim();
        var rNota = Number(dataResultados[r][5]) || 0;
        var rAprobado = String(dataResultados[r][6]).trim().toUpperCase();

        if (rCedula === String(cedula).trim()) {
          // Si ya tiene un registro previo:
          if (!intentosMap[rModulo]) {
            intentosMap[rModulo] = {
              aprobado: (rAprobado === "SI" || rNota >= 70),
              nota: rNota,
              registrado: true
            };
          } else {
            // Si hay múltiples intentos, dar prioridad al aprobado si existe
            if (rAprobado === "SI" || rNota >= 70) {
              intentosMap[rModulo].aprobado = true;
              if (rNota > intentosMap[rModulo].nota) intentosMap[rModulo].nota = rNota;
            } else if (!intentosMap[rModulo].aprobado) {
              // Si no está aprobado, conservar la nota más reciente
              intentosMap[rModulo].nota = rNota;
            }
          }
        }
      }

      var modulos = [];
      for (var i = 1; i < dataMatriz.length; i++) {
        var row = dataMatriz[i];
        var rowEmpresa = String(row[0]).trim();

        if (rowEmpresa === String(empresa).trim()) {
          var idModulo = String(row[1]).trim();
          var notaMinima = Number(row[5]) || 70;
          var intento = intentosMap[idModulo];

          var estadoModulo = "DISPONIBLE";
          var notaObtenida = 0;

          if (intento && intento.registrado) {
            if (intento.aprobado || intento.nota >= notaMinima) {
              estadoModulo = "APROBADO";
              notaObtenida = intento.nota;
            } else {
              estadoModulo = "PERDIDO";
              notaObtenida = intento.nota;
            }
          }

          modulos.push({
            id_modulo: idModulo,
            nombre_modulo: row[2] || "Módulo " + idModulo,
            descripcion: row[3] || "",
            video_url: row[4] || "",
            nota_minima: notaMinima,
            estado: estadoModulo, // "DISPONIBLE" | "APROBADO" | "PERDIDO"
            completado: estadoModulo === "APROBADO",
            nota_obtenida: notaObtenida
          });
        }
      }

      return createJsonResponse({ status: "success", data: modulos });
    }

    // 3. Consultar preguntas de un módulo
    if (action === "getQuestions") {
      var idModulo = params.id_modulo;
      if (!idModulo) return createJsonResponse({ status: "error", message: "Falta el parámetro 'id_modulo'" });

      var sheetPreguntas = ss.getSheetByName("Base_Preguntas");
      if (!sheetPreguntas) return createJsonResponse({ status: "error", message: "Pestaña Base_Preguntas no encontrada" });

      var dataPreguntas = sheetPreguntas.getDataRange().getValues();
      var preguntas = [];

      for (var i = 1; i < dataPreguntas.length; i++) {
        var row = dataPreguntas[i];
        if (String(row[0]).trim() === String(idModulo).trim()) {
          preguntas.push({
            id_pregunta: row[1],
            pregunta: row[2],
            opciones: {
              A: row[3],
              B: row[4],
              C: row[5],
              D: row[6]
            },
            respuesta_correcta: String(row[7]).trim().toUpperCase()
          });
        }
      }

      return createJsonResponse({ status: "success", data: preguntas });
    }

    // 4. Validar estado de un módulo para un usuario
    if (action === "checkStatus") {
      var cedula = params.cedula;
      var idModulo = params.id_modulo;
      if (!cedula || !idModulo) {
        return createJsonResponse({ status: "error", message: "Parámetros 'cedula' e 'id_modulo' requeridos" });
      }

      var sheetResultados = ss.getSheetByName("Resultados");
      if (!sheetResultados) {
        return createJsonResponse({ status: "success", estado: "DISPONIBLE", nota: 0 });
      }

      var dataResultados = sheetResultados.getDataRange().getValues();
      var intentado = false;
      var aprobado = false;
      var notaMax = 0;

      for (var i = 1; i < dataResultados.length; i++) {
        var row = dataResultados[i];
        var rCedula = String(row[1]).trim();
        var rModulo = String(row[4]).trim();
        var rNota = Number(row[5]) || 0;
        var rAprobado = String(row[6]).trim().toUpperCase();

        if (rCedula === String(cedula).trim() && rModulo === String(idModulo).trim()) {
          intentado = true;
          if (rNota > notaMax) notaMax = rNota;
          if (rAprobado === "SI" || rNota >= 70) {
            aprobado = true;
          }
        }
      }

      var estadoFinal = "DISPONIBLE";
      if (intentado) {
        estadoFinal = aprobado ? "APROBADO" : "PERDIDO";
      }

      return createJsonResponse({ status: "success", estado: estadoFinal, aprobado: aprobado, nota_final: notaMax });
    }

    return createJsonResponse({ status: "error", message: "Acción no válida o no especificada" });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Manejo de peticiones HTTP POST
 * Recibe un JSON payload con: { cedula, nombre, empresa, id_modulo, nota_final, nota_minima }
 * Registra la nueva evaluación en la pestaña 'Resultados'.
 */
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return createJsonResponse({ status: "error", message: "Cuerpo de la petición vacío" });
    }

    var data = JSON.parse(contents);
    var cedula = String(data.cedula || "").trim();
    var nombre = String(data.nombre || "").trim();
    var empresa = String(data.empresa || "").trim();
    var idModulo = String(data.id_modulo || "").trim();
    var notaFinal = Number(data.nota_final) || 0;
    var notaMinima = Number(data.nota_minima) || 70;
    var aprobado = notaFinal >= notaMinima ? "SI" : "NO";

    if (!cedula || !nombre || !empresa || !idModulo) {
      return createJsonResponse({ status: "error", message: "Datos incompletos en la solicitud" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetResultados = ss.getSheetByName("Resultados");

    // Crear la pestaña si no existe
    if (!sheetResultados) {
      sheetResultados = ss.insertSheet("Resultados");
      sheetResultados.appendRow(["Timestamp", "Cedula", "Nombre", "Empresa", "ID_Modulo", "Nota_Final", "Aprobado"]);
    }

    var timestamp = new Date();
    sheetResultados.appendRow([
      timestamp,
      cedula,
      nombre,
      empresa,
      idModulo,
      notaFinal,
      aprobado
    ]);

    return createJsonResponse({
      status: "success",
      message: "Resultado guardado correctamente",
      data: {
        timestamp: timestamp,
        cedula: cedula,
        nombre: nombre,
        empresa: empresa,
        id_modulo: idModulo,
        nota_final: notaFinal,
        aprobado: aprobado
      }
    });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}
