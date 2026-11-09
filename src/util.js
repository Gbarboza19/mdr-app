import { Directory, File, Paths } from 'expo-file-system';

export function formatarData(iso, comHora = true) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-BR');
  if (!comHora) return dia;
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

export async function salvarFoto(uriTemporaria) {
  const pasta = new Directory(Paths.document, 'vistorias');
  if (!pasta.exists) pasta.create();
  const destino = new File(pasta, `vistoria-${Date.now()}.jpg`);
  await new File(uriTemporaria).copy(destino);
  return destino.uri;
}

export function apagarFoto(uri) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
  }
}
