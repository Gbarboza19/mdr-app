import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cores, sombra, statusCor, STATUS } from '../theme';
import { Botao, CartaoVistoria, Chip } from '../ui';
import { alterarStatus, listarHistorico, listarVistorias, obterProposta, removerProposta } from '../db/database';
import { apagarFoto, formatarData } from '../util';

const mascara = (d = '') => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`);

export default function PropostaDetalhe({ route, navigation }) {
  const { id } = route.params;
  const [p, setP] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [novoStatus, setNovoStatus] = useState(null);
  const [obs, setObs] = useState('');

  const carregar = useCallback(async () => {
    try {
      const prop = await obterProposta(id);
      if (!prop) { navigation.goBack(); return; }
      setP(prop);
      setNovoStatus(prop.status);
      navigation.setOptions({ title: prop.protocolo });
      setHistorico(await listarHistorico(id));
      setVistorias(await listarVistorias({ propostaId: id }));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar a proposta.');
    }
  }, [id]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function mudarStatus(status, observacao) {
    try {
      await alterarStatus(id, status, observacao);
      Vibration.vibrate(50);
      setObs('');
      carregar();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  }

  function cancelar() {
    Alert.alert('Cancelar solicitação', 'A proposta ficará como "Cancelada". Você pode reabri-la depois.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar solicitação', style: 'destructive', onPress: () => mudarStatus('Cancelada', 'Cancelada pelo cliente.') },
    ]);
  }

  function excluir() {
    Alert.alert('Excluir proposta', `Excluir ${p.protocolo}? O histórico e as ${vistorias.length} vistoria(s) também serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            const fotos = await removerProposta(id);
            fotos.forEach(apagarFoto);
            Vibration.vibrate(120);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  function compartilhar() {
    const linhas = [
      `Proposta ${p.protocolo} – MDR Serviços`,
      `Serviço: ${p.servico}`,
      `Condomínio: ${p.condominio}${p.unidades ? ` (${p.unidades} unidades)` : ''}`,
      `Status: ${p.status}`,
      vistorias.length ? `Vistorias: ${vistorias.map((v) => `${v.ambiente} ${Number(v.inclinacao).toFixed(1)}°`).join(', ')}` : null,
    ].filter(Boolean);
    Share.share({ message: linhas.join('\n') }).catch(() => {});
  }

  if (!p) return <View style={s.centro}><ActivityIndicator size="large" color={cores.primaria} /></View>;
  const cancelada = p.status === 'Cancelada';

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.card, sombra]}>
        <View style={s.topo}>
          <Text style={s.servico}>{p.servico}</Text>
          <Chip texto={p.status} cor={statusCor[p.status]} />
        </View>
        <Info icone="business" texto={`${p.condominio}${p.unidades ? ` · ${p.unidades} unidades` : ''}`} />
        <Info icone="person" texto={p.nome} />
        <Info icone="call" texto={mascara(p.telefone)} />
        <Info icone="calendar" texto={`Criada em ${formatarData(p.criadoEm)}`} />
        {p.mensagem ? <Text style={s.msg}>"{p.mensagem}"</Text> : null}
        <View style={s.linha}>
          <Botao titulo="Editar" icone="create" tipo="contorno" style={s.metade} onPress={() => navigation.navigate('PropostaForm', { id })} />
          <Botao titulo="Compartilhar" icone="share-social" tipo="contorno" style={s.metade} onPress={compartilhar} />
        </View>
      </View>

      <Text style={s.secao}>Acompanhamento</Text>
      <View style={[s.card, sombra]}>
        {historico.length === 0 ? <Text style={s.vazio}>Sem registros.</Text> : historico.map((h, i) => (
          <View key={h.id} style={s.evento}>
            <View style={s.trilho}>
              <View style={[s.ponto, { backgroundColor: statusCor[h.status] || cores.suave }]} />
              {i < historico.length - 1 ? <View style={s.traco} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <Text style={[s.evStatus, { color: statusCor[h.status] || cores.texto }]}>{h.status}</Text>
              <Text style={s.evData}>{formatarData(h.data)}</Text>
              {h.observacao ? <Text style={s.evObs}>{h.observacao}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      <View style={s.secaoLinha}>
        <Text style={s.secao}>Vistorias ({vistorias.length})</Text>
      </View>
      {vistorias.length === 0 ? <Text style={s.vazio}>Nenhuma vistoria registrada para esta proposta.</Text> : null}
      {vistorias.map((v) => <CartaoVistoria key={v.id} v={v} onPress={() => navigation.navigate('VistoriaForm', { id: v.id })} />)}
      {!cancelada ? (
        <Botao titulo="Medir e registrar vistoria" icone="speedometer" tipo="verde" style={{ marginTop: 12 }}
          onPress={() => navigation.navigate('Principal', { screen: 'Vistoria', params: { propostaId: id } })} />
      ) : null}

      <Text style={s.secao}>Área da equipe MDR</Text>
      <View style={[s.card, sombra]}>
        <Text style={s.ajuda}>Simula o atendimento da empresa: a equipe atualiza o status e o cliente vê na linha do tempo.</Text>
        <View style={s.chips}>
          {STATUS.map((st) => <Chip key={st} texto={st} cor={statusCor[st]} ativo={novoStatus === st} onPress={() => setNovoStatus(st)} />)}
        </View>
        <TextInput style={s.input} value={obs} onChangeText={setObs} placeholder="Observação (ex.: proposta enviada por e-mail)" placeholderTextColor="#94A3B8" />
        <Botao titulo="Registrar atualização" icone="sync" desabilitado={novoStatus === p.status && !obs.trim()}
          onPress={() => mudarStatus(novoStatus, obs)} style={{ marginTop: 10 }} />
      </View>

      {cancelada
        ? <Botao titulo="Reabrir solicitação" icone="refresh" tipo="contorno" style={{ marginTop: 18 }} onPress={() => mudarStatus('Recebida', 'Reaberta pelo cliente.')} />
        : <Botao titulo="Cancelar solicitação" icone="close-circle" tipo="contorno" style={{ marginTop: 18 }} onPress={cancelar} />}
      <Botao titulo="Excluir proposta" icone="trash" tipo="perigo" style={{ marginTop: 10 }} onPress={excluir} />
    </ScrollView>
  );
}

const Info = ({ icone, texto }) => (
  <View style={s.info}><Ionicons name={icone} size={16} color={cores.primaria} /><Text style={s.infoTxt}>{texto}</Text></View>
);

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  servico: { flex: 1, fontSize: 18, fontWeight: '800', color: cores.primaria, marginRight: 8 },
  info: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  infoTxt: { marginLeft: 8, color: cores.texto, fontSize: 14, flex: 1 },
  msg: { marginTop: 10, color: cores.suave, fontStyle: 'italic', lineHeight: 20 },
  linha: { flexDirection: 'row', marginTop: 14 },
  metade: { flex: 1, marginHorizontal: 4, paddingVertical: 9 },
  secao: { fontSize: 16, fontWeight: '700', color: cores.texto, marginTop: 22, marginBottom: 8 },
  secaoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vazio: { color: cores.suave, fontSize: 13 },
  evento: { flexDirection: 'row' },
  trilho: { width: 22, alignItems: 'center' },
  ponto: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  traco: { flex: 1, width: 2, backgroundColor: cores.borda, marginTop: 2 },
  evStatus: { fontWeight: '700', fontSize: 14 },
  evData: { color: cores.suave, fontSize: 12 },
  evObs: { color: cores.texto, fontSize: 13, marginTop: 2 },
  ajuda: { color: cores.suave, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  input: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: cores.texto, marginTop: 4 },
});
