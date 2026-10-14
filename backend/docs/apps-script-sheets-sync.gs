// Apps Script — pegar esto en Extensiones > Apps Script de la planilla
// "El Pinar — Reservas en vivo" y seguir docs/google-sheets-setup.md para
// implementarlo como app web.
//
// Recibe un POST del backend cada vez que una reserva se crea, confirma o
// cancela, y escribe/actualiza la fila correspondiente (por código).

var SECRETO = 'PEGAR_ACA_EL_MISMO_VALOR_DE_GOOGLE_SHEETS_WEBHOOK_SECRET';
var NOMBRE_HOJA = 'Reservas';
var ENCABEZADOS = [
  'Código', 'Cancha', 'Fecha', 'Horario', 'Cliente', 'Teléfono', 'Email',
  'Equipo', 'Estado', 'Creada', 'Confirmada', 'Cancelada', 'Cancelada por',
];

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta({ error: 'JSON inválido' });
  }

  if (body.secret !== SECRETO) {
    return respuesta({ error: 'No autorizado' });
  }

  var fila = body.fila;
  if (!fila || !fila.code) {
    return respuesta({ error: 'Falta la fila o el código' });
  }

  var hoja = obtenerOCrearHoja();
  var valores = [
    fila.code, fila.cancha, fila.fecha, fila.horario, fila.cliente,
    fila.telefono, fila.email, fila.equipo, fila.estado, fila.creada,
    fila.confirmada, fila.cancelada, fila.canceladaPor,
  ];

  var filaExistente = buscarFilaPorCodigo(hoja, fila.code);
  if (filaExistente) {
    hoja.getRange(filaExistente, 1, 1, valores.length).setValues([valores]);
  } else {
    hoja.appendRow(valores);
  }

  return respuesta({ ok: true });
}

function obtenerOCrearHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, ENCABEZADOS.length).setFontWeight('bold');
  }
  return hoja;
}

function buscarFilaPorCodigo(hoja, codigo) {
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return null;
  var codigos = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  for (var i = 0; i < codigos.length; i++) {
    if (codigos[i][0] === codigo) return i + 2;
  }
  return null;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
