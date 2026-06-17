-- Функция для безопасной проверки роли без рекурсии в RLS политиках
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Таблица локаций (Locations)
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица профилей сотрудников (Profiles)
-- Связана с auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    shift_rate NUMERIC DEFAULT 0,
    role TEXT CHECK (role IN ('employee', 'admin')) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица отметок времени (Time Records)
CREATE TABLE public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    record_type TEXT CHECK (record_type IN ('check_in', 'check_out')) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Таблица смен/графика (Shifts)
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    planned_start TIME,
    planned_end TIME
);

-- Настройка Row Level Security (RLS)

-- 1. Locations: чтение для всех авторизованных, запись только для admin
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are viewable by everyone" ON public.locations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Locations are insertable by admin" ON public.locations
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

CREATE POLICY "Locations are updatable by admin" ON public.locations
    FOR UPDATE USING (
        public.is_admin()
    );

-- 2. Profiles: чтение своего профиля, или всех если admin (с защитой от рекурсии)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR 
        public.is_admin()
    );

CREATE POLICY "Admin can update all profiles" ON public.profiles
    FOR UPDATE USING (
        public.is_admin()
    );

CREATE POLICY "Admin can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

-- 3. Time Records: чтение/запись своих записей, или всех если admin
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time records" ON public.time_records
    FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can insert their own time records" ON public.time_records
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admin can view all time records" ON public.time_records
    FOR SELECT USING (
        public.is_admin()
    );

CREATE POLICY "Admin can update/delete all time records" ON public.time_records
    FOR ALL USING (
        public.is_admin()
    );

-- 4. Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shifts" ON public.shifts
    FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Admin can manage all shifts" ON public.shifts
    FOR ALL USING (
        public.is_admin()
    );

-- Функция для автоматического создания профиля (опционально, если admin создает юзера через auth API)
-- Мы не используем триггер, так как Admin будет использовать service_role для создания профиля.
