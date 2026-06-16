"use client";

import { useEffect, useState } from "react";
import { 
  getFinanceDirectories, 
  addExpense, 
  getUserExpenses, 
  deleteExpense 
} from "@/app/actions/finance";
import { getCurrentProfile } from "@/app/actions/auth";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  Loader2, 
  User,
  AlertCircle,
  CheckCircle2,
  Coins,
  Mic
} from "lucide-react";

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Directories
  const [articles, setArticles] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  
  // Form fields
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KZT");
  const [articleId, setArticleId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  // Message notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // User's logged expenses
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Trigger notification auto-hide
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load directories and profile on mount
  useEffect(() => {
    async function init() {
      try {
        const prof = await getCurrentProfile();
        setProfile(prof);

        const dirs = await getFinanceDirectories();
        if ("error" in dirs) {
          showNotification("error", dirs.error);
        } else {
          setArticles(dirs.articles || []);
          setCounterparties(dirs.counterparties || []);
        }

        // Load recent expenses
        await refreshExpenses();
      } catch (err) {
        console.error("Failed to initialize finance page", err);
        showNotification("error", "Произошла ошибка при загрузке данных.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "ru-RU";

        rec.onstart = () => {
          setIsListening(true);
          setVoiceText("");
        };

        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setVoiceText(text);
          handleProcessVoiceText(text);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error !== "no-speech") {
            showNotification("error", "Ошибка распознавания речи: " + event.error);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, [articles, counterparties]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Голосовой ввод не поддерживается вашим браузером или устройством.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleProcessVoiceText = async (text: string) => {
    if (!text.trim()) return;
    setAiProcessing(true);
    showNotification("success", "Голос распознан. ИИ обрабатывает текст...");

    try {
      const { parseVoiceExpense } = await import("@/app/actions/finance");
      const res = await parseVoiceExpense(text);

      if ("error" in res) {
        showNotification("error", res.error);
      } else if (res.success && res.data) {
        const data = res.data;
        const highlights: Record<string, boolean> = {};

        if (data.amount && parseFloat(data.amount) > 0) {
          setAmount(data.amount.toString());
          highlights.amount = true;
        }
        if (data.currency) {
          setCurrency(data.currency);
          highlights.currency = true;
        }
        if (data.article_id) {
          setArticleId(data.article_id);
          highlights.article = true;
        } else {
          setArticleId("");
        }
        if (data.counterparty_id) {
          setCounterpartyId(data.counterparty_id);
          highlights.counterparty = true;
        } else {
          setCounterpartyId("");
        }
        if (data.description) {
          setDescription(data.description);
          highlights.description = true;
        } else {
          setDescription("");
        }
        if (data.expense_date) {
          setExpenseDate(data.expense_date);
          highlights.date = true;
        }

        setHighlightedFields(highlights);
        showNotification("success", "ИИ успешно заполнил форму! Проверьте поля.");

        // Remove highlights after 4 seconds
        setTimeout(() => {
          setHighlightedFields({});
        }, 4000);
      }
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message || "Ошибка ИИ-обработки голосового ввода.");
    } finally {
      setAiProcessing(false);
    }
  };

  const refreshExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const res = await getUserExpenses();
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        setExpenses(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showNotification("error", "Укажите сумму расхода больше 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await addExpense(
        parseFloat(amount),
        currency,
        articleId || null,
        counterpartyId || null,
        description,
        expenseDate
      );

      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Расход успешно сохранен!");
        // Reset form
        setAmount("");
        setArticleId("");
        setCounterpartyId("");
        setDescription("");
        // Reload list
        await refreshExpenses();
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось сохранить расход.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы действительно хотите удалить эту запись о расходе?")) {
      return;
    }

    try {
      const res = await deleteExpense(id);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Запись удалена.");
        await refreshExpenses();
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось удалить запись.");
    }
  };

  // Format amount to beautiful currencies
  const formatCurrency = (val: number, curr: string) => {
    const formattedCurr = curr || "KZT";
    let locale = "kk-KZ";
    if (formattedCurr === "RUB") locale = "ru-RU";
    else if (formattedCurr === "USD") locale = "en-US";
    else if (formattedCurr === "EUR") locale = "de-DE";

    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: formattedCurr, maximumFractionDigits: 0 }).format(val);
    } catch (e) {
      const symbols: Record<string, string> = { KZT: "₸", RUB: "₽", USD: "$", EUR: "€" };
      return `${val.toLocaleString()} ${symbols[formattedCurr] || formattedCurr}`;
    }
  };

  // Group daily expenses by currency and calculate sums
  const todayExpenses = expenses.filter(exp => exp.expense_date === expenseDate);
  const dailySums: Record<string, number> = {};
  
  todayExpenses.forEach(exp => {
    const curr = exp.currency || "KZT";
    dailySums[curr] = (dailySums[curr] || 0) + parseFloat(exp.amount);
  });

  const dailySumText = Object.entries(dailySums).length > 0
    ? Object.entries(dailySums).map(([curr, val]) => formatCurrency(val, curr)).join(" + ")
    : formatCurrency(0, "KZT");

  // CSS highlighter
  const highlightClass = (field: string) => {
    return highlightedFields[field] 
      ? "ring-2 ring-amber-400 bg-amber-50/50 border-amber-300 transition-all duration-1000 scale-[1.01]" 
      : "transition-all duration-1000";
  };

  if (loading) {
    return (
      <div className="p-4 pt-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
          <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
          <div className="w-full space-y-4">
            <div className="h-12 bg-gray-100 rounded-2xl w-full" />
            <div className="h-12 bg-gray-100 rounded-2xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-6 max-w-md mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Финансовый учет</h1>
            <p className="text-xs text-gray-500 flex items-center mt-0.5">
              <User className="w-3.5 h-3.5 mr-1" /> {profile?.full_name}
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start space-x-3 transition-all duration-300 ${
          notification.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : "bg-rose-50 border-rose-100 text-rose-800"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{notification.text}</span>
        </div>
      )}

      {/* AI Voice Assistant Card (LARGE mic button dashboard) */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md p-5 flex flex-col items-center relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-4 w-full">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 px-2.5 py-1 rounded-full">
              ИИ Ассистент
            </span>
          </div>

          <p className="text-xs text-emerald-100 font-medium max-w-xs leading-relaxed">
            Нажмите кнопку ниже и назовите сумму, валюту, статью, контрагента и дату.
          </p>

          {/* Centered Large Circular Pulse Mic Button */}
          <div className="relative flex items-center justify-center py-2">
            {isListening && (
              <span className="absolute inline-flex h-20 w-20 rounded-full bg-rose-400/30 animate-ping" />
            )}
            <button
              type="button"
              onClick={toggleListening}
              disabled={aiProcessing}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10 ${
                isListening
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/30"
                  : aiProcessing
                    ? "bg-amber-400 text-amber-950"
                    : "bg-white text-emerald-700 hover:bg-emerald-50 hover:scale-105"
              }`}
            >
              {aiProcessing ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Mic className={`w-7 h-7 ${isListening ? "animate-pulse" : ""}`} />
              )}
            </button>
          </div>

          <span className="text-xs font-bold tracking-wide">
            {isListening 
              ? "Слушаю вас... Говорите" 
              : aiProcessing 
                ? "ИИ обрабатывает вашу речь..." 
                : "Продиктовать расход голосом"}
          </span>

          {isListening && (
            <p className="text-[10px] text-rose-200 italic animate-pulse">
              «Вчера оплатили аренду 120 000 тенге контрагенту ИП Иванову»
            </p>
          )}

          {/* Live transcript log */}
          {voiceText && (
            <div className="w-full bg-black/15 border border-white/10 rounded-xl p-3 text-left mt-2 transition-all">
              <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold block mb-1">Распознано:</span>
              <p className="text-xs text-white italic font-medium leading-relaxed">&ldquo;{voiceText}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Внести расход вручную</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Amount and Currency Field */}
          <div className={`p-1.5 rounded-2xl ${highlightClass("amount") || highlightClass("currency")}`}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Сумма *</label>
            <div className="flex space-x-2">
              <div className="relative rounded-xl shadow-sm flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Coins className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-10 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-lg"
                />
              </div>

              <div className="w-28 shrink-0">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full px-3 py-3.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm cursor-pointer"
                >
                  <option value="KZT">KZT (₸)</option>
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Field */}
          <div className={`p-1.5 rounded-2xl ${highlightClass("date")}`}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Дата расхода</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          {/* Article Selector */}
          <div className={`p-1.5 rounded-2xl ${highlightClass("article")}`}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Статья расходов</label>
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="block w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm cursor-pointer"
            >
              <option value="">Выберите статью...</option>
              {articles.map((art) => (
                <option key={art.id} value={art.id}>{art.name}</option>
              ))}
            </select>
          </div>

          {/* Counterparty Selector */}
          <div className={`p-1.5 rounded-2xl ${highlightClass("counterparty")}`}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Контрагент</label>
            <select
              value={counterpartyId}
              onChange={(e) => setCounterpartyId(e.target.value)}
              className="block w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm cursor-pointer"
            >
              <option value="">Выберите контрагента...</option>
              {counterparties.map((cp) => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
            </select>
          </div>

          {/* Description Field */}
          <div className={`p-1.5 rounded-2xl ${highlightClass("description")}`}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Комментарий / Детали</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute top-3.5 left-3.5 pointer-events-none">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Например: Оплата материалов для цеха..."
                rows={2}
                className="block w-full pl-10 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isListening}
            className="w-full flex items-center justify-center px-4 py-3.5 bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl font-bold shadow-md shadow-emerald-600/10 active:scale-[0.98] transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2 stroke-[2.5px]" />
                Сохранить расход
              </>
            )}
          </button>
        </form>
      </div>

      {/* Daily Summary Card */}
      <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl p-4 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Итог за выбранную дату</span>
          <p className="text-[10px] text-emerald-600 font-medium">({expenseDate})</p>
        </div>
        <div className="text-right pl-4">
          <span className="text-xl font-black text-emerald-700 tracking-tight block max-w-[200px] break-words">
            {dailySumText}
          </span>
        </div>
      </div>

      {/* User's Recent Expenses List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ваши недавние записи</h2>
          {loadingExpenses && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Вы еще не вносили расходы.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((exp) => (
              <div 
                key={exp.id} 
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between hover:border-gray-200 transition-all"
              >
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-black text-gray-900 tracking-tight">
                      {formatCurrency(parseFloat(exp.amount), exp.currency)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">
                      {exp.expense_date}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {exp.article && (
                      <p className="text-xs text-gray-700 flex items-center">
                        <span className="font-bold text-gray-400 mr-1.5 uppercase text-[9px] tracking-wider shrink-0">Статья:</span> 
                        <span className="truncate">{exp.article.name}</span>
                      </p>
                    )}
                    {exp.counterparty && (
                      <p className="text-xs text-gray-700 flex items-center">
                        <span className="font-bold text-gray-400 mr-1.5 uppercase text-[9px] tracking-wider shrink-0">Кому:</span> 
                        <span className="truncate">{exp.counterparty.name}</span>
                      </p>
                    )}
                    {exp.description && (
                      <p className="text-xs text-gray-500 italic truncate max-w-xs">
                        &ldquo;{exp.description}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(exp.id)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0 active:scale-90"
                  title="Удалить запись"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
