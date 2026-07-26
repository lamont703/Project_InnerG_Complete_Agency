import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLACEMENT_LABELS, entityTypeConfig } from "@/lib/ad-campaigns";
import { CampaignForm } from "./CampaignForm";
import { isAdmin } from "./auth";
import { TX_CITIES } from "@/lib/city-readiness";
import { CA_CITIES } from "@/lib/california-city-readiness";
import { Megaphone, CheckCircle2, AlertTriangle } from "lucide-react";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
// Scope options pulled from our canonical hub lists — the scope value must
// equal what SponsorshipBanner passes (title-cased city name / state).
const STATE_OPTIONS = ["Texas", "California"];
const CITY_OPTIONS = [
  ...TX_CITIES.map((c) => ({ name: titleCase(c), state: "Texas" })),
  ...CA_CITIES.map((c) => ({ name: titleCase(c), state: "California" })),
];

const BANNER_PLACEMENTS = new Set(["state_hub_banner", "city_hub_banner"]);

export const dynamic = "force-dynamic";
export const metadata = { title: "Ad Campaigns (Admin) | Inner G Complete", robots: { index: false, follow: false } };

// Assign an ad placement to an advertiser (a user account). Their
// /account/ad-performance page then reports on the ad events matching this
// campaign's placement + optional creative/scope. Internal-only (gated by
// middleware INTERNAL_TOOL_ROUTES).
async function createCampaign(formData: FormData) {
  "use server";
  if (!(await isAdmin())) redirect("/admin/ad-campaigns?error=Not+authorized.");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const placement = String(formData.get("placement") || "").trim();
  const entity_type = String(formData.get("entity_type") || "").trim() || null;
  const creative = String(formData.get("creative") || "").trim() || null;
  const scope = String(formData.get("scope") || "").trim() || null;
  const click_url = String(formData.get("click_url") || "").trim() || null;
  const filter_tabs = formData.getAll("filter_tabs").map((t) => String(t));
  const target_states = formData.getAll("target_states").map((t) => String(t));
  const target_cities = formData.getAll("target_cities").map((t) => String(t));
  const ad_eyebrow = String(formData.get("ad_eyebrow") || "").trim() || null;
  const ad_headline = String(formData.get("ad_headline") || "").trim() || null;
  const ad_cta_label = String(formData.get("ad_cta_label") || "").trim() || null;
  const banner_page_types = formData.getAll("banner_page_types").map((t) => String(t));
  const isBanner = BANNER_PLACEMENTS.has(placement);
  const err = (m: string) => redirect(`/admin/ad-campaigns?error=${encodeURIComponent(m)}`);

  if (!email || !name || !placement) err("Email, campaign name, and placement are required.");

  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) err(`No user account found for ${email}.`);

  // Validate the advertised entity exists (when one is given). Required for
  // profile/search ads; optional for banners (an external URL can stand in).
  if (entity_type && creative) {
    const cfg = entityTypeConfig(entity_type);
    if (!cfg) err("Unknown entity type.");
    const { data: ent } = await (admin as any).from(cfg!.table).select("slug").eq("slug", creative).maybeSingle();
    if (!ent) err(`No ${entity_type} found with slug "${creative}". Pick the entity from the search field.`);
  }

  let banner_image_url: string | null = null;
  if (isBanner) {
    if (!scope) err("Set the state/city the banner covers.");
    if (!creative && !click_url) err("Give the banner a destination — pick an entity or enter an external URL.");
    // Upload the banner image to the public 'ad-creatives' bucket.
    const file = formData.get("banner_image");
    if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
      const f = file as File;
      const buffer = Buffer.from(await f.arrayBuffer());
      const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await admin.storage.from("ad-creatives").upload(path, buffer, { contentType: f.type || "image/png", upsert: true });
      if (upErr) err(`Banner image upload failed: ${upErr.message}`);
      banner_image_url = admin.storage.from("ad-creatives").getPublicUrl(path).data.publicUrl;
    } else {
      err("Upload a banner image.");
    }
  } else {
    // Profile / search ads must advertise a real entity.
    if (!entity_type || !creative) err("Pick the entity this ad advertises using the search field.");
  }

  const { error: insErr } = await (admin as any).from("ad_campaigns").insert({
    user_id: (user as any).id,
    name,
    placement,
    entity_type,
    creative,
    scope,
    filter_tabs,
    target_states,
    target_cities,
    ad_eyebrow,
    ad_headline,
    ad_cta_label,
    banner_page_types,
    banner_image_url,
    click_url,
    status: "active",
  });
  if (insErr) err(`Could not create campaign: ${insErr.message}`);
  revalidatePath("/admin/ad-campaigns");
  redirect("/admin/ad-campaigns?ok=1");
}

async function deleteCampaign(formData: FormData) {
  "use server";
  if (!(await isAdmin())) redirect("/admin/ad-campaigns?error=Not+authorized.");
  const id = String(formData.get("id") || "");
  if (!id) return;
  const admin = createAdminClient();
  await (admin as any).from("ad_campaigns").delete().eq("id", id);
  revalidatePath("/admin/ad-campaigns");
}

// Quick pause/activate from a campaign row.
async function setCampaignStatus(formData: FormData) {
  "use server";
  if (!(await isAdmin())) redirect("/admin/ad-campaigns?error=Not+authorized.");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !status) return;
  const admin = createAdminClient();
  await (admin as any).from("ad_campaigns").update({ status }).eq("id", id);
  revalidatePath("/admin/ad-campaigns");
}

// Edit a live campaign — mirrors createCampaign's validation, updates in place,
// and keeps the existing banner image when no new file is uploaded.
async function updateCampaign(formData: FormData) {
  "use server";
  if (!(await isAdmin())) redirect("/admin/ad-campaigns?error=Not+authorized.");
  const err = (m: string) => redirect(`/admin/ad-campaigns?error=${encodeURIComponent(m)}`);
  const id = String(formData.get("id") || "");
  if (!id) err("Missing campaign id.");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const placement = String(formData.get("placement") || "").trim();
  const entity_type = String(formData.get("entity_type") || "").trim() || null;
  const creative = String(formData.get("creative") || "").trim() || null;
  const scope = String(formData.get("scope") || "").trim() || null;
  const click_url = String(formData.get("click_url") || "").trim() || null;
  const status = String(formData.get("status") || "active").trim();
  const filter_tabs = formData.getAll("filter_tabs").map((t) => String(t));
  const target_states = formData.getAll("target_states").map((t) => String(t));
  const target_cities = formData.getAll("target_cities").map((t) => String(t));
  const ad_eyebrow = String(formData.get("ad_eyebrow") || "").trim() || null;
  const ad_headline = String(formData.get("ad_headline") || "").trim() || null;
  const ad_cta_label = String(formData.get("ad_cta_label") || "").trim() || null;
  const banner_page_types = formData.getAll("banner_page_types").map((t) => String(t));
  const isBanner = BANNER_PLACEMENTS.has(placement);

  if (!email || !name || !placement) err("Email, campaign name, and placement are required.");

  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) err(`No user account found for ${email}.`);

  if (entity_type && creative) {
    const cfg = entityTypeConfig(entity_type);
    if (!cfg) err("Unknown entity type.");
    const { data: ent } = await (admin as any).from(cfg!.table).select("slug").eq("slug", creative).maybeSingle();
    if (!ent) err(`No ${entity_type} found with slug "${creative}". Pick the entity from the search field.`);
  }

  let newBannerUrl: string | null | undefined = undefined; // undefined = keep existing
  if (isBanner) {
    if (!scope) err("Set the state/city the banner covers.");
    if (!creative && !click_url) err("Give the banner a destination — pick an entity or enter an external URL.");
    const file = formData.get("banner_image");
    if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
      const f = file as File;
      const buffer = Buffer.from(await f.arrayBuffer());
      const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await admin.storage.from("ad-creatives").upload(path, buffer, { contentType: f.type || "image/png", upsert: true });
      if (upErr) err(`Banner image upload failed: ${upErr.message}`);
      newBannerUrl = admin.storage.from("ad-creatives").getPublicUrl(path).data.publicUrl;
    } else {
      // No new upload — a banner still needs an image. Reject if the campaign
      // doesn't already have one (e.g. a non-banner edited into a banner).
      const { data: existing } = await (admin as any).from("ad_campaigns").select("banner_image_url").eq("id", id).maybeSingle();
      if (!existing?.banner_image_url) err("This banner has no image — upload one.");
    }
  } else if (!entity_type || !creative) {
    err("Pick the entity this ad advertises using the search field.");
  }

  const update: Record<string, any> = {
    user_id: (user as any).id,
    name,
    placement,
    entity_type,
    creative,
    scope,
    filter_tabs,
    target_states,
    target_cities,
    ad_eyebrow,
    ad_headline,
    ad_cta_label,
    banner_page_types,
    click_url,
    status,
    updated_at: new Date().toISOString(),
  };
  if (newBannerUrl !== undefined) update.banner_image_url = newBannerUrl;

  const { error: updErr } = await (admin as any).from("ad_campaigns").update(update).eq("id", id);
  if (updErr) err(`Could not save changes: ${updErr.message}`);
  revalidatePath("/admin/ad-campaigns");
  redirect("/admin/ad-campaigns?ok=1");
}

export default async function AdminAdCampaignsPage(props: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  const { ok, error, edit } = await props.searchParams;
  const admin = createAdminClient();
  const { data: campaigns } = await (admin as any)
    .from("ad_campaigns")
    .select("id, user_id, name, placement, entity_type, creative, scope, filter_tabs, target_states, target_cities, ad_eyebrow, ad_headline, ad_cta_label, banner_page_types, click_url, banner_image_url, status, created_at")
    .order("created_at", { ascending: false });

  const userIds = [...new Set((campaigns || []).map((c: any) => c.user_id))];
  const emailById = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
    (users || []).forEach((u: any) => emailById.set(u.id, u.email));
  }

  // Build the pre-fill object when editing a campaign.
  let editInitial: any = null;
  if (edit) {
    const c = (campaigns as any[])?.find((x) => x.id === edit);
    if (c) {
      let entityName: string | null = null;
      if (c.entity_type && c.creative) {
        const cfg = entityTypeConfig(c.entity_type);
        if (cfg) {
          const { data: ent } = await (admin as any).from(cfg.table).select(`${cfg.nameCol}`).eq("slug", c.creative).maybeSingle();
          entityName = ent ? ent[cfg.nameCol] : null;
        }
      }
      editInitial = {
        id: c.id,
        name: c.name,
        email: emailById.get(c.user_id) || "",
        placement: c.placement,
        entity_type: c.entity_type,
        creative: c.creative,
        entityName,
        scope: c.scope,
        filter_tabs: c.filter_tabs || [],
        target_states: c.target_states || [],
        target_cities: c.target_cities || [],
        ad_eyebrow: c.ad_eyebrow ?? null,
        ad_headline: c.ad_headline ?? null,
        ad_cta_label: c.ad_cta_label ?? null,
        banner_page_types: c.banner_page_types || [],
        click_url: c.click_url,
        banner_image_url: c.banner_image_url,
        status: c.status,
      };
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Megaphone className="w-3 h-3" />
          Admin · Ad Campaigns
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 mb-2">Assign Ad Campaigns</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Link a placement to an advertiser&apos;s account and identify the entity being advertised — every ad links to
          that entity&apos;s profile page. For a <b>Search Results Ad</b>, pick the filter tabs it appears on (top of
          those results). The advertiser sees the matching impressions &amp; clicks under Account → Ad Performance.
        </p>

        {ok && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 mb-6 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Campaign created. A Search Results ad appears at the top of its tabs once a visitor runs a search there.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 mb-6 text-sm font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Create / edit form — adapts its config fields to the selected ad type. */}
        {editInitial ? (
          <>
            <h2 className="text-lg font-black text-slate-900 mb-3">Edit campaign</h2>
            {/* key forces a fresh mount per campaign so pre-filled client state
                (entity type-ahead, city chips, tab toggles) never goes stale
                when switching between campaigns or back to the create form. */}
            <CampaignForm key={`edit-${editInitial.id}`} submitAction={updateCampaign} stateOptions={STATE_OPTIONS} cityOptions={CITY_OPTIONS} initial={editInitial} />
          </>
        ) : (
          <CampaignForm key="create" submitAction={createCampaign} stateOptions={STATE_OPTIONS} cityOptions={CITY_OPTIONS} />
        )}

        {/* Existing */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-bold">Advertiser</th>
                <th className="px-4 py-3 font-bold">Campaign</th>
                <th className="px-4 py-3 font-bold">Placement</th>
                <th className="px-4 py-3 font-bold">Entity</th>
                <th className="px-4 py-3 font-bold">Tabs</th>
                <th className="px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {(campaigns || []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No campaigns yet.</td></tr>
              ) : (
                (campaigns as any[]).map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{emailById.get(c.user_id) || <span className="text-red-500">unknown</span>}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {c.name}
                      <span className={`ml-2 inline-flex items-center text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${c.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{PLACEMENT_LABELS[c.placement] || c.placement}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {c.entity_type ? <span className="font-bold text-slate-600">{c.entity_type}</span> : "—"}
                      {c.creative && <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[160px]">{c.creative}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.filter_tabs?.length ? c.filter_tabs.join(", ") : "all"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <a href={`/admin/ad-campaigns?edit=${c.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Edit</a>
                        <form action={setCampaignStatus}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="status" value={c.status === "active" ? "paused" : "active"} />
                          <button type="submit" className="text-xs font-bold text-slate-500 hover:text-slate-700">
                            {c.status === "active" ? "Pause" : "Activate"}
                          </button>
                        </form>
                        <form action={deleteCampaign}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs font-bold text-red-500 hover:text-red-700">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
