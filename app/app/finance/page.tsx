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
  Coins
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

      {/* Add Expense Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Внести расход</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Amount and Currency Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Сумма *</label>
            <div className="flex space-x-2">
              <div className="relative rounded-2xl shadow-sm flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Coins className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-11 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-lg"
                />
              </div>

              <div className="w-28 shrink-0">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full px-3 py-3.5 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm cursor-pointer"
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
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Дата расхода</label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          {/* Article Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Статья расходов</label>
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="block w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="">Выберите статью...</option>
              {articles.map((art) => (
                <option key={art.id} value={art.id}>{art.name}</option>
              ))}
            </select>
          </div>

          {/* Counterparty Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Контрагент</label>
            <select
              value={counterpartyId}
              onChange={(e) => setCounterpartyId(e.target.value)}
              className="block w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="">Выберите контрагента...</option>
              {counterparties.map((cp) => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
            </select>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Комментарий / Детали</label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute top-3 left-4 pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Например: Закуп муки в мешках..."
                rows={2}
                className="block w-full pl-11 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
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
