import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { CollectionDialog } from '@/components/CollectionDialog';
import { CollectionPicker } from '@/components/CollectionPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  BackIcon,
  ChevronRightIcon,
  FolderIcon,
  StarIcon,
  TrashIcon,
} from '@/components/icons';
import {
  createCard,
  deleteCard,
  findDuplicateReference,
  getCard,
  updateCard,
} from '@/db/cards';
import { createCollection } from '@/db/collections';
import { useCollectionTree } from '@/hooks/useCollectionTree';
import { colors, font, layout, radius } from '@/theme';
import { letterOf } from '@/utils/text';

export default function EditCardScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id, collection } = useLocalSearchParams<{
    id: string;
    collection?: string;
  }>();

  const isNew = id === 'new';
  const cardId = isNew ? null : Number(id);

  /** Coleção aberta quando o "+" foi tocado — o cartão novo já nasce nela. */
  const openedIn = Number(collection) || null;

  const { tree, reload: reloadTree } = useCollectionTree();

  const [reference, setReference] = useState('');
  const [meaning, setMeaning] = useState('');
  /** Onde o cartão vai morar. Editável nos dois casos, novo ou existente. */
  const [collectionId, setCollectionId] = useState<number | null>(openedIn);
  const [focused, setFocused] = useState<'reference' | 'meaning' | null>(null);
  const [saving, setSaving] = useState(false);
  const [askingDiscard, setAskingDiscard] = useState(false);
  const [picking, setPicking] = useState(false);
  const [creatingIn, setCreatingIn] = useState<number | null | undefined>(
    undefined,
  );
  /** Outro cartão já salvo com esta mesma referência, se houver. */
  const [duplicate, setDuplicate] = useState<string | null>(null);

  /**
   * O que estava salvo quando a tela abriu. Comparar com isto — e não com
   * string vazia — é o que faz um cartão existente só acusar alteração
   * quando o texto realmente muda.
   */
  const saved = useRef<{
    reference: string;
    meaning: string;
    collectionId: number | null;
  }>({ reference: '', meaning: '', collectionId: openedIn });

  /** Alvo do "próximo" do teclado quando o foco está na referência. */
  const meaningRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cardId === null || Number.isNaN(cardId)) return;

    let active = true;
    getCard(db, cardId).then((card) => {
      if (!active || !card) return;
      setReference(card.reference);
      setMeaning(card.meaning);
      setCollectionId(card.collectionId);
      saved.current = {
        reference: card.reference,
        meaning: card.meaning,
        collectionId: card.collectionId,
      };
    });

    return () => {
      active = false;
    };
  }, [cardId, db]);

  const isDirty =
    reference !== saved.current.reference ||
    meaning !== saved.current.meaning ||
    collectionId !== saved.current.collectionId;

  /** Voltar sem salvar descarta o que foi digitado — por isso a confirmação. */
  const handleBack = useCallback(() => {
    if (isDirty) {
      setAskingDiscard(true);
      return;
    }
    router.back();
  }, [isDirty]);

  const trimmed = reference.trim();
  const trimmedMeaning = meaning.trim();

  /**
   * Procura outro cartão com a mesma referência enquanto se digita, para o
   * aviso aparecer antes do toque em Salvar e não como um erro depois dele.
   *
   * A comparação ignora caixa mas **respeita o acento**: "café" e "cafe" são
   * dois cartões diferentes, e os dois podem existir.
   */
  useEffect(() => {
    if (trimmed.length === 0) {
      setDuplicate(null);
      return;
    }

    let active = true;

    findDuplicateReference(db, trimmed, cardId).then((existing) => {
      if (active) setDuplicate(existing?.reference ?? null);
    });

    return () => {
      active = false;
    };
  }, [cardId, db, trimmed]);

  /** A coleção escolhida, ou `undefined` quando o cartão fica no Início. */
  const chosen = collectionId === null ? undefined : tree.byId(collectionId);

  // Um cartão sem significado não serve para jogar, então os dois campos são
  // obrigatórios — o botão Salvar e o "OK" do teclado seguem esta mesma regra.
  // Referência repetida bloqueia do mesmo jeito.
  const canSave =
    trimmed.length > 0 &&
    trimmedMeaning.length > 0 &&
    duplicate === null &&
    !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      // O aviso enquanto se digita é assíncrono: digitar depressa e tocar em
      // Salvar antes de a consulta voltar passaria por ele. Esta é a
      // verificação que vale.
      const existing = await findDuplicateReference(db, trimmed, cardId);

      if (existing) {
        setDuplicate(existing.reference);
        setSaving(false);
        return;
      }

      if (cardId === null || Number.isNaN(cardId)) {
        await createCard(db, reference, meaning, collectionId);
      } else {
        await updateCard(db, cardId, reference, meaning, collectionId);
      }
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Não deu para salvar', 'Tente novamente.');
    }
  }, [canSave, cardId, collectionId, db, meaning, reference, trimmed]);

  const handleDelete = useCallback(() => {
    if (cardId === null || Number.isNaN(cardId)) return;

    Alert.alert(
      'Excluir cartão',
      `"${trimmed}" será removido definitivamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteCard(db, cardId);
            router.back();
          },
        },
      ],
    );
  }, [cardId, db, trimmed]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <BackIcon />
        </Pressable>

        <Text style={styles.title}>
          {isNew ? 'Novo cartão' : 'Editar cartão'}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.preview}>
          {trimmed.length > 0 ? (
            <Text style={styles.previewLetter}>{letterOf(trimmed)}</Text>
          ) : null}
          <Text style={styles.previewText} numberOfLines={2}>
            {trimmed.length > 0 ? trimmed : 'Referência'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Referência</Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            onFocus={() => setFocused('reference')}
            onBlur={() => setFocused(null)}
            placeholder="Ex.: Courage"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              focused === 'reference' && styles.inputFocused,
            ]}
            // Só a primeira letra: "Give up" não vira "Give Up".
            autoCapitalize="sentences"
            autoCorrect={false}
            autoFocus={isNew}
            returnKeyType="next"
            // "submit" mantém o foco no teclado: ele passa direto para o
            // significado, sem fechar e reabrir.
            submitBehavior="submit"
            onSubmitEditing={() => meaningRef.current?.focus()}
          />

          {duplicate ? (
            <Text style={styles.error}>
              Já existe um cartão “{duplicate}”.
            </Text>
          ) : null}
        </View>

        <View>
          <Text style={styles.label}>Significado</Text>
          <TextInput
            ref={meaningRef}
            value={meaning}
            onChangeText={setMeaning}
            onFocus={() => setFocused('meaning')}
            onBlur={() => setFocused(null)}
            placeholder="O que essa referência quer dizer"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              styles.textarea,
              focused === 'meaning' && styles.inputFocused,
            ]}
            multiline
            textAlignVertical="top"
            returnKeyType="done"
            // Num campo multilinha o padrão do Enter é quebrar linha;
            // "blurAndSubmit" troca isso por fechar o teclado e salvar.
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleSave}
          />

          <View style={styles.hint}>
            <StarIcon />
            <Text style={styles.hintText}>
              No jogo, o significado deve ser o mais preciso possível.
            </Text>
          </View>
        </View>

        <View style={styles.collectionField}>
          <Text style={styles.label}>Coleção</Text>

          <Pressable
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={`Coleção: ${chosen?.name ?? 'Início'}`}
            accessibilityHint="Toque para escolher outra."
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <FolderIcon
              size={24}
              color={chosen?.color ?? colors.textSecondary}
            />
            <Text
              style={[styles.pickerName, !chosen && styles.pickerNameEmpty]}
              numberOfLines={1}
            >
              {chosen?.name ?? 'Início'}
            </Text>
            <ChevronRightIcon size={18} />
          </Pressable>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actions,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        {!isNew ? (
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Excluir cartão"
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <TrashIcon size={22} />
          </Pressable>
        ) : null}

        <PrimaryButton
          label="SALVAR"
          onPress={handleSave}
          disabled={!canSave}
        />
      </View>
      <ConfirmDialog
        visible={askingDiscard}
        title="Descartar alterações?"
        message={
          isNew
            ? 'O cartão ainda não foi salvo e será perdido.'
            : 'As mudanças feitas neste cartão serão perdidas.'
        }
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setAskingDiscard(false);
          router.back();
        }}
        onCancel={() => setAskingDiscard(false)}
      />

      <CollectionPicker
        visible={picking}
        title="Escolher coleção"
        subtitle="Onde este cartão vai ficar"
        confirmLabel="ESCOLHER"
        tree={tree}
        startAt={collectionId}
        onConfirm={(targetId) => {
          setCollectionId(targetId);
          setPicking(false);
        }}
        onCreateCollection={(parentId) => setCreatingIn(parentId)}
        onCancel={() => setPicking(false)}
      />

      {/* Depois da folha no JSX de propósito: criar uma coleção a partir dela
          abre este modal por cima, e fechar volta para a lista. */}
      <CollectionDialog
        visible={creatingIn !== undefined}
        title="Nova coleção"
        confirmLabel="CRIAR COLEÇÃO"
        onConfirm={async (name, color) => {
          const parentId = creatingIn ?? null;
          setCreatingIn(undefined);

          const newId = await createCollection(db, name, color, parentId);
          await reloadTree();
          // A recém-criada já fica escolhida: criar uma pasta aqui é sempre
          // para pôr este cartão dentro dela.
          setCollectionId(newId);
        }}
        onCancel={() => setCreatingIn(undefined)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: 14,
    paddingBottom: 24,
  },
  preview: {
    height: 130,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  previewLetter: {
    position: 'absolute',
    top: 12,
    left: 14,
    fontFamily: font.bodyBlack,
    fontSize: 12,
    color: colors.primary,
  },
  previewText: {
    fontFamily: font.bodyBlack,
    fontSize: 30,
    color: colors.text,
    textAlign: 'center',
  },
  field: {
    marginBottom: 22,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: font.bodyBold,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.input,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textarea: {
    minHeight: 110,
    fontFamily: font.bodySemi,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textProse,
  },
  error: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.dangerSoft,
    marginTop: 8,
  },
  collectionField: {
    marginTop: 22,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    backgroundColor: colors.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerName: {
    flex: 1,
    fontFamily: font.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  pickerNameEmpty: {
    color: colors.textSecondary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hintText: {
    flex: 1,
    fontFamily: font.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.gutter,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.borderDim,
  },
  deleteButton: {
    width: 64,
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.dangerBorder,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
