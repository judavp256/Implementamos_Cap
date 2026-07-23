/**
 * ============================================================================
 * PLATAFORMA DE CAPACITACIÓN PINAKER - BACK-END GOOGLE APPS SCRIPT (Code.gs)
 * ============================================================================
 * 
 * ESTRUCTURA DE LA BASE DE DATOS EN GOOGLE SHEETS:
 * 
 * 1. Pestaña: "Resultados"
 *    Columnas (Fila 1): [Timestamp, Cedula, Nombre, Empresa, ID_Modulo, Nota_Final, Aprobado]
 * 
 * 2. Pestaña: "Matriz_Empresas"
 *    Columnas (Fila 1): [Empresa, ID_Modulo, Nombre_Modulo, Descripcion, Video_URL, Nota_Minima]
 * 
 * 3. Pestaña: "Base_Preguntas"
 *    Columnas (Fila 1): [ID_Modulo, ID_Pregunta, Pregunta, Opcion_A, Opcion_B, Opcion_C, Opcion_D, Respuesta_Correcta]
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Crear una hoja de cálculo en Google Sheets con las 3 pestañas indicadas arriba.
 * 2. Ir a Extensiones > Apps Script y pegar este código en Code.gs.
 * 3. Hacer clic en "Desplegar" > "Nuevo despliegue".
 * 4. Seleccionar tipo: "Aplicación Web".
 * 5. Ejecutar como: "Yo" (tu cuenta).
 * 6. Quién tiene acceso: "Cualquier persona" (Anyone).
 * 7. Copiar la URL generada y pegarla en app.js como API_URL.
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
 * - action=getCompanies : Obtiene la lista de empresas registradas
 * - action=getModules&empresa=...&cedula=... : Módulos habilitados y su estado de aprobación
 * - action=getQuestions&id_modulo=... : Banco de preguntas para un módulo específico
 * - action=checkStatus&cedula=...&id_modulo=... : Valida si una cédula aprobó un módulo
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Obtener lista de empresas registradas
    if (action === "getCompanies") {
      var sheetMatriz = ss.getSheetByName("Matriz_Empresas");
      if (!sheetMatriz) return createJsonResponse({ status: "error", message: "Pestaña Matriz_Empresas no encontrada" });
      
      var dataMatriz = sheetMatriz.getDataRange().getValues();
      var empresasSet = {};
      for (var i = 1; i < dataMatriz.length; i++) {
        var emp = String(dataMatriz[i][0]).trim();
        if (emp) empresasSet[emp] = true;
      }
      
      var empresas = Object.keys(empresasSet);
      return createJsonResponse({ status: "success", data: empresas });
    }

    // 2. Obtener módulos habilitados para una empresa y estado por cédula
    if (action === "getModules") {
      var empresa = params.empresa;
      var cedula = params.cedula;
      if (!empresa) return createJsonResponse({ status: "error", message: "Falta el parámetro 'empresa'" });

      var sheetMatriz = ss.getSheetByName("Matriz_Empresas");
      var sheetResultados = ss.getSheetByName("Resultados");
      
      if (!sheetMatriz) return createJsonResponse({ status: "error", message: "Pestaña Matriz_Empresas no encontrada" });

      var dataMatriz = sheetMatriz.getDataRange().getValues();
      var dataResultados = sheetResultados ? sheetResultados.getDataRange().getValues() : [];

      // Mapear módulos aprobados por el usuario
      var aprobadosMap = {};
      for (var r = 1; r < dataResultados.length; r++) {
        var rCedula = String(dataResultados[r][1]).trim();
        var rModulo = String(dataResultados[r][4]).trim();
        var rAprobado = String(dataResultados[r][6]).trim().toUpperCase();
        var rNota = Number(dataResultados[r][5]) || 0;

        if (rCedula === String(cedula).trim() && (rAprobado === "SI" || rNota >= 70)) {
          aprobadosMap[rModulo] = {
            completado: true,
            nota: rNota
          };
        }
      }

      var modulos = [];
      for (var i = 1; i < dataMatriz.length; i++) {
        var row = dataMatriz[i];
        var rowEmpresa = String(row[0]).trim();

        if (rowEmpresa === String(empresa).trim()) {
          var idModulo = String(row[1]).trim();
          var estadoUser = aprobadosMap[idModulo] || { completado: false, nota: 0 };

          modulos.push({
            id_modulo: idModulo,
            nombre_modulo: row[2] || "Módulo " + idModulo,
            descripcion: row[3] || "",
            video_url: row[4] || "",
            nota_minima: Number(row[5]) || 70,
            completado: estadoUser.completado,
            nota_obtenida: estadoUser.nota
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

    // 4. Validar si una cédula ya aprobó un módulo
    if (action === "checkStatus") {
      var cedula = params.cedula;
      var idModulo = params.id_modulo;
      if (!cedula || !idModulo) {
        return createJsonResponse({ status: "error", message: "Parámetros 'cedula' e 'id_modulo' requeridos" });
      }

      var sheetResultados = ss.getSheetByName("Resultados");
      if (!sheetResultados) {
        return createJsonResponse({ status: "success", aprobado: false, nota: 0 });
      }

      var dataResultados = sheetResultados.getDataRange().getValues();
      var aprobado = false;
      var notaMax = 0;

      for (var i = 1; i < dataResultados.length; i++) {
        var row = dataResultados[i];
        var rCedula = String(row[1]).trim();
        var rModulo = String(row[4]).trim();
        var rNota = Number(row[5]) || 0;
        var rAprobado = String(row[6]).trim().toUpperCase();

        if (rCedula === String(cedula).trim() && rModulo === String(idModulo).trim()) {
          if (rNota > notaMax) notaMax = rNota;
          if (rAprobado === "SI" || rNota >= 70) {
            aprobado = true;
          }
        }
      }

      return createJsonResponse({ status: "success", aprobado: aprobado, nota_final: notaMax });
    }

    return createJsonResponse({ status: "error", message: "Acción no válida o no especificada" });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Manejo de peticiones HTTP POST
 * Recibe un JSON payload con: { cedula, nombre, empresa, id_modulo, nota_final }
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
