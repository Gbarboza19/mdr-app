import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, sombra } from './theme';
import { formatarData } from './util';

const variantes = {
  primario: { bg: cores.primaria, fg: '#fff' },
  verde: { bg: cores.verde, fg: '#fff' },
  contorno: { bg: 'transparent', fg: cores.primaria, borda: cores.primaria },
  perigo: { bg: '#FEE2E2', fg: cores.erro },
};

export function Botao({ titulo, onPress, tipo = 'primario', icone, desabilitado, style }) {
  const v = variantes[tipo];
  return (
    <TouchableOpacity
      activeOpacity={0.8} disabled={desabilitado} onPress={onPress}
      style={[s.botao, { backgroundColor: v.bg, borderColor: v.borda || 'transparent', opacity: desabilitado ? 0.5 : 1 }, style]}>
      {icone ? <Ionicons name={icone} size={18} color={v.fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[s.botaoTxt, { color: v.fg }]}>{titulo}</Text>
    </TouchableOpacity>
  );
}

export function Campo({ label, erro, ...props }) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8" {...props}
        style={[s.input, props.multiline && { height: 96, textAlignVertical: 'top' }, erro && { borderColor: cores.erro }]}
      />
      {erro ? <Text style={s.erro}>{erro}</Text> : null}
    </View>
  );
}

export function Chip({ texto, ativo = true, cor = cores.primaria, onPress }) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp onPress={onPress} style={[s.chip, { borderColor: cor, backgroundColor: ativo ? cor : 'transparent' }]}>
      <Text style={{ color: ativo ? '#fff' : cor, fontSize: 12, fontWeight: '600' }}>{texto}</Text>
    </Comp>
  );
}

export function CartaoVistoria({ v, onPress, mostrarProposta }) {
  const cor = v.nivelado ? cores.verde : cores.amarelo;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.vCard, sombra]}>
      {v.foto ? <Image source={{ uri: v.foto }} style={s.vFoto} />
        : <View style={[s.vFoto, s.vSemFoto]}><Ionicons name="image-outline" size={24} color={cores.suave} /></View>}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.vAmb}>{v.ambiente}</Text>
        {mostrarProposta ? <Text style={s.vDet}>{v.protocolo} · {v.condominio}</Text> : null}
        <Text style={s.vDet}>{formatarData(v.criadoEm)}</Text>
        <Text style={[s.vGraus, { color: cor }]}>{Number(v.inclinacao).toFixed(1)}° · {v.nivelado ? 'Nivelado' : 'Fora de nível'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={cores.suave} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  vCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 10, marginTop: 10 },
  vFoto: { width: 64, height: 64, borderRadius: 10 },
  vSemFoto: { backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' },
  vAmb: { fontSize: 15, fontWeight: '700', color: cores.texto },
  vDet: { fontSize: 12, color: cores.suave, marginTop: 1 },
  vGraus: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5 },
  botaoTxt: { fontSize: 15, fontWeight: '700' },
  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: cores.texto, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: cores.borda, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: cores.texto },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8, marginBottom: 8 },
});
