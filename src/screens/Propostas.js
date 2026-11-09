import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cores, sombra, statusCor, STATUS } from '../theme';
import { Botao, Chip } from '../ui';
import { listarPropostas, removerProposta } from '../db/database';
import { apagarFoto, formatarData } from '../util';

export default function Propostas({ navigation }) {
  const [itens, setItens] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('Todas');

  const carregar = useCallback(async () => {
    try {
      setItens(await listarPropostas({ busca, status: filtro }));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as propostas.');
    }
  }, [busca, filtro]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function excluir(p) {
    Alert.alert('Excluir proposta', `Deseja excluir a proposta ${p.protocolo}? O histórico e as vistorias dela também serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            const fotos = await removerProposta(p.id);
            fotos.forEach(apagarFoto);
            Vibration.vibrate(120);
            carregar();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível excluir a proposta.');
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={s.busca}>
        <Ionicons name="search" size={18} color={cores.suave} />
        <TextInput style={s.input} placeholder="Buscar por nome, condomínio ou protocolo" value={busca} onChangeText={setBusca} />
      </View>
      <View style={s.filtros}>
        {['Todas', ...STATUS].map((st) => (
          <Chip key={st} texto={st} ativo={filtro === st} cor={statusCor[st] || cores.primaria} onPress={() => setFiltro(st)} />
        ))}
      </View>

      <FlatList
        data={itens} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhuma proposta encontrada.{'\n'}Toque em + para solicitar a primeira.</Text>}
        renderItem={({ item: p }) => (
          <TouchableOpacity activeOpacity={0.85} style={[s.card, sombra]} onPress={() => navigation.navigate('PropostaDetalhe', { id: p.id })}>
            <View style={s.topo}>
              <Text style={s.protocolo}>{p.protocolo}</Text>
              <Chip texto={p.status} cor={statusCor[p.status]} />
            </View>
            <Text style={s.servico}>{p.servico}</Text>
            <Text style={s.det}>{p.condominio}{p.unidades ? ` • ${p.unidades} unidades` : ''}</Text>
            <Text style={s.det}>{p.nome} • {formatarData(p.criadoEm, false)}</Text>
            {p.qtdVistorias ? <Text style={s.vist}><Ionicons name="speedometer" size={12} /> {p.qtdVistorias} vistoria(s)</Text> : null}
            <View style={s.acoes}>
              <Botao titulo="Editar" icone="create" tipo="contorno" style={s.acao} onPress={() => navigation.navigate('PropostaForm', { id: p.id })} />
              <Botao titulo="Excluir" icone="trash" tipo="perigo" style={s.acao} onPress={() => excluir(p)} />
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[s.fab, sombra]} activeOpacity={0.85} onPress={() => navigation.navigate('PropostaForm')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: cores.borda },
  input: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 14 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 12 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  protocolo: { fontWeight: '800', color: cores.primaria, fontSize: 15 },
  servico: { fontSize: 16, fontWeight: '700', color: cores.texto, marginTop: 4 },
  det: { color: cores.suave, fontSize: 13, marginTop: 2 },
  vist: { color: cores.primaria, fontSize: 12, fontWeight: '600', marginTop: 4 },
  acoes: { flexDirection: 'row', marginTop: 12 },
  acao: { flex: 1, marginHorizontal: 4, paddingVertical: 9 },
  vazio: { textAlign: 'center', color: cores.suave, marginTop: 50, lineHeight: 22 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: cores.verde, alignItems: 'center', justifyContent: 'center' },
});
