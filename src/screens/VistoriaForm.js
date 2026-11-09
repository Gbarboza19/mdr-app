import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { cores, sombra } from '../theme';
import { Botao, Campo, Chip } from '../ui';
import { atualizarVistoria, criarVistoria, listarPropostas, obterVistoria, removerVistoria } from '../db/database';
import { apagarFoto, salvarFoto } from '../util';

const AMBIENTES = ['Hall', 'Garagem', 'Salão de festas', 'Corredor', 'Portaria', 'Área externa'];
const ERRO_VIB = [0, 80, 60, 80];

export default function VistoriaForm({ route, navigation }) {
  const { id, inclinacao, nivelado, propostaId } = route.params || {};
  const editando = !!id;
  const [f, setF] = useState({ propostaId: propostaId || null, ambiente: '', observacao: '', foto: null, inclinacao: inclinacao ?? 0, nivelado: !!nivelado });
  const [fotoOriginal, setFotoOriginal] = useState(null);
  const [propostas, setPropostas] = useState([]);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const set = (k, v) => setF((a) => ({ ...a, [k]: v }));

  useEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar vistoria' : 'Registrar vistoria' });
    (async () => {
      try {
        const lista = await listarPropostas();
        if (editando) {
          const v = await obterVistoria(id);
          if (v) {
            setF({ ...v, nivelado: !!v.nivelado, observacao: v.observacao || '' });
            setFotoOriginal(v.foto);
          }
          setPropostas(lista);
        } else {
          setPropostas(lista.filter((p) => p.status !== 'Cancelada'));
        }
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  async function escolherFoto(origem) {
    try {
      const perm = origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão negada', `Libere o acesso à ${origem === 'camera' ? 'câmera' : 'galeria'} nas configurações do celular.`);
        return;
      }
      const opcoes = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] };
      const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
      if (!r.canceled && r.assets?.length) set('foto', r.assets[0].uri);
    } catch (e) {
      Alert.alert('Ops', 'Não foi possível abrir a câmera/galeria neste dispositivo.');
    }
  }

  function validar() {
    const e = {};
    if (!f.propostaId) e.propostaId = 'Escolha a proposta (condomínio) desta vistoria.';
    if (f.ambiente.trim().length < 2) e.ambiente = 'Informe o ambiente medido.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar() {
    if (!validar()) { Vibration.vibrate(ERRO_VIB); return; }
    setSalvando(true);
    try {
      let foto = f.foto;
      if (foto && foto !== fotoOriginal) foto = await salvarFoto(foto);
      if (fotoOriginal && fotoOriginal !== foto) apagarFoto(fotoOriginal);

      if (editando) await atualizarVistoria(id, { ...f, foto });
      else await criarVistoria({ ...f, foto });
      Vibration.vibrate(50);
      Alert.alert(editando ? 'Vistoria atualizada' : 'Vistoria registrada', 'Os dados foram salvos no aparelho.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a vistoria. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function excluir() {
    Alert.alert('Excluir vistoria', 'Deseja excluir esta vistoria e a foto dela?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await removerVistoria(id);
            apagarFoto(fotoOriginal);
            Vibration.vibrate(120);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  if (carregando) return <View style={s.centro}><ActivityIndicator size="large" color={cores.primaria} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={s.corpo} keyboardShouldPersistTaps="handled">
        <View style={[s.medicao, sombra, { borderLeftColor: f.nivelado ? cores.verde : cores.amarelo }]}>
          <Ionicons name={f.nivelado ? 'checkmark-circle' : 'alert-circle'} size={30} color={f.nivelado ? cores.verde : cores.amarelo} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.medNum}>{Number(f.inclinacao).toFixed(1)}°</Text>
            <Text style={s.medTxt}>{f.nivelado ? 'Superfície nivelada' : 'Superfície fora de nível'}</Text>
          </View>
        </View>

        <Text style={s.label}>Proposta / condomínio *</Text>
        {propostas.length === 0 ? (
          <Text style={s.aviso}>Você ainda não tem propostas ativas. Solicite uma proposta antes de registrar a vistoria.</Text>
        ) : (
          <View style={s.chips}>
            {propostas.map((p) => (
              <Chip key={p.id} texto={`${p.protocolo} · ${p.condominio}`} ativo={f.propostaId === p.id} onPress={() => set('propostaId', p.id)} />
            ))}
          </View>
        )}
        {erros.propostaId ? <Text style={s.erro}>{erros.propostaId}</Text> : null}

        <Text style={[s.label, { marginTop: 8 }]}>Ambiente *</Text>
        <View style={s.chips}>
          {AMBIENTES.map((a) => <Chip key={a} texto={a} cor={cores.suave} ativo={f.ambiente === a} onPress={() => set('ambiente', a)} />)}
        </View>
        <Campo label="Ou digite o ambiente" value={f.ambiente} onChangeText={(v) => set('ambiente', v)} erro={erros.ambiente} placeholder="Ex.: Piso do bloco B" />

        <Text style={s.label}>Foto do local</Text>
        {f.foto ? (
          <View>
            <Image source={{ uri: f.foto }} style={s.foto} />
            <Botao titulo="Remover foto" icone="trash" tipo="perigo" onPress={() => set('foto', null)} style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={s.linha}>
            <Botao titulo="Câmera" icone="camera" tipo="contorno" onPress={() => escolherFoto('camera')} style={s.metade} />
            <Botao titulo="Galeria" icone="images" tipo="contorno" onPress={() => escolherFoto('galeria')} style={s.metade} />
          </View>
        )}

        <View style={{ height: 14 }} />
        <Campo label="Observações" value={f.observacao} onChangeText={(v) => set('observacao', v)} multiline placeholder="Ex.: piso cede perto do ralo" />

        <Botao titulo={salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar vistoria'} icone="checkmark-circle"
          tipo="verde" onPress={salvar} desabilitado={salvando || propostas.length === 0} style={{ marginTop: 8 }} />
        {editando ? <Botao titulo="Excluir vistoria" icone="trash" tipo="perigo" onPress={excluir} style={{ marginTop: 10 }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  corpo: { padding: 16, paddingBottom: 40 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
  medicao: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 18, borderLeftWidth: 5 },
  medNum: { fontSize: 24, fontWeight: '800', color: cores.texto },
  medTxt: { color: cores.suave, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: cores.texto, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  erro: { color: cores.erro, fontSize: 12, marginBottom: 8 },
  aviso: { color: cores.suave, fontSize: 13, marginBottom: 10, lineHeight: 18 },
  foto: { width: '100%', height: 200, borderRadius: 12, backgroundColor: cores.borda },
  linha: { flexDirection: 'row' },
  metade: { flex: 1, marginHorizontal: 4 },
});
