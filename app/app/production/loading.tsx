export default function Loading() {
  return (
    <div className="p-4 pt-12 max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center">
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center max-w-xs w-full animate-in fade-in duration-200">
        <div className="relative mb-4 flex items-center justify-center">
          {/* Внешний пульсирующий круг */}
          <div className="w-16 h-16 rounded-full bg-primary/10 animate-ping absolute inset-0 opacity-75" />
          {/* Круговой индикатор загрузки */}
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin relative z-10" />
        </div>
        <p className="font-bold text-slate-900 text-sm">Загрузка выработки...</p>
        <p className="text-[11px] text-slate-400 mt-1">Секунду, подгружаем список продукции</p>
      </div>
    </div>
  );
}
