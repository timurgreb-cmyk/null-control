"use client";

import { useEffect, useState } from "react";
import { 
  getFinanceDirectories,
  getAdminExpenses,
  deleteAdminExpense,
  addFinanceArticle,
  deleteFinanceArticle,
  addFinanceCounterparty,
  deleteFinanceCounterparty
} from "@/app/actions/finance";
import { 
  Wallet, 
  TrendingUp, 
  Layers, 
  Users, 
  Trash2, 
  Plus, 
  Calendar, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Coins,
  UserCheck
} from "lucide-react";

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "articles" | "counterparties">("overview");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter dates
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    // Default to the first day of the current month
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Filter currency for analytics charts
  const [analyticsCurrency, setAnalyticsCurrency] = useState("KZT");

  // Directories & Expenses
  const [articles, setArticles] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Add Directory Forms
  const [newArticleName, setNewArticleName] = useState("");
  const [newCounterpartyName, setNewCounterpartyName] = useState("");

  // Search filter inside table
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load directories and expenses
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Directories
      const dirs = await getFinanceDirectories();
      if ("error" in dirs) {
        setNotification({ type: "error", text: dirs.error });
      } else {
        setArticles(dirs.articles || []);
        setCounterparties(dirs.counterparties || []);
      }

      // 2. Expenses
      const exp = await getAdminExpenses(startDate, endDate);
      if ("error" in exp) {
        setNotification({ type: "error", text: exp.error });
      } else {
        setExpenses(exp.data || []);
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: "error", text: "Ошибка при загрузке данных." });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
  };

  // Add Article
  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleName.trim()) return;

    setSubmitting(true);
    try {
      const res = await addFinanceArticle(newArticleName);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Статья успешно добавлена!");
        setNewArticleName("");
        await loadData(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось добавить статью.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить статью "${name}"? Связанные расходы останутся, но станут без категории.`)) {
      return;
    }

    try {
      const res = await deleteFinanceArticle(id);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Статья расходов удалена.");
        await loadData(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось удалить статью.");
    }
  };

  // Add Counterparty
  const handleAddCounterparty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounterpartyName.trim()) return;

    setSubmitting(true);
    try {
      const res = await addFinanceCounterparty(newCounterpartyName);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Контрагент успешно добавлен!");
        setNewCounterpartyName("");
        await loadData(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось добавить контрагента.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Counterparty
  const handleDeleteCounterparty = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить контрагента "${name}"?`)) {
      return;
    }

    try {
      const res = await deleteFinanceCounterparty(id);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Контрагент удален.");
        await loadData(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось удалить контрагента.");
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string, amount: number, currency: string, employee: string) => {
    if (!confirm(`Удалить запись о расходе на сумму ${formatCurrency(amount, currency)} сотрудника ${employee}?`)) {
      return;
    }

    try {
      const res = await deleteAdminExpense(id);
      if ("error" in res) {
        showNotification("error", res.error);
      } else {
        showNotification("success", "Запись о расходе успешно удалена.");
        await loadData(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Не удалось удалить расход.");
    }
  };

  // Currency Formatter
  const formatCurrency = (val: number, curr: string = "KZT") => {
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

  // Group stats by currency
  const getGroupedSumsText = (expList: any[]) => {
    const sums: Record<string, number> = {};
    expList.forEach(item => {
      const curr = item.currency || "KZT";
      sums[curr] = (sums[curr] || 0) + parseFloat(item.amount);
    });
    
    const entries = Object.entries(sums);
    if (entries.length === 0) return formatCurrency(0, "KZT");
    return entries.map(([curr, val]) => formatCurrency(val, curr)).join(" | ");
  };

  // Filter analytics by selected currency
  const currencyFilteredExpenses = expenses.filter(item => (item.currency || "KZT") === analyticsCurrency);
  const totalSpentFiltered = currencyFilteredExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  // Today stats
  const todayStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
  const todayExpenses = expenses.filter(item => item.expense_date === todayStr);

  // Calculate article breakdown
  const articleBreakdown = articles.map(art => {
    const spent = currencyFilteredExpenses
      .filter(item => item.article_id === art.id)
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);
    return {
      id: art.id,
      name: art.name,
      spent,
      percentage: totalSpentFiltered > 0 ? Math.round((spent / totalSpentFiltered) * 100) : 0
    };
  }).filter(item => item.spent > 0).sort((a, b) => b.spent - a.spent);

  // Add a "Без статьи" entry if there are expenses with null article_id
  const noArticleSpent = currencyFilteredExpenses
    .filter(item => !item.article_id)
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  if (noArticleSpent > 0) {
    articleBreakdown.push({
      id: "null",
      name: "Без статьи (не указана)",
      spent: noArticleSpent,
      percentage: totalSpentFiltered > 0 ? Math.round((noArticleSpent / totalSpentFiltered) * 100) : 0
    });
  }

  // Calculate counterparty breakdown
  const counterpartyBreakdown = counterparties.map(cp => {
    const spent = currencyFilteredExpenses
      .filter(item => item.counterparty_id === cp.id)
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);
    return {
      id: cp.id,
      name: cp.name,
      spent,
      percentage: totalSpentFiltered > 0 ? Math.round((spent / totalSpentFiltered) * 100) : 0
    };
  }).filter(item => item.spent > 0).sort((a, b) => b.spent - a.spent);

  const noCounterpartySpent = currencyFilteredExpenses
    .filter(item => !item.counterparty_id)
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  if (noCounterpartySpent > 0) {
    counterpartyBreakdown.push({
      id: "null",
      name: "Без контрагента",
      spent: noCounterpartySpent,
      percentage: totalSpentFiltered > 0 ? Math.round((noCounterpartySpent / totalSpentFiltered) * 100) : 0
    });
  }

  // Consolidated Employee Report (Breakdown by employee)
  const employeeMap: Record<string, { id: string, name: string, spent: number }> = {};
  currencyFilteredExpenses.forEach(exp => {
    const empId = exp.employee_id;
    const empName = exp.profile?.full_name || "Удаленный сотрудник";
    if (!employeeMap[empId]) {
      employeeMap[empId] = { id: empId, name: empName, spent: 0 };
    }
    employeeMap[empId].spent += parseFloat(exp.amount);
  });

  const employeeBreakdown = Object.values(employeeMap)
    .sort((a, b) => b.spent - a.spent)
    .map(item => ({
      ...item,
      percentage: totalSpentFiltered > 0 ? Math.round((item.spent / totalSpentFiltered) * 100) : 0
    }));

  // Filter expenses list by search query
  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const empName = exp.profile?.full_name?.toLowerCase() || "";
    const artName = exp.article?.name?.toLowerCase() || "";
    const cpName = exp.counterparty?.name?.toLowerCase() || "";
    const desc = exp.description?.toLowerCase() || "";
    const amt = exp.amount?.toString() || "";
    const curr = exp.currency?.toLowerCase() || "";
    return empName.includes(query) || artName.includes(query) || cpName.includes(query) || desc.includes(query) || amt.includes(query) || curr.includes(query);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Финансовый учет</h1>
          <p className="text-gray-500 mt-1">
            Контроль расходов предприятия, мультивалютные отчеты трех сотрудников (Альфия, Эльмира, Тимур).
          </p>
        </div>
        <button 
          onClick={() => loadData(true)} 
          className="self-start md:self-auto flex items-center px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Обновить
        </button>
      </div>

      {/* Global Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 transition-all duration-300 ${
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

      {/* Tab Switcher */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Сводный отчет и Журнал
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === "articles"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Статьи расходов
          </button>
          <button
            onClick={() => setActiveTab("counterparties")}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === "counterparties"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Контрагенты
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Загрузка данных...</p>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* Date & Currency Filters Row */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Дата с</label>
                    <div className="relative">
                      <Calendar className="absolute inset-y-0 left-0 pl-3.5 h-full w-5 text-gray-400 pointer-events-none" />
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Дата по</label>
                    <div className="relative">
                      <Calendar className="absolute inset-y-0 left-0 pl-3.5 h-full w-5 text-gray-400 pointer-events-none" />
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="w-48">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Валюта графиков</label>
                    <div className="relative">
                      <Coins className="absolute inset-y-0 left-0 pl-3.5 h-full w-5 text-gray-400 pointer-events-none" />
                      <select 
                        value={analyticsCurrency}
                        onChange={(e) => setAnalyticsCurrency(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white appearance-none cursor-pointer font-bold"
                      >
                        <option value="KZT">KZT (₸)</option>
                        <option value="RUB">RUB (₽)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="flex items-center justify-center px-5 py-2.5 bg-primary active:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Filter className="w-4 h-4 mr-2" /> Применить
                  </button>
                </form>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Потрачено в выбранный период (Все валюты)</h3>
                    <p className="text-2xl font-black text-gray-900 tracking-tight break-words pr-2">
                      {getGroupedSumsText(expenses)}
                    </p>
                    <p className="text-xs text-gray-500">Всего {expenses.length} записей</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Потрачено за сегодня (Все валюты)</h3>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight break-words pr-2">
                      {getGroupedSumsText(todayExpenses)}
                    </p>
                    <p className="text-xs text-gray-500">({todayStr})</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Wallet className="w-7 h-7" />
                  </div>
                </div>
              </div>

              {/* Consolidated Report Row (Employee, Articles, counterparties) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Employee Breakdown (Consolidated Report) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-bold text-gray-950 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2 text-gray-400" /> Отчет по сотрудникам
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                        {analyticsCurrency}
                      </span>
                    </div>

                    {employeeBreakdown.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Нет трат в валюте {analyticsCurrency}</p>
                    ) : (
                      <div className="space-y-4">
                        {employeeBreakdown.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-700 truncate max-w-[150px] font-semibold">{item.name}</span>
                              <span className="text-gray-950 font-bold">
                                {formatCurrency(item.spent, analyticsCurrency)} <span className="text-xs text-gray-400 font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {employeeBreakdown.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                      <span>Итого по {analyticsCurrency}:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(totalSpentFiltered, analyticsCurrency)}</span>
                    </div>
                  )}
                </div>

                {/* Articles Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-bold text-gray-950 flex items-center">
                        <Layers className="w-5 h-5 mr-2 text-gray-400" /> Распределение по статьям
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                        {analyticsCurrency}
                      </span>
                    </div>

                    {articleBreakdown.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Нет трат в валюте {analyticsCurrency}</p>
                    ) : (
                      <div className="space-y-4">
                        {articleBreakdown.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-700 truncate max-w-[150px]">{item.name}</span>
                              <span className="text-gray-950 font-bold">
                                {formatCurrency(item.spent, analyticsCurrency)} <span className="text-xs text-gray-400 font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#10B981] h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {articleBreakdown.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                      <span>Распределено статей:</span>
                      <span className="font-bold text-gray-950">{articleBreakdown.length}</span>
                    </div>
                  )}
                </div>

                {/* Counterparties Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-bold text-gray-950 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-gray-400" /> Траты по контрагентам
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                        {analyticsCurrency}
                      </span>
                    </div>

                    {counterpartyBreakdown.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Нет трат в валюте {analyticsCurrency}</p>
                    ) : (
                      <div className="space-y-4">
                        {counterpartyBreakdown.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-700 truncate max-w-[150px]">{item.name}</span>
                              <span className="text-gray-950 font-bold">
                                {formatCurrency(item.spent, analyticsCurrency)} <span className="text-xs text-gray-400 font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-orange-400 h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {counterpartyBreakdown.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                      <span>Контрагентов с тратами:</span>
                      <span className="font-bold text-gray-950">{counterpartyBreakdown.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Journal Table List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-base font-bold text-gray-950">Общий журнал расходов (все сотрудники)</h3>
                  
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute inset-y-0 left-3 h-full w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Поиск (сотрудник, статья, сумма)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm">Нет записей о расходах за выбранный период по фильтру.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">
                        <tr>
                          <th className="px-6 py-3">Дата</th>
                          <th className="px-6 py-3">Сотрудник</th>
                          <th className="px-6 py-3">Валюта</th>
                          <th className="px-6 py-3">Статья расходов</th>
                          <th className="px-6 py-3">Контрагент</th>
                          <th className="px-6 py-3">Комментарий</th>
                          <th className="px-6 py-3 text-right">Сумма</th>
                          <th className="px-6 py-3 text-center">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{exp.expense_date}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{exp.profile?.full_name || "Удален"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold text-[10px]">
                                {exp.currency || "KZT"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {exp.article ? (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs">
                                  {exp.article.name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Не указана</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {exp.counterparty ? (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium text-xs">
                                  {exp.counterparty.name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Не указан</span>
                              )}
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={exp.description}>
                              {exp.description || <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-gray-950">
                              {formatCurrency(parseFloat(exp.amount), exp.currency)}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteExpense(exp.id, parseFloat(exp.amount), exp.currency, exp.profile?.full_name || "Сотрудник")}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-90 transition-all"
                                title="Удалить запись"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ARTICLES TAB */}
          {activeTab === "articles" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Form to Add Article */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Добавить статью</h3>
                <form onSubmit={handleAddArticle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Название статьи *</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Аренда помещений"
                      value={newArticleName}
                      onChange={(e) => setNewArticleName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-primary active:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-gray-300"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Добавить статью
                  </button>
                </form>
              </div>

              {/* Articles List Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden md:col-span-2 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Список статей расходов</h3>
                </div>

                {articles.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm">Нет созданных статей расходов.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide text-left">
                        <tr>
                          <th className="px-6 py-3 w-12">№</th>
                          <th className="px-6 py-3">Название</th>
                          <th className="px-6 py-3 text-center w-24">Удалить</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
                        {articles.map((art, index) => (
                          <tr key={art.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 text-gray-400 font-semibold">{index + 1}</td>
                            <td className="px-6 py-3 font-semibold text-gray-900">{art.name}</td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleDeleteArticle(art.id, art.name)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                                title="Удалить статью"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COUNTERPARTIES TAB */}
          {activeTab === "counterparties" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Form to Add Counterparty */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Добавить контрагента</h3>
                <form onSubmit={handleAddCounterparty} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Имя / Наименование *</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: ООО ТоргСнаб"
                      value={newCounterpartyName}
                      onChange={(e) => setNewCounterpartyName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-primary active:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-gray-300"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Добавить контрагента
                  </button>
                </form>
              </div>

              {/* Counterparties List Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden md:col-span-2 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Список контрагентов</h3>
                </div>

                {counterparties.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm">Нет созданных контрагентов.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide text-left">
                        <tr>
                          <th className="px-6 py-3 w-12">№</th>
                          <th className="px-6 py-3">Имя / Компания</th>
                          <th className="px-6 py-3 text-center w-24">Удалить</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
                        {counterparties.map((cp, index) => (
                          <tr key={cp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 text-gray-400 font-semibold">{index + 1}</td>
                            <td className="px-6 py-3 font-semibold text-gray-900">{cp.name}</td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleDeleteCounterparty(cp.id, cp.name)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                                title="Удалить контрагента"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
