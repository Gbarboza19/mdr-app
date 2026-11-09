import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Accelerometer } from 'expo-sensors';
import { cores } from '../theme';
import { Botao } from '../ui';

const RAIO = 100;
const ENTRA = 0.04;
const SAI = 0.06;

export default function Vistoria({ navigation, route }) {
  const propostaId = route.params?.propostaId;
  const [disponivel, setDisponivel] = useState(true);
  const [leitura, setLeitura] = useState({ x: 0, y: 0, z: -1 });
  const [nivelado, setNivelado] = useState(false);
  const [travado, setTravado] = useState(false);
  const travadoRef = useRef(false);
  travadoRef.current = travado;

  useFocusEffect(useCallback(() => {
    let ativo = true; let sub = null;
    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ativo) return;
      setDisponivel(ok);
      if (!ok) return;
      Accelerometer.setUpdateInterval(80);
      sub = Accelerometer.addListener((d) => {
        if (travadoRef.current) return;
        setLeitura(d);
        const desvio = Math.hypot(d.x, d.y);
        setNivelado((antes) => (antes ? desvio < SAI : desvio < ENTRA));
      });
    }).catch(() => setDisponivel(false));
    return () => { ativo = false; if (sub) sub.remove(); };
  }, []));

  const { x, y, z } = leitura;
  const inclinacao = (Math.atan2(Math.hypot(x, y), Math.abs(z)) * 180) / Math.PI;
  const clamp = (v) => Math.max(-RAIO + 24, Math.min(RAIO - 24, v));

  useEffect(() => { if (nivelado && !travado) Vibration.vibrate(40); }, [nivelado]);

  function salvar() {
    setTravado(true);
    navigation.navigate('VistoriaForm', {
      inclinacao: Number(inclinacao.toFixed(1)), nivelado, propostaId,
    });
  }

  if (!disponivel) {
    return <View style={s.tela}><Text style={s.aviso}>Acelerômetro indisponível neste dispositivo. Teste em um celular com o Expo Go.</Text></View>;
  }

  return (
    <View style={s.tela}>
      <Text style={s.dica}>Apoie o celular sobre a superfície que deseja verificar (piso, bancada, tampo, soleira).</Text>
      <View style={[s.circulo, { borderColor: nivelado ? cores.verde : cores.primaria }]}>
        <View style={s.cruzV} /><View style={s.cruzH} />
        <View style={s.alvo} />
        <View style={[s.bolha, { backgroundColor: nivelado ? cores.verde : cores.amarelo, transform: [{ translateX: clamp(x * 200) }, { translateY: clamp(-y * 200) }] }]} />
      </View>
      <Text style={[s.status, { color: nivelado ? cores.verde : cores.texto }]}>{nivelado ? 'Nivelado ✓' : 'Fora de nível'}</Text>
      <Text style={s.graus}>Inclinação: {inclinacao.toFixed(1)}°{travado ? '  (travado)' : ''}</Text>

      <View style={s.botoes}>
        <Botao titulo={travado ? 'Retomar' : 'Travar'} icone={travado ? 'play' : 'pause'} tipo="contorno"
          onPress={() => setTravado(!travado)} style={s.botao} />
        <Botao titulo="Salvar medição" icone="save" tipo="verde" onPress={salvar} style={s.botao} />
      </View>
      <Botao titulo="Ver vistorias salvas" icone="list" tipo="contorno" onPress={() => navigation.navigate('VistoriasLista')}
        style={{ marginTop: 10, alignSelf: 'stretch' }} />
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dica: { textAlign: 'center', color: cores.suave, marginBottom: 24, lineHeight: 20 },
  aviso: { textAlign: 'center', color: cores.suave, fontSize: 15 },
  circulo: { width: RAIO * 2, height: RAIO * 2, borderRadius: RAIO, borderWidth: 4, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cruzV: { position: 'absolute', width: 1, height: '100%', backgroundColor: cores.borda },
  cruzH: { position: 'absolute', height: 1, width: '100%', backgroundColor: cores.borda },
  alvo: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: cores.borda, borderStyle: 'dashed' },
  bolha: { width: 48, height: 48, borderRadius: 24 },
  status: { fontSize: 22, fontWeight: '800', marginTop: 24 },
  graus: { fontSize: 15, color: cores.suave, marginTop: 4 },
  botoes: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18 },
  botao: { flex: 1, marginHorizontal: 4 },
});
