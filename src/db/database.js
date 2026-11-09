import * as SQLite from 'expo-sqlite';

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('mdr.db');
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS propostas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          protocolo TEXT NOT NULL DEFAULT '',
          nome TEXT NOT NULL,
          condominio TEXT NOT NULL,
          telefone TEXT NOT NULL,
          unidades INTEGER,
          servico TEXT NOT NULL,
          mensagem TEXT,
          status TEXT NOT NULL DEFAULT 'Recebida',
          criadoEm TEXT NOT NULL,
          atualizadoEm TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS historico (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          propostaId INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          observacao TEXT,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vistorias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          propostaId INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
          ambiente TEXT NOT NULL,
          inclinacao REAL NOT NULL,
          nivelado INTEGER NOT NULL,
          foto TEXT,
          observacao TEXT,
          criadoEm TEXT NOT NULL,
          atualizadoEm TEXT NOT NULL
        );`);
      return db;
    })();
  }
  return dbPromise;
}

const agora = () => new Date().toISOString();
const numero = (v) => (v ? parseInt(v, 10) || null : null);

export async function criarProposta(p) {
  const db = await getDb();
  let protocolo = '';
  await db.withTransactionAsync(async () => {
    const data = agora();
    const r = await db.runAsync(
      `INSERT INTO propostas (nome, condominio, telefone, unidades, servico, mensagem, status, criadoEm, atualizadoEm)
       VALUES (?, ?, ?, ?, ?, ?, 'Recebida', ?, ?)`,
      [p.nome.trim(), p.condominio.trim(), p.telefone, numero(p.unidades), p.servico, (p.mensagem || '').trim(), data, data]
    );
    const id = r.lastInsertRowId;
    protocolo = `MDR-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
    await db.runAsync('UPDATE propostas SET protocolo = ? WHERE id = ?', [protocolo, id]);
    await db.runAsync('INSERT INTO historico (propostaId, status, observacao, data) VALUES (?, ?, ?, ?)',
      [id, 'Recebida', 'Solicitação enviada pelo app.', data]);
  });
  return protocolo;
}

export async function listarPropostas({ busca = '', status = 'Todas' } = {}) {
  const db = await getDb();
  let sql = `SELECT p.*, (SELECT COUNT(*) FROM vistorias v WHERE v.propostaId = p.id) AS qtdVistorias
             FROM propostas p WHERE 1=1`;
  const args = [];
  if (status !== 'Todas') { sql += ' AND p.status = ?'; args.push(status); }
  if (busca.trim()) {
    sql += ' AND (p.nome LIKE ? OR p.condominio LIKE ? OR p.protocolo LIKE ?)';
    const q = `%${busca.trim()}%`;
    args.push(q, q, q);
  }
  return db.getAllAsync(`${sql} ORDER BY p.id DESC`, args);
}

export async function obterProposta(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM propostas WHERE id = ?', [id]);
}

export async function atualizarProposta(id, p) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE propostas SET nome=?, condominio=?, telefone=?, unidades=?, servico=?, mensagem=?, atualizadoEm=? WHERE id=?`,
    [p.nome.trim(), p.condominio.trim(), p.telefone, numero(p.unidades), p.servico, (p.mensagem || '').trim(), agora(), id]
  );
}

export async function alterarStatus(id, status, observacao = '') {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const data = agora();
    await db.runAsync('UPDATE propostas SET status = ?, atualizadoEm = ? WHERE id = ?', [status, data, id]);
    await db.runAsync('INSERT INTO historico (propostaId, status, observacao, data) VALUES (?, ?, ?, ?)',
      [id, status, observacao.trim(), data]);
  });
}

export async function listarHistorico(propostaId) {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM historico WHERE propostaId = ? ORDER BY id DESC', [propostaId]);
}

export async function removerProposta(id) {
  const db = await getDb();
  const fotos = await db.getAllAsync('SELECT foto FROM vistorias WHERE propostaId = ? AND foto IS NOT NULL', [id]);
  await db.runAsync('DELETE FROM propostas WHERE id = ?', [id]);
  return fotos.map((f) => f.foto);
}

export async function existeDuplicada(p, ignorarId = 0) {
  const db = await getDb();
  const r = await db.getFirstAsync(
    `SELECT id FROM propostas
     WHERE telefone = ? AND servico = ? AND lower(condominio) = lower(?) AND status != 'Cancelada' AND id != ?`,
    [p.telefone, p.servico, p.condominio.trim(), ignorarId]
  );
  return !!r;
}

export async function resumoPainel() {
  const db = await getDb();
  const linhas = await db.getAllAsync('SELECT status, COUNT(*) AS n FROM propostas GROUP BY status');
  const out = { total: 0 };
  linhas.forEach((l) => { out[l.status] = l.n; out.total += l.n; });
  const v = await db.getFirstAsync('SELECT COUNT(*) AS n, SUM(nivelado) AS ok FROM vistorias');
  out.vistorias = v?.n || 0;
  out.vistoriasOk = v?.ok || 0;
  return out;
}

export async function criarVistoria(v) {
  const db = await getDb();
  const data = agora();
  const r = await db.runAsync(
    `INSERT INTO vistorias (propostaId, ambiente, inclinacao, nivelado, foto, observacao, criadoEm, atualizadoEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.propostaId, v.ambiente.trim(), v.inclinacao, v.nivelado ? 1 : 0, v.foto || null, (v.observacao || '').trim(), data, data]
  );
  return r.lastInsertRowId;
}

export async function listarVistorias({ propostaId = null } = {}) {
  const db = await getDb();
  let sql = `SELECT v.*, p.protocolo, p.condominio FROM vistorias v JOIN propostas p ON p.id = v.propostaId`;
  const args = [];
  if (propostaId) { sql += ' WHERE v.propostaId = ?'; args.push(propostaId); }
  return db.getAllAsync(`${sql} ORDER BY v.id DESC`, args);
}

export async function obterVistoria(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM vistorias WHERE id = ?', [id]);
}

export async function atualizarVistoria(id, v) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE vistorias SET propostaId=?, ambiente=?, foto=?, observacao=?, atualizadoEm=? WHERE id=?`,
    [v.propostaId, v.ambiente.trim(), v.foto || null, (v.observacao || '').trim(), agora(), id]
  );
}

export async function removerVistoria(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM vistorias WHERE id = ?', [id]);
}
