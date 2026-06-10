import { useRef, useState } from 'react';
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
  const fileToImportRef = useRef<PickedFileData | null>(null);
  const listRef = useRef<FlatList<AIMessage>>(null);

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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('ai.errorPrefix', { message: msg }) },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View className="px-4 pt-2">
          <Header
            title={t('ai.title')}
            subtitle={t('ai.provider', { name: env.AI_PROVIDER })}
            showBack
          />
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
                  : 'self-start bg-white dark:bg-slate-800'
              }`}
            >
              <Text
                selectable
                style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
                className={
                  item.role === 'user'
                    ? 'text-white'
                    : 'text-slate-900 dark:text-slate-50'
                }
              >
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            sending ? (
              <View className="my-2 self-start rounded-2xl bg-white px-4 py-3 dark:bg-slate-800">
                <ActivityIndicator size="small" color="#2563eb" />
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
                className="rounded-full bg-slate-200 px-3 py-1.5 dark:bg-slate-700"
              >
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-100">
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
          className="flex-row items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Pressable
            onPress={onAttach}
            disabled={pickingFile}
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
          >
            {pickingFile ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name="attach" size={20} color="#475569" />
            )}
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('ai.placeholder')}
            placeholderTextColor="#94a3b8"
            style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
            className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
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
