import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cores } from '../theme';
import { CartaoVistoria, Chip } from '../ui';
import { listarVistorias } from '../db/database';

export default function VistoriasLista({ navigation }) {
  const [itens, setItens] = useState([]);
  const [filtro, setFiltro] = useState('Todas');

  useFocusEffect(useCallback(() => {
    listarVistorias().then(setItens).catch(() => Alert.alert('Erro', 'Não foi possível carregar as vistorias.'));
  }, []));

  const lista = itens.filter((v) => filtro === 'Todas' || (filtro === 'Niveladas' ? v.nivelado : !v.nivelado));

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={s.filtros}>
        {['Todas', 'Niveladas', 'Fora de nível'].map((f) => (
          <Chip key={f} texto={f} ativo={filtro === f} cor={f === 'Niveladas' ? cores.verde : f === 'Fora de nível' ? cores.amarelo : cores.primaria}
            onPress={() => setFiltro(f)} />
        ))}
      </View>
      <FlatList
        data={lista} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhuma vistoria salva.{'\n'}Use a aba Vistoria para medir e salvar.</Text>}
        renderItem={({ item }) => (
          <CartaoVistoria v={item} mostrarProposta onPress={() => navigation.navigate('VistoriaForm', { id: item.id })} />
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  filtros: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingBottom: 4 },
  vazio: { textAlign: 'center', color: cores.suave, marginTop: 50, lineHeight: 22 },
});
