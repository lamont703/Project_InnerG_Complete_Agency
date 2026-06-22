"use client";

import { useState } from 'react';
import { UserCheck, Clock, MousePointerClick, Eye, Navigation, X } from 'lucide-react';

type Professional = {
  barberId: string;
  name: string;
  phone: string;
  views: number;
  clicks: number;
  activity: any[];
};

export default function HotProfessionalsSection({ professionals }: { professionals: Professional[] }) {
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  if (!professionals || professionals.length === 0) return null;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm mb-12 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3 mb-2">
          <UserCheck className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">💈 Hot Professionals Active on Site</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          These are professionals (barbers/candidates) who logged in to view their matches, resolved by the tracking pixel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {professionals.map((prof, i) => (
            <div key={i} className="flex flex-col p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={prof.name}>
                  {prof.name}
                </h3>
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded shrink-0">
                  {prof.views} Views
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-mono">
                {prof.phone || 'No phone provided'}
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {prof.clicks} Clicks Tracked
                </span>
                <button 
                  onClick={() => setSelectedProfessional(prof)}
                  className="text-primary text-sm font-semibold hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full transition-colors hover:bg-primary/20"
                >
                  View Details <Eye className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {selectedProfessional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedProfessional(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProfessional.name}</h2>
                <p className="text-slate-500 font-mono text-sm mt-1">{selectedProfessional.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedProfessional(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Professional Activity Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                  {selectedProfessional.activity?.length > 0 ? (
                    selectedProfessional.activity.map((act, idx) => {
                      let icon = <Eye className="w-4 h-4" />;
                      let color = "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400";
                      let desc = "Viewed page";
                      
                      let pagePath = act.page_url;
                      try { pagePath = new URL(act.page_url).pathname; } catch(e) {}

                      if (act.event_name === 'click') {
                        icon = <MousePointerClick className="w-4 h-4" />;
                        color = "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400";
                        desc = act.metadata?.text ? `Clicked "${act.metadata.text.substring(0, 30)}${act.metadata.text.length > 30 ? '...' : ''}"` : "Clicked element";
                      } else if (act.event_name === 'scroll') {
                        icon = <Navigation className="w-4 h-4" />;
                        color = "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400";
                        desc = `Scrolled ${act.metadata?.depth || 'down'} on page`;
                      } else if (act.event_name === 'page_leave') {
                        icon = <Clock className="w-4 h-4" />;
                        color = "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400";
                        const dur = act.metadata?.duration_seconds;
                        desc = dur ? `Spent ${dur > 60 ? Math.floor(dur/60) + 'm ' + (dur%60) + 's' : dur + 's'} on page` : "Left page";
                      }

                      return (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${color}`}>
                            {icon}
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{desc}</span>
                              <time className="text-xs font-medium text-slate-400">
                                {new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </time>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={pagePath}>
                              {pagePath}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 text-center py-8">No detailed activity found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
