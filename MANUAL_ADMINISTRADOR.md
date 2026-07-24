# 📘 Manual de Administración y Operación en Google Sheets
## Plataforma de Capacitación y Evaluación ISG - MÓNICA BETANCUR

Este manual está diseñado para la persona encargada de administrar los usuarios, crear capacitaciones, redactar las evaluaciones y gestionar las calificaciones en la plantilla de **Google Sheets**.

---

## 📌 Reglas de Oro Generales

> [!IMPORTANT]
> 1. **Nombres de Pestañas**: La hoja de cálculo debe contener exactamente **4 pestañas** nombradas de forma idéntica (respetando mayúsculas, minúsculas y guiones bajos):
>    - `Base_Usuarios`
>    - `Matriz_Empresas`
>    - `Base_Preguntas`
>    - `Resultados`
> 2. **Fila 1 (Encabezados)**: No modifiques ni elimines los títulos de las columnas en la primera fila de ninguna pestaña.
> 3. **Coincidencia Exacta**: Los textos de **Empresa** e **ID_Modulo** deben escribirse exactamente igual en todas las pestañas donde aparezcan (por ejemplo, `ISG-Servicios` no es igual a `isg servicios`).

---

## 1. Pestaña `Base_Usuarios` (Control de Acceso / Lista Blanca)

En esta pestaña se registran todos los colaboradores que tienen permitido ingresar a la plataforma.

### 📋 Estructura de Columnas (Fila 1):
| Cedula | Nombre | Empresa | Estado |
| :--- | :--- | :--- | :--- |

### ✍️ Explicación de Campos:
- **`Cedula`**: Número de documento de identidad del usuario.
  > [!TIP]
  > Configura esta columna en Google Sheets como **Texto plano** (*Formato > Número > Texto plano*) para evitar que se eliminen los ceros iniciales si los hay, y no agregues puntos ni comas (Ej: `1098765432`).
- **`Nombre`**: Nombre completo del colaborador (Ej: `Juan Carlos Pérez`).
- **`Empresa`**: Nombre de la empresa a la que pertenece el usuario. Esta empresa determinará qué módulos de capacitación se le mostrarán al ingresar.
- **`Estado`**: Estado del usuario.
  - `Habilitado` (o `Activo`): Permite el ingreso del colaborador a la plataforma.
  - `Inhabilitado` (o `Inactivo`): Bloquea automáticamente el ingreso de esa cédula.

### 💡 Ejemplo de Registro:
| Cedula | Nombre | Empresa | Estado |
| :--- | :--- | :--- | :--- |
| `1098765432` | Juan Carlos Pérez | Constructora Alfa | Habilitado |
| `1020304050` | María Fernanda Gómez | ISG-Servicios | Habilitado |
| `987654321` | Pedro Pablo López | ISG-Servicios | Inhabilitado |

---

## 2. Pestaña `Matriz_Empresas` (Configuración de Cursos y Módulos)

En esta pestaña defines los módulos de capacitación disponibles y los asignas a cada empresa.

### 📋 Estructura de Columnas (Fila 1):
| Empresa | ID_Modulo | Nombre_Modulo | Descripcion | Video_URL | Nota_Minima |
| :--- | :--- | :--- | :--- | :--- | :--- |

### ✍️ Explicación de Campos:
- **`Empresa`**: Nombre de la empresa a la que se le asigna el módulo. Debe coincidir exactamente con el nombre usado en `Base_Usuarios`.
- **`ID_Modulo`**: Código único identificador del módulo (Ej: `MOD-101`, `SST-01`, `CAL-2024`).
- **`Nombre_Modulo`**: Título del curso o capacitación que verá el usuario en su panel.
- **`Descripcion`**: Resumen o explicación breve de los temas que trata la capacitación.
- **`Video_URL`**: Enlace del video educativo de YouTube.
  - Puedes pegar la URL completa: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  - O el código de 11 caracteres del video: `dQw4w9WgXcQ`
- **`Nota_Minima`**: Porcentaje mínimo requerido para aprobar la evaluación (Número entre `0` y `100`, por ejemplo: `70` u `80`).

### 💡 Ejemplo de Registro:
| Empresa | ID_Modulo | Nombre_Modulo | Descripcion | Video_URL | Nota_Minima |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Constructora Alfa | `MOD-101` | Seguridad y Salud en el Trabajo | Protocolos de uso de EPP y prevención de riesgos. | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | 70 |
| ISG-Servicios | `MOD-102` | Protocolos de Calidad e Inspección | Normativa técnica y listas de chequeo. | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | 80 |

---

## 3. Pestaña `Base_Preguntas` (Banco de Evaluaciones)

En esta pestaña creas el cuestionario de preguntas con opciones múltiples para cada módulo.

### 📋 Estructura de Columnas (Fila 1):
| ID_Modulo | ID_Pregunta | Pregunta | Opcion_A | Opcion_B | Opcion_C | Opcion_D | Respuesta_Correcta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### ✍️ Explicación de Campos:
- **`ID_Modulo`**: Código del módulo al que pertenece la pregunta. **Debe coincidir exactamente** con el `ID_Modulo` registrado en `Matriz_Empresas`.
- **`ID_Pregunta`**: Código o número consecutivo de la pregunta (Ej: `P1`, `P2`, `P3`).
- **`Pregunta`**: Texto completo del enunciado de la pregunta.
- **`Opcion_A`**, **`Opcion_B`**, **`Opcion_C`**, **`Opcion_D`**: Las 4 alternativas de respuesta para la pregunta.
- **`Respuesta_Correcta`**: La letra en mayúscula de la opción correcta. Solo se admite una de las opciones: `A`, `B`, `C` o `D`.

### 💡 Ejemplo de Registro:
| ID_Modulo | ID_Pregunta | Pregunta | Opcion_A | Opcion_B | Opcion_C | Opcion_D | Respuesta_Correcta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `MOD-101` | P1 | ¿Cuál es la función principal del casco de seguridad? | Presentación visual | Proteger la cabeza ante impactos | Reemplazar gafas | Ninguna | `B` |
| `MOD-101` | P2 | ¿Ante quién se debe reportar una condición de riesgo? | Al supervisor de SST | A un compañero externo | No se debe reportar | En fin de mes | `A` |

---

## 4. Pestaña `Resultados` (Historial y Re-habilitación Manual)

Esta pestaña registra automáticamente las respuestas enviadas por los colaboradores desde la plataforma.

### 📋 Estructura de Columnas (Fila 1):
| Timestamp | Cedula | Nombre | Empresa | ID_Modulo | Nota_Final | Aprobado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

> [!NOTE]
> Esta pestaña se llena de forma **automática**. No es necesario escribir en ella manualmente, salvo cuando necesites re-habilitar un módulo a un colaborador que lo reprobó.

---

## 🔄 ¿Cómo Re-habilitar un Módulo Reprobado a un Usuario?

Cuando un colaborador realiza la evaluación y saca una nota inferior al mínimo (`Nota_Final < Nota_Minima`), la plataforma registra la fila con `Aprobado = NO` y marca el módulo en rojo como **Reprobado (Bloqueado)**, impidiéndole volver a presentarlo.

Si decides darle una nueva oportunidad para presentar el examen, sigue estos sencillos pasos:

1. Abre la hoja de Google Sheets y ve a la pestaña **`Resultados`**.
2. Busca la fila que contiene la **Cédula** del colaborador y el **ID_Modulo** correspondiente que reprobó.
3. Haz clic derecho sobre el número de esa fila y selecciona **"Eliminar fila"** (o borra el contenido de esa fila).
4. **¡Listo!** En cuanto el colaborador refresque la página web o vuelva a ingresar con su cédula, la plataforma detectará que ya no tiene un registro reprobado y el módulo aparecerá nuevamente **Disponible**.

---

## ❓ Preguntas Frecuentes y Solución de Problemas

1. **Un colaborador ingresa su cédula pero la plataforma dice "Cédula no registrada"**:
   - Revisa la pestaña `Base_Usuarios`. Verifica que la cédula esté escrita correctamente sin puntos ni espacios.
   - Asegúrate de que en la columna `Estado` diga `Habilitado`.

2. **Un colaborador ingresa pero no le aparece ningún módulo en el Dashboard**:
   - Revisa qué empresa tiene asignada el usuario en `Base_Usuarios`.
   - Ve a la pestaña `Matriz_Empresas` y verifica que exista al menos un módulo creado con el **mismo nombre exacto** de esa empresa.

3. **Al hacer clic en "Iniciar Evaluación" sale un error al cargar las preguntas**:
   - Revisa la pestaña `Base_Preguntas`. Confirma que el `ID_Modulo` de las preguntas coincida exactamente con el `ID_Modulo` de la `Matriz_Empresas`.
   - Verifica que las letras de `Respuesta_Correcta` estén en mayúscula (`A`, `B`, `C` o `D`).

---

*Manual elaborado para la Plataforma de Capacitación y Evaluación ISG-MÓNICA BETANCUR.*
