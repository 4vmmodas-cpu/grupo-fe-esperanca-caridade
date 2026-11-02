/* ==========================================================
   DADOS EDITÁVEIS — agenda, campanhas e galeria.
   Copie um bloco { ... }, cole abaixo e altere os textos.
   Datas no formato "AAAA-MM-DD".
   ========================================================== */

window.AGENDA = [
  { data: "2026-11-07", hora: "19h30", titulo: "Gira de Caboclos", descricao: "Atendimento público com passes e consultas." },
  { data: "2026-11-14", hora: "19h30", titulo: "Gira de Pretos-Velhos", descricao: "Atendimento público. Chegue com 30 min de antecedência para pegar a senha." },
  { data: "2026-11-21", hora: "15h00", titulo: "Ação social – entrega de cestas", descricao: "Distribuição de cestas básicas e agasalhos às famílias cadastradas." },
  { data: "2026-11-28", hora: "19h30", titulo: "Gira de Baianos", descricao: "Atendimento público." },
  { data: "2026-12-05", hora: "19h30", titulo: "Gira de Erês", descricao: "Gira festiva. Doações de doces são bem-vindas." }
];

window.CAMPANHAS = [
  {
    titulo: "Natal Solidário",
    descricao: "Arrecadação de alimentos e brinquedos para 80 famílias da comunidade no fim de ano.",
    meta: 80, atual: 34, unidade: "cestas",
    prazo: "2026-12-15",
    necessarios: ["Arroz", "Feijão", "Óleo", "Leite em pó", "Brinquedos novos"],
    destaque: true
  },
  {
    titulo: "Campanha do Agasalho",
    descricao: "Cobertores, roupas de frio e calçados para pessoas em situação de rua.",
    meta: 200, atual: 145, unidade: "peças",
    prazo: "2026-12-31",
    necessarios: ["Cobertores", "Casacos adultos", "Meias", "Calçados"],
    destaque: false
  },
  {
    titulo: "Kit Higiene",
    descricao: "Kits de higiene pessoal para o abrigo parceiro.",
    meta: 100, atual: 22, unidade: "kits",
    prazo: "2027-01-31",
    necessarios: ["Sabonete", "Pasta e escova de dente", "Absorventes", "Desodorante"],
    destaque: false
  }
];

/* Coloque as fotos na pasta assets/fotos/ e liste aqui.
   Enquanto a lista estiver vazia, a galeria mostra quadros de exemplo. */
window.GALERIA = [
  // { arquivo: "assets/fotos/acao-social-1.jpg", legenda: "Entrega de cestas – julho/2026" },
];
