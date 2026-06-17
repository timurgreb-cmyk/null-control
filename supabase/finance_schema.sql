-- 1. Таблица статей расходов (Статьи)
CREATE TABLE IF NOT EXISTS public.finance_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица контрагентов (Поставщики, партнеры)
CREATE TABLE IF NOT EXISTS public.finance_counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица расходов
CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'KZT',
    article_id UUID REFERENCES public.finance_articles(id) ON DELETE SET NULL,
    counterparty_id UUID REFERENCES public.finance_counterparties(id) ON DELETE SET NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение Row Level Security (RLS)
ALTER TABLE public.finance_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они существуют (для предотвращения конфликтов)
DROP POLICY IF EXISTS "Articles viewable by authenticated" ON public.finance_articles;
DROP POLICY IF EXISTS "Articles manageable by admin" ON public.finance_articles;
DROP POLICY IF EXISTS "Counterparties viewable by authenticated" ON public.finance_counterparties;
DROP POLICY IF EXISTS "Counterparties manageable by admin" ON public.finance_counterparties;
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admin can view all expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admin can manage all expenses" ON public.finance_expenses;

-- Политики для статей расходов
CREATE POLICY "Articles viewable by authenticated" ON public.finance_articles 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Articles manageable by admin" ON public.finance_articles 
    FOR ALL USING (public.is_admin());

-- Политики для контрагентов
CREATE POLICY "Counterparties viewable by authenticated" ON public.finance_counterparties 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Counterparties manageable by admin" ON public.finance_counterparties 
    FOR ALL USING (public.is_admin());

-- Политики для расходов
CREATE POLICY "Users can view their own expenses" ON public.finance_expenses 
    FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "Users can insert their own expenses" ON public.finance_expenses 
    FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Users can delete their own expenses" ON public.finance_expenses 
    FOR DELETE USING (auth.uid() = employee_id);
CREATE POLICY "Admin can view all expenses" ON public.finance_expenses 
    FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can manage all expenses" ON public.finance_expenses 
    FOR ALL USING (public.is_admin());
