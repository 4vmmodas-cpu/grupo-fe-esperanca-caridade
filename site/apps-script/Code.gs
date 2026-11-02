/**
 * Recebe os cadastros de doação do site e grava na planilha.
 * Cole este código em: Planilha > Extensões > Apps Script.
 * Depois: Implantar > Nova implantação > App da Web
 *   Executar como: Eu | Quem pode acessar: Qualquer pessoa
 */
var ABA = "Doações";
var CAMPOS = [
  ["Data/Hora", null],
  ["Nome", "nome"], ["WhatsApp", "whatsapp"], ["E-mail", "email"],
  ["CEP", "cep"], ["Rua", "rua"], ["Número", "numero"], ["Complemento", "complemento"],
  ["Bairro", "bairro"], ["Cidade", "cidade"], ["Referência", "referencia"],
  ["Itens", "itens"], ["Descrição", "descricao"], ["Tamanhos", "tamanhos"],
  ["Campanha", "campanha"], ["Dias", "dias"], ["Período", "periodo"],
  ["Observações", "observacoes"], ["LGPD", "consentimento"],
  ["Status", null]
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var aba = obterAba_();
    var p = (e && e.parameter) || {};
    var linha = CAMPOS.map(function (c, i) {
      if (i === 0) return new Date();
      if (c[0] === "Status") return "Pendente";
      return String(p[c[1]] || "").slice(0, 2000);
    });
    aba.appendRow(linha);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Formulário de doações ativo.");
}

function obterAba_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA);
  if (!aba) {
    aba = ss.insertSheet(ABA);
    aba.appendRow(CAMPOS.map(function (c) { return c[0]; }));
    aba.getRange(1, 1, 1, CAMPOS.length).setFontWeight("bold").setBackground("#c1272d").setFontColor("#ffffff");
    aba.setFrozenRows(1);
    // Lista suspensa na coluna Status
    var regra = SpreadsheetApp.newDataValidation().requireValueInList(["Pendente", "Contato feito", "Agendado", "Retirado", "Cancelado"]).build();
    aba.getRange(2, CAMPOS.length, 1000, 1).setDataValidation(regra);
  }
  return aba;
}
