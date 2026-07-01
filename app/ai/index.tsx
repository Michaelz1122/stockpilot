import { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '@/components/ui/Header';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { getAIProvider } from '@/ai';
import { buildTools } from '@/ai/tools';
import type { AIMessage } from '@/ai/types';
import { env } from '@/lib/env';
import i18n from '@/i18n';
import { pickFileForAI, type PickedFileData } from '@/lib/file-pick';

export default function AIAssistant() {
  const { storeId, store } = useActiveStore();
  const { t, lang, isRTL } = useLocale();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: t('ai.greeting', { store: store?.name ?? '' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pickingFile, setPickingFile] = useState(false);
  const [attached, setAttached] = useState<PickedFileData | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');
  const fileToImportRef = useRef<PickedFileData | null>(null);
  const listRef = useRef<FlatList<AIMessage>>(null);

  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@ai_history_${storeId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
          }
        }
      } catch (e) {}
    };
    load();
  }, [storeId]);

  useEffect(() => {
    if (!storeId || messages.length === 0) return;
    // Don't save if it's just the exact initial greeting
    if (messages.length === 1 && messages[0].role === 'assistant' && messages[0].content === t('ai.greeting', { store: store?.name ?? '' })) return;
    AsyncStorage.setItem(`@ai_history_${storeId}`, JSON.stringify(messages)).catch(() => {});
  }, [messages, storeId]);

  const clearHistory = () => {
    Alert.alert(
      lang === 'ar' ? 'مسح المحادثة' : 'Clear Chat',
      lang === 'ar' ? 'هل أنت متأكد أنك تريد مسح جميع الرسائل؟' : 'Are you sure you want to clear all messages?',
      [
        { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'ar' ? 'مسح' : 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            const initial = [{ role: 'assistant', content: t('ai.greeting', { store: store?.name ?? '' }) }] as AIMessage[];
            setMessages(initial);
            if (storeId) {
              await AsyncStorage.removeItem(`@ai_history_${storeId}`);
            }
          }
        }
      ]
    );
  };

  const SUGGESTIONS = [
    t('ai.suggestions.lowStock'),
    t('ai.suggestions.topCustomers'),
    t('ai.suggestions.salesToday'),
    t('ai.suggestions.summary'),
  ];

  const onAttach = async () => {
    setPickingFile(true);
    try {
      const data = await pickFileForAI();
      if (data) setAttached(data);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('ai.fileParseFailed'));
    } finally {
      setPickingFile(false);
    }
  };

  const send = async (text?: string) => {
    if (!storeId) return;
    const userText = (text ?? input).trim();
    const file = attached;
    if (!userText && !file) return;

    setInput('');
    setAttached(null);

    // Compose message: user prompt + file content if any.
    let msgContent = userText;
    if (file) {
      fileToImportRef.current = file;
      const fileHeader = `[ATTACHED FILE: ${file.name}, ${file.totalRows} rows]\n${file.preview}\n[END OF FILE]\n\n`;
      msgContent = userText ? `${fileHeader}${userText}` : fileHeader.trim();
    }

    const next: AIMessage[] = [...messages, { role: 'user', content: msgContent }];
    setMessages(next);
    setSending(true);

    try {
      const provider = getAIProvider();
      // Pass the full attached file to tools so AI can import EVERY row, not just the preview.
      const persistedFile = fileToImportRef.current;
      const tools = buildTools(storeId, {
        lang,
        t: (k, p) => i18n.t(k, p) as string,
        attachedFile: persistedFile
          ? {
              name: persistedFile.name,
              hasHeaders: persistedFile.hasHeaders,
              headers: persistedFile.headers,
              rows: persistedFile.rows,
            }
          : null,
      });
      const systemPrompt =
        lang === 'ar'
          ? `أنت StockPilot AI، مساعد محلات تجزئة مصرية. تقدر تقرأ بيانات المحل وتضيف/تعدل عملاء وموردين وأصناف باستخدام الأدوات.

قواعد مهمة:
- لما المستخدم يرفق ملف ويقولك "ضيفهم" أو ما يطلب طلب محدد: استخدم \`import_attached_file_as\` (ده يستورد كل الصفوف من الملف الموجود في ذاكرة التطبيق، حتى لو كانت ١٠٠٠ صف). ممنوع استخدام \`bulk_add_*\` للملفات المرفقة — هي بتقطع الصفوف.
- العينة في المحادثة بتورّيك أول ١٠ صفوف بس عشان تفهم البنية. اختار العمود اللي فيه الاسم، السعر، الكمية، إلخ، وابعتهم في mapping.
- لو الأعمدة بدون أسماء، هتلاقي \`col_1, col_2, col_3, …\` بنفس ترتيب الإكسل.
- لو الصف الأول عنوان (مش بيانات)، حدد \`skip_first_row: true\`.
- لو المستخدم قال "ضيف عميل/مورد/صنف …" بدون ملف، استخدم add_customer / add_supplier / add_product مباشرة.
- لما تحتاج تعدل عنصر موجود، استخدم find_* أول، ثم update_*.
- استخدم تنسيق مختصر وباللغة العربية فقط. العملة: ${store?.currency ?? 'EGP'}.`
          : `You are StockPilot AI, an assistant for Egyptian retail stores. You can read store data and add/update customers, suppliers, and products using tools.

Critical rules:
- When the user attaches a file and says "add them" or similar: ALWAYS use \`import_attached_file_as\` (it imports ALL rows from device memory, even 1000+). NEVER use \`bulk_add_*\` for attached files — they truncate.
- The conversation only shows the first ~10 rows as a sample so you understand the structure. Pick which column is the name, price, quantity, etc, and send them in mapping.
- If columns have no headers, you'll see \`col_1, col_2, col_3, …\` matching the Excel order.
- If the first row is a title (not data), set \`skip_first_row: true\`.
- If the user says "add a customer/supplier/product…" without a file, call add_customer / add_supplier / add_product directly.
- For updates, call find_* first to get the id, then update_*.
- Reply briefly in English only. Currency: ${store?.currency ?? 'EGP'}.`;

      const res = await provider.send({
        messages: [{ role: 'system', content: systemPrompt }, ...next],
        tools,
        context: { storeId, lang },
        model: selectedModel,
      });
      let replyContent = res.reply;
      if (!replyContent && res.toolCalls && res.toolCalls.length > 0) {
        replyContent = lang === 'ar' ? 'تمت العملية بنجاح.' : 'Operation completed successfully.';
      }
      if (replyContent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: replyContent }]);
      }
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e === 'string'
            ? e
            : JSON.stringify(e);
            
      let friendlyError = t('ai.errorPrefix', { message: msg });
      
      // Handle Quota / Rate limits
      if (msg.includes('Quota exceeded') || msg.includes('429') || msg.includes('All models failed')) {
        friendlyError = lang === 'ar' 
          ? 'عفواً، لقد استنفدت الحد المجاني للرسائل الخاصة بهذا النموذج اليوم. يرجى اختيار نموذج آخر من القائمة في الأعلى لاستكمال المحادثة.'
          : 'You have exhausted the free daily limit for this model. Please select a different model from the dropdown above to continue.';
      }
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: friendlyError },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="px-4 pt-2">
          <Header
            title={t('ai.title')}
            subtitle={t('ai.provider', { name: env.AI_PROVIDER })}
            showBack
            right={
              <Pressable onPress={clearHistory} className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            }
          />
          <View className="flex-row items-center justify-between py-2 border-b border-border mb-2">
            <Text className="text-xs text-muted-foreground">{lang === 'ar' ? 'النموذج النشط:' : 'Active Model:'}</Text>
            <View className="flex-row gap-2">
              {['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash'].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setSelectedModel(m)}
                  className={`px-2 py-1 rounded-md ${selectedModel === m ? 'bg-brand-100 dark:bg-brand-900/50' : 'bg-secondary'}`}
                >
                  <Text className={`text-[10px] ${selectedModel === m ? 'text-brand-700 dark:text-brand-300 font-bold' : 'text-muted-foreground'}`}>
                    {m.replace('gemini-', '')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View
              className={`mb-2 max-w-[85%] rounded-2xl px-4 py-3 ${
                item.role === 'user'
                  ? 'self-end bg-brand-600'
                  : 'self-start bg-card border border-border'
              }`}
            >
              <Text
                selectable
                style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
                className={
                  item.role === 'user'
                    ? 'text-white'
                    : 'text-foreground'
                }
              >
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            sending ? (
              <View className="my-2 self-start rounded-2xl bg-card border border-border px-4 py-3">
                <ActivityIndicator size="small" color="var(--primary)" />
              </View>
            ) : null
          }
        />
        <View className="px-4 pb-1">
          <View className="mb-2 flex-row flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                className="rounded-full bg-secondary px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-foreground">
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {attached && (
          <View className="mx-3 mb-1 flex-row items-center justify-between rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/40">
            <View className="flex-1 flex-row items-center gap-2 pe-2">
              <Ionicons name="document-text" size={16} color="#2563eb" />
              <Text
                numberOfLines={1}
                className="flex-1 text-xs text-brand-800 dark:text-brand-200"
              >
                {t('ai.fileAttached', { name: attached.name, rows: attached.totalRows })}
              </Text>
            </View>
            <Pressable onPress={() => setAttached(null)} className="p-1">
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </Pressable>
          </View>
        )}
        <View
          className="flex-row items-center gap-2 border-t border-border bg-card px-3 py-2"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Pressable
            onPress={onAttach}
            disabled={pickingFile}
            className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
          >
            {pickingFile ? (
              <ActivityIndicator size="small" color="var(--primary)" />
            ) : (
              <Ionicons name="attach" size={20} color="var(--muted-foreground)" />
            )}
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('ai.placeholder')}
            placeholderTextColor="#94a3b8"
            style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
            className="flex-1 rounded-full bg-secondary px-4 py-3 text-foreground"
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send()}
            disabled={sending || (!input.trim() && !attached)}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              sending || (!input.trim() && !attached) ? 'bg-slate-300' : 'bg-brand-600'
            }`}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
