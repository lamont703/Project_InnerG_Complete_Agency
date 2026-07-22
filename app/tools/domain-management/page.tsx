"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Navbar } from "@/components/layout/navbar";
import { Globe, Plus, RefreshCw, CheckCircle, XCircle, Clock, Link2, Brain, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DomainManagementPage() {
  const supabase = createBrowserClient();
  const [domains, setDomains] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCurating, setIsCurating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'audit'>('pending');
  const [qualityTab, setQualityTab] = useState<'flagged' | 'validated'>('flagged');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [qualityLogs, setQualityLogs] = useState<any[]>([]);
  const [seedPage, setSeedPage] = useState(1);
  const [seedSearch, setSeedSearch] = useState("");
  const SEEDS_PER_PAGE = 5;

  const filteredDomains = domains.filter((domain) =>
    domain.domain_url.toLowerCase().includes(seedSearch.toLowerCase())
  );

  useEffect(() => {
    fetchDomains();
    fetchLogs();
    fetchSuggestions();
    fetchAuditLogs();
    fetchQualityLogs();
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

  const fetchAuditLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("crawler_discovered_links")
      .select("*, crawler_seed_domains(domain_url)")
      .in("status", ["Auto-Approved", "Auto-Rejected"])
      .order("updated_at", { ascending: false });
    if (!error && data) setAuditLogs(data);
  };

  const fetchQualityLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("scraped_web_pages")
      .select("*, crawler_seed_domains(domain_url)")
      .in("audit_status", ["Validated", "Flagged"])
      .order("updated_at", { ascending: false });
    if (!error && data) setQualityLogs(data);
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

  const handleTogglePause = async (domain: any) => {
    const newStatus = domain.status === 'Active' ? 'Paused' : 'Active';
    await (supabase as any).from("crawler_seed_domains").update({ status: newStatus }).eq("id", domain.id);
    toast.success(`Domain ${newStatus === 'Paused' ? 'archived' : 'activated'}!`);
    fetchDomains();
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to hard delete this domain? It may be rediscovered by the engine later.")) return;
    await (supabase as any).from("crawler_seed_domains").delete().eq("id", id);
    toast.success("Domain deleted!");
    fetchDomains();
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

  const triggerAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("Analyzing search telemetry...", { id: "analysis-toast" });
    
    try {
      const res = await fetch("/api/crawler/optimize", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Analysis complete! Added ${data.stop_words_added} NLP rules & found ${data.links_discovered} new links.`, { id: "analysis-toast" });
        fetchSuggestions();
      } else {
        toast.error(data.error || "Failed to analyze telemetry.", { id: "analysis-toast" });
      }
    } catch (err) {
      toast.error("An error occurred during analysis.", { id: "analysis-toast" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerEmbeddings = async (targetTable: string) => {
    setIsEmbedding(true);
    toast.info(`Generating missing embeddings for ${targetTable}...`, { id: "embedding-toast" });
    
    try {
      const res = await fetch("/api/embeddings/generate", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTable })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Success! Generated ${data.updatedCount} new embeddings.`, { id: "embedding-toast" });
      } else {
        toast.error(data.error || "Failed to generate embeddings.", { id: "embedding-toast" });
      }
    } catch (err) {
      toast.error("An error occurred during embedding generation.", { id: "embedding-toast" });
    } finally {
      setIsEmbedding(false);
    }
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

  const triggerAutoCurate = async () => {
    setIsCurating(true);
    toast.info("AI is evaluating pending links...");
    try {
      const res = await fetch("/api/crawler/auto-curate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Curation complete! Approved ${data.approved}, Rejected ${data.rejected}.`);
        fetchSuggestions();
        fetchAuditLogs();
        fetchDomains();
      } else {
        toast.error(data.error || "Failed to auto-curate.");
      }
    } catch (err) {
      toast.error("Error communicating with AI curator.");
    } finally {
      setIsCurating(false);
    }
  };

  const handleRevoke = async (log: any) => {
    // Set status to Ignored
    await (supabase as any).from("crawler_discovered_links").update({ status: "Ignored" }).eq("id", log.id);
    // Delete from seed domains
    await (supabase as any).from("crawler_seed_domains").delete().eq("domain_url", log.discovered_url);
    toast.success("AI decision revoked!");
    fetchAuditLogs();
    fetchDomains();
  };

  const triggerAuditAgent = async () => {
    setIsAuditing(true);
    toast.info("Audit Agent is analyzing scraped pages...");
    try {
      const res = await fetch("/api/crawler/audit-agent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Audit complete! Validated ${data.validated}, Flagged ${data.flagged}.`);
        fetchQualityLogs();
      } else {
        toast.error(data.error || "Failed to audit pages.");
      }
    } catch (err) {
      toast.error("Error communicating with Audit Agent.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleQualityDelete = async (log: any) => {
    await (supabase as any).from("crawler_seed_domains").update({ status: "Ignored" }).eq("id", log.domain_id);
    await (supabase as any).from("scraped_web_pages").delete().eq("id", log.id);
    toast.success("Page deleted and seed domain ignored!");
    fetchQualityLogs();
    fetchDomains();
  };

  const handleQualityOverride = async (log: any, newStatus: 'Validated' | 'Flagged') => {
    await (supabase as any).from("scraped_web_pages").update({ audit_status: newStatus }).eq("id", log.id);
    toast.success(`Page manually marked as ${newStatus}!`);
    fetchQualityLogs();
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
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Seed List</h2>
                  <input
                    type="text"
                    placeholder="Search domains..."
                    value={seedSearch}
                    onChange={(e) => {
                      setSeedSearch(e.target.value);
                      setSeedPage(1); // Reset to page 1 on search
                    }}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                  <button
                    onClick={() => {
                      triggerEmbeddings('agent_barbershop_leads');
                      setTimeout(() => triggerEmbeddings('scraped_web_pages'), 2000);
                    }}
                    disabled={isEmbedding}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center"
                  >
                    <Brain className={`h-4 w-4 ${isEmbedding ? "animate-pulse" : ""}`} />
                    {isEmbedding ? "Generating..." : "Generate Embeddings"}
                  </button>
                  <button
                    onClick={() => triggerAnalysis()}
                    disabled={isAnalyzing || isCrawling}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center"
                  >
                    <Brain className={`h-4 w-4 ${isAnalyzing ? "animate-pulse" : ""}`} />
                    {isAnalyzing ? "Analyzing..." : "Analyze Telemetry"}
                  </button>
                  <button
                    onClick={() => triggerCrawl()}
                    disabled={isCrawling || isAnalyzing}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center"
                  >
                    <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin" : ""}`} />
                    {isCrawling ? "Crawling..." : "Crawl All Active"}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredDomains.length === 0 ? (
                  <p className="p-6 text-slate-500 text-center">No domains found.</p>
                ) : (
                  filteredDomains.slice((seedPage - 1) * SEEDS_PER_PAGE, seedPage * SEEDS_PER_PAGE).map((domain) => (
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
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePause(domain)}
                          className="text-slate-500 hover:text-orange-600 p-2 border border-slate-200 rounded-lg hover:border-orange-200 transition-colors"
                          title={domain.status === 'Active' ? "Archive (Pause) this domain" : "Re-activate this domain"}
                        >
                          {domain.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteDomain(domain.id)}
                          className="text-slate-500 hover:text-red-600 p-2 border border-slate-200 rounded-lg hover:border-red-200 transition-colors"
                          title="Hard Delete this domain"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => triggerCrawl(domain.id)}
                          disabled={isCrawling || domain.status !== 'Active'}
                          className="text-slate-500 hover:text-blue-600 p-2 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors disabled:opacity-50"
                          title="Crawl this domain only"
                        >
                          <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredDomains.length > SEEDS_PER_PAGE && (
                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                  <button
                    onClick={() => setSeedPage((p) => Math.max(1, p - 1))}
                    disabled={seedPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 font-medium">
                    Page {seedPage} of {Math.ceil(filteredDomains.length / SEEDS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setSeedPage((p) => Math.min(Math.ceil(filteredDomains.length / SEEDS_PER_PAGE), p + 1))}
                    disabled={seedPage >= Math.ceil(filteredDomains.length / SEEDS_PER_PAGE)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-purple-600" /> 
                    Link Discovery Engine
                  </h2>
                  <div className="flex gap-4 mt-3">
                    <button 
                      onClick={() => setActiveTab('pending')}
                      className={`text-sm font-medium pb-1 border-b-2 ${activeTab === 'pending' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Pending Review ({suggestions.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('audit')}
                      className={`text-sm font-medium pb-1 border-b-2 ${activeTab === 'audit' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      AI Audit Log
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => triggerAutoCurate()}
                  disabled={isCurating}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Brain className={`h-4 w-4 ${isCurating ? "animate-pulse" : ""}`} />
                  {isCurating ? "Curating..." : "Auto-Curate Pending"}
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto bg-slate-50/50">
                
                {activeTab === 'pending' && (
                  suggestions.length === 0 ? (
                    <p className="p-6 text-slate-500 text-center">No pending suggestions yet.</p>
                  ) : (
                    suggestions.map((sug) => (
                      <div key={sug.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white transition-colors bg-transparent">
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
                            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleIgnoreSuggestion(sug.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}

                {activeTab === 'audit' && (
                  auditLogs.length === 0 ? (
                    <p className="p-6 text-slate-500 text-center">No AI audit logs yet.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-4 flex flex-col gap-3 hover:bg-white transition-colors bg-transparent">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'Auto-Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {log.status}
                              </span>
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Score: {log.ai_score}/100
                              </span>
                            </div>
                            <a href={log.discovered_url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 hover:underline truncate block">
                              {log.discovered_url}
                            </a>
                          </div>
                          {log.status === 'Auto-Approved' && (
                            <button 
                              onClick={() => handleRevoke(log)}
                              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-600 italic">
                            <span className="font-semibold text-slate-700 not-italic mr-1">AI Reasoning:</span>
                            "{log.ai_reasoning}"
                          </p>
                        </div>
                      </div>
                    ))
                  )
                )}

              </div>
            </div>

            {/* Quality Control Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6 border-t-4 border-t-blue-500">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" /> 
                    Data Quality Control
                  </h2>
                  <div className="flex gap-4 mt-3">
                    <button 
                      onClick={() => setQualityTab('flagged')}
                      className={`text-sm font-medium pb-1 border-b-2 ${qualityTab === 'flagged' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Trigger Human Overview ({qualityLogs.filter(l => l.audit_status === 'Flagged').length})
                    </button>
                    <button 
                      onClick={() => setQualityTab('validated')}
                      className={`text-sm font-medium pb-1 border-b-2 ${qualityTab === 'validated' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Validated by Agent
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => triggerAuditAgent()}
                  disabled={isAuditing}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Brain className={`h-4 w-4 ${isAuditing ? "animate-pulse text-blue-400" : ""}`} />
                  {isAuditing ? "Auditing..." : "Trigger Audit Agent"}
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto bg-slate-50/30">
                {qualityLogs.filter(l => l.audit_status === (qualityTab === 'flagged' ? 'Flagged' : 'Validated')).length === 0 ? (
                  <p className="p-6 text-slate-500 text-center">No {qualityTab} pages.</p>
                ) : (
                  qualityLogs.filter(l => l.audit_status === (qualityTab === 'flagged' ? 'Flagged' : 'Validated')).map((log) => (
                    <div key={log.id} className="p-4 flex flex-col gap-3 hover:bg-white transition-colors bg-transparent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.audit_status === 'Validated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {log.audit_status}
                            </span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              Score: {log.audit_score}/100
                            </span>
                          </div>
                          <a href={log.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 hover:underline truncate block">
                            {log.url}
                          </a>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {log.audit_status === 'Flagged' && (
                            <>
                              <button 
                                onClick={() => handleQualityDelete(log)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                              >
                                Delete & Ignore
                              </button>
                              <button 
                                onClick={() => handleQualityOverride(log, 'Validated')}
                                className="px-3 py-1.5 text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                              >
                                Override (Keep)
                              </button>
                            </>
                          )}
                          {log.audit_status === 'Validated' && (
                            <button 
                              onClick={() => handleQualityDelete(log)}
                              className="px-3 py-1.5 text-xs font-medium bg-white text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                        <span className="font-semibold text-slate-700 block mb-1">AI Reasoning:</span>
                        <p className="text-slate-600 italic">"{log.audit_reasoning}"</p>
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

    </div>
  );
}
