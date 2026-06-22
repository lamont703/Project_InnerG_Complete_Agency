"use client";

import { useState } from 'react';
import { Zap, Link as LinkIcon, X, Clock, MousePointerClick, Eye, Navigation } from 'lucide-react';

type Lead = {
  contactId: string;
  shopName: string;
  phone: string;
  views: number;
  clicks: number;
  activity: any[];
};

export default function HotLeadsSection({ leads }: { leads: Lead[] }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (!leads || leads.length === 0) return null;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm mb-12 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold">🔥 Hot CRM Leads Active on Site</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          These are known GoHighLevel contacts whose identities have been completely resolved by the tracking pixel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leads.map((lead, i) => (
            <div key={i} className="flex flex-col p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={lead.shopName}>
                  {lead.shopName}
                </h3>
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded shrink-0">
                  {lead.views} Views
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-mono">
                {lead.phone || 'No phone provided'}
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {lead.clicks} Clicks Tracked
                </span>
                <button 
                  onClick={() => setSelectedLead(lead)}
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
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedLead.shopName}</h2>
                <p className="text-slate-500 font-mono text-sm mt-1">{selectedLead.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <a 
                  href={`https://app.gohighlevel.com/v2/location/YOUR_LOC_ID/contacts/detail/${selectedLead.contactId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-2 w-full py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold rounded-xl transition-colors border border-blue-200 dark:border-blue-800/50"
                >
                  Open Record in GoHighLevel <LinkIcon className="w-4 h-4" />
                </a>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Activity Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                  {selectedLead.activity?.length > 0 ? (
                    selectedLead.activity.map((act, idx) => {
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
