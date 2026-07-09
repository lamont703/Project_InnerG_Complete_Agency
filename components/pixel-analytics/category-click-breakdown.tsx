"use client";

import { useState } from "react";
import {
  Globe,
  Users,
  Scissors,
  Sparkles,
  GraduationCap,
  Store,
  CalendarDays,
  BookOpen,
  Wrench,
  X,
  Loader2,
  MousePointerClick,
} from "lucide-react";
import { fetchCategoryClickBreakdown, type ClickBreakdownItem } from "@/app/pixel-analytics/actions";

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  Shops: Scissors,
  Salons: Sparkles,
  Barbers: Users,
  Cosmetologists: Sparkles,
  Schools: GraduationCap,
  Stores: Store,
  Events: CalendarDays,
  Insights: BookOpen,
  Tools: Wrench,
  Other: Globe,
};

// "Other" is a heterogeneous catch-all (home, misc pages), not one real
// path prefix — there's no single click-breakdown query that means
// anything for it, so it's excluded from the drill-down click target.
const DRILLABLE_CATEGORIES = new Set([
  "Shops", "Salons", "Barbers", "Cosmetologists", "Schools", "Stores", "Events", "Insights", "Tools",
]);

interface CategoryClickBreakdownProps {
  categoryViews: { category: string; views: number; visitors: number }[];
  days?: number;
}

export function CategoryClickBreakdown({ categoryViews, days }: CategoryClickBreakdownProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ClickBreakdownItem[]>([]);

  const openModal = async (category: string) => {
    if (!DRILLABLE_CATEGORIES.has(category)) return;
    setOpenCategory(category);
    setLoading(true);
    const data = await fetchCategoryClickBreakdown(category, days);
    setItems(data);
    setLoading(false);
  };

  const closeModal = () => {
    setOpenCategory(null);
    setItems([]);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm mb-12">
      <div className="flex items-center gap-3 mb-2">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Visitors by Page Category</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Click a category to see which buttons and links are actually being clicked on those pages.
      </p>

      {categoryViews?.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryViews.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.category] || Globe;
            const drillable = DRILLABLE_CATEGORIES.has(cat.category);
            return (
              <button
                key={cat.category}
                onClick={() => openModal(cat.category)}
                disabled={!drillable}
                className={`text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent transition-colors ${
                  drillable
                    ? "hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer"
                    : "cursor-default opacity-80"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">{cat.category}</span>
                </div>
                <p className="text-2xl font-black">{cat.visitors.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-0.5">{cat.views.toLocaleString()} views</p>
                {drillable && (
                  <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" /> View clicks
                  </p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-slate-500 text-center py-8">No category data available</div>
      )}

      {openCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg">{openCategory} — Button &amp; Link Clicks</h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-slate-500 text-center py-12 text-sm">No click data for this category yet.</div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.label}-${item.elementType}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                          {item.elementType || "element"}
                        </p>
                      </div>
                      <span className="text-lg font-black text-primary shrink-0">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
