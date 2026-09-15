// Popula despesas de teste via API. Usa a própria API para que ciclos de
// cartão e parcelas nasçam pelo mesmo caminho do bot e da web.
//
//   USER_ID=<ulid> node scripts/seed-transactions.mjs
//   API=http://localhost:3000  (default)

const API = process.env.API ?? 'http://localhost:3000';
const USER_ID = process.env.USER_ID;
if (!USER_ID) throw new Error('USER_ID obrigatório');

const AVISTA = Number(process.env.AVISTA ?? 120);
const PARCELADAS = Number(process.env.PARCELADAS ?? 15);
const RECEITAS = Number(process.env.RECEITAS ?? 10);

const headers = { 'content-type': 'application/json', 'x-user-id': USER_ID };
const api = async (method, path, body) => {
  const res = await fetch(`${API}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Centavos "quebrados": nunca cai em ,00 nem ,50.
const brokenAmount = (min, max) => {
  let cents;
  do cents = Math.round(rand(min, max) * 100);
  while (cents % 50 === 0);
  return cents / 100;
};
const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

// [tag, descrições, faixa de valor]
const CATALOG = [
  ['alimentação', ['Açaí', 'Almoço', 'Lanche', 'Padaria', 'Café', 'Pizza', 'Sushi', 'Hamburguer', 'Sorvete', 'Marmita'], 8, 95],
  ['mercado', ['Supermercado', 'Feira', 'Hortifruti', 'Açougue', 'Atacadão', 'Mercadinho'], 25, 480],
  ['transporte', ['Uber', '99', 'Gasolina', 'Estacionamento', 'Ônibus', 'Pedágio', 'Lavagem do carro'], 6, 260],
  ['lazer', ['Cinema', 'Bar', 'Show', 'Spotify', 'Netflix', 'Jogo', 'Livro', 'Passeio'], 15, 320],
  ['saúde', ['Farmácia', 'Consulta', 'Exame', 'Academia', 'Dentista', 'Vitaminas'], 20, 450],
  ['casa', ['Material de limpeza', 'Gás', 'Ferragem', 'Utensílios', 'Lâmpadas', 'Decoração'], 12, 380],
  ['vestuário', ['Camiseta', 'Tênis', 'Calça', 'Meias', 'Boné', 'Jaqueta'], 30, 420],
];

const PARCELADO = [
  ['TV 55"', 1800, 4200], ['Geladeira', 2400, 5200], ['Notebook', 3200, 7800],
  ['Celular', 1500, 6500], ['Sofá', 1200, 3900], ['Passagem aérea', 600, 2800],
  ['Óculos', 400, 1600], ['Bicicleta', 900, 3500], ['Micro-ondas', 450, 1100],
  ['Curso online', 300, 1900], ['Fone bluetooth', 250, 1300], ['Colchão', 800, 2900],
];
const INSTALLMENTS = [2, 3, 4, 5, 6, 8, 10, 12];

// [descrição, faixa de valor]
const RECEITA = [
  ['Freela', 350, 2800], ['Reembolso', 40, 620], ['Venda usado', 80, 1500],
  ['Cashback', 5, 90], ['Dividendos', 30, 480], ['Consultoria', 500, 3200],
];

const methods = await api('GET', '/payment-methods');
const credit = methods.filter((m) => m.kind === 'credit');
if (!methods.length) throw new Error('Nenhuma forma de pagamento cadastrada');
if (!credit.length) throw new Error('Nenhum cartão de crédito para as parceladas');

const existing = await api('GET', '/tags');
const tagId = {};
for (const [name] of CATALOG) {
  const found = existing.find((t) => t.description === name);
  tagId[name] = (found ?? (await api('POST', '/tags', { description: name }))).id;
}

let ok = 0;
for (let i = 0; i < AVISTA; i++) {
  const [tag, names, min, max] = pick(CATALOG);
  await api('POST', '/transactions', {
    description: pick(names),
    amount: brokenAmount(min, max),
    type: 'expense',
    paymentMethodId: pick(methods).id,
    tagIds: [tagId[tag]],
    date: isoDaysAgo(Math.floor(rand(0, 91))),
  });
  ok++;
}

for (let i = 0; i < PARCELADAS; i++) {
  const [name, min, max] = pick(PARCELADO);
  const installments = pick(INSTALLMENTS);
  await api('POST', '/transactions', {
    description: `${name} ${installments}x`,
    amount: brokenAmount(min, max),
    type: 'expense',
    paymentMethodId: pick(credit).id,
    installments,
    date: isoDaysAgo(Math.floor(rand(0, 121))),
  });
  ok++;
}

// Salário todo dia 5 dos últimos 4 meses + extras aleatórios. Entra pelo
// primeiro meio que não é cartão (pix/débito/dinheiro).
const cashLike = methods.find((m) => m.kind !== 'credit') ?? methods[0];
const salary = brokenAmount(5200, 5400);
for (let month = 0; month < 4; month++) {
  const d = new Date();
  d.setMonth(d.getMonth() - month, 5);
  if (d > new Date()) continue;
  await api('POST', '/transactions', {
    description: 'Salário',
    amount: salary,
    type: 'income',
    paymentMethodId: cashLike.id,
    date: d.toISOString().slice(0, 10),
  });
  ok++;
}
for (let i = 0; i < RECEITAS; i++) {
  const [name, min, max] = pick(RECEITA);
  await api('POST', '/transactions', {
    description: name,
    amount: brokenAmount(min, max),
    type: 'income',
    paymentMethodId: cashLike.id,
    date: isoDaysAgo(Math.floor(rand(0, 91))),
  });
  ok++;
}

console.log(`${ok} transações criadas (${AVISTA} à vista, ${PARCELADAS} parceladas, receitas: salários + ${RECEITAS})`);
