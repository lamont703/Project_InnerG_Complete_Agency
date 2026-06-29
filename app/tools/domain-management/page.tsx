"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Globe, Plus, RefreshCw, CheckCircle, XCircle, Clock, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function DomainManagementPage() {
  const supabase = createBrowserClient();
  const [domains, setDomains] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);

  useEffect(() => {
    fetchDomains();
    fetchLogs();
    fetchSuggestions();
  }, []);

  const fetchDomains = async () => {
    const { data, error } = await (supabase as any)
      .from("crawler_seed_domains")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setDomains(data);
  };

  const fetchLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("crawler_logs")
      .select("*, crawler_seed_domains(domain_url)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setLogs(data);
  };

  const fetchSuggestions = async () => {
    const { data, error } = await (supabase as any)
      .from("crawler_discovered_links")
      .select("*, crawler_seed_domains(domain_url)")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    if (!error && data) setSuggestions(data);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    const { error } = await (supabase as any).from("crawler_seed_domains").insert({
      domain_url: newDomain,
      status: "Active",
      crawl_frequency: "Weekly",
    });

    if (error) {
      toast.error("Failed to add domain. It may already exist.");
    } else {
      toast.success("Domain added to Seed List!");
      setNewDomain("");
      fetchDomains();
    }
  };

  const handleApproveSuggestion = async (suggestion: any) => {
    const { error: insertError } = await (supabase as any).from("crawler_seed_domains").insert({
      domain_url: suggestion.discovered_url,
      status: "Active",
      crawl_frequency: "Weekly",
    });

    if (!insertError || insertError.message.includes('duplicate')) {
      await (supabase as any).from("crawler_discovered_links").update({ status: "Approved" }).eq("id", suggestion.id);
      toast.success("Domain approved and added to Seed List!");
      fetchDomains();
      fetchSuggestions();
    } else {
      toast.error("Failed to approve domain.");
    }
  };

  const handleIgnoreSuggestion = async (id: string) => {
    await (supabase as any).from("crawler_discovered_links").update({ status: "Ignored" }).eq("id", id);
    fetchSuggestions();
  };

  const triggerCrawl = async (domainId?: string) => {
    setIsCrawling(true);
    toast.info("Crawler started...");
    
    try {
      const res = await fetch("/api/crawler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(domainId ? { domainId } : {}),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Crawl completed successfully!");
      } else {
        toast.error(data.error || "Failed to execute crawl.");
      }
    } catch (err) {
      toast.error("An error occurred while communicating with the crawler.");
    } finally {
      setIsCrawling(false);
      fetchDomains();
      fetchLogs();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-600" />
            Web Crawler Management
          </h1>
          <p className="text-slate-600 mt-2">
            Curate your Seed List of domains and trigger manual Intelligence crawls.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Domains Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Add Domain Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Add Target Domain</h2>
              <form onSubmit={handleAddDomain} className="flex gap-3">
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>
            </div>

            {/* Seed List Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Seed List</h2>
                <button
                  onClick={() => triggerCrawl()}
                  disabled={isCrawling}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin" : ""}`} />
                  {isCrawling ? "Crawling..." : "Crawl All Active"}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {domains.length === 0 ? (
                  <p className="p-6 text-slate-500 text-center">No domains added yet.</p>
                ) : (
                  domains.map((domain) => (
                    <div key={domain.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <a href={domain.domain_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                          {domain.domain_url}
                        </a>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${domain.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {domain.status}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {domain.last_crawled_at ? new Date(domain.last_crawled_at).toLocaleString() : "Never crawled"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => triggerCrawl(domain.id)}
                        disabled={isCrawling}
                        className="text-slate-500 hover:text-blue-600 p-2 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors disabled:opacity-50"
                        title="Crawl this domain only"
                      >
                        <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Suggestions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-purple-600" /> 
                  Discovered Suggestions
                </h2>
                <p className="text-sm text-slate-500 mt-1">Pending links discovered by the crawler on seed pages.</p>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {suggestions.length === 0 ? (
                  <p className="p-6 text-slate-500 text-center">No pending suggestions yet.</p>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <a href={sug.discovered_url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 hover:underline truncate block">
                          {sug.discovered_url}
                        </a>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          Found on: {sug.crawler_seed_domains?.domain_url}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => handleApproveSuggestion(sug)}
                          className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleIgnoreSuggestion(sug.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Logs Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Execution Logs</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logs.length === 0 ? (
                  <p className="text-slate-500 text-center">No logs available.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {log.status === "Success" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium text-slate-700">
                          {log.crawler_seed_domains?.domain_url || "Unknown Domain"}
                        </span>
                      </div>
                      <p className="text-slate-500 pl-6 leading-relaxed">
                        {log.details}
                      </p>
                      <p className="text-xs text-slate-400 pl-6 mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
