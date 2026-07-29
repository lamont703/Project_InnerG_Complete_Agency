"use client";

import { useRef, useState } from "react";
import { AD_PLACEMENTS, PLACEMENT_LABELS, SEARCH_AD_TABS, BANNER_PAGE_TYPES } from "@/lib/ad-campaigns";
import { EntityTypeahead } from "./EntityTypeahead";
import { CitiesMultiSelect } from "./CitiesMultiSelect";

const PROFILE_PLACEMENTS = new Set([
  "shop_profile",
  "salon_profile",
  "barber_supply_profile",
  "beauty_supply_profile",
]);

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

const ENTITY_PLACEMENTS = new Set([
  "shop_profile",
  "salon_profile",
  "barber_supply_profile",
  "beauty_supply_profile",
  "search_results",
]);
const BANNER_PLACEMENTS = new Set(["state_hub_banner", "city_hub_banner"]);

// Per-placement helper copy so the admin knows what the ad does + what to fill.
// Every placement holds one ad at a time but any number of campaigns: eligible
// campaigns rotate through the slot (see lib/ad-rotation.ts), so none of these
// are exclusive reservations.
const PLACEMENT_HELP: Record<string, string> = {
  shop_profile: "Shows in the sponsored slot on shop profile pages, advertising the entity below (links to its profile).",
  salon_profile: "Shows in the sponsored slot on salon profile pages, advertising the entity below (links to its profile).",
  barber_supply_profile: "Shows in the sponsored slot on barber supply store pages, advertising the entity below (links to its profile).",
  beauty_supply_profile: "Shows in the sponsored slot on beauty supply store pages, advertising the entity below (links to its profile).",
  search_results: "Shows at the top of the search results on the selected filter tabs, advertising the entity below. One sponsored card shows per search — campaigns sharing a tab take turns.",
  state_hub_banner: "Takes a turn in the sponsorship banner on the state hub. Set the state it covers.",
  city_hub_banner: "Takes a turn in the sponsorship banner on a city hub. Set the city it covers.",
  entity_bottom_banner: "Shows as the dismissible bottom banner on entity pages in the targeted cities/states, linking to the entity below. Write short copy that fits a compact CTA.",
};

export interface CampaignInitial {
  id: string;
  name: string;
  email: string;
  placement: string;
  entity_type: string | null;
  creative: string | null;
  entityName: string | null;
  scope: string | null;
  filter_tabs: string[];
  target_states: string[];
  target_cities: string[];
  click_url: string | null;
  banner_image_url: string | null;
  ad_eyebrow: string | null;
  ad_headline: string | null;
  ad_cta_label: string | null;
  banner_page_types: string[];
  status: string;
}


// Banner uploads go through a Next server action, and on Vercel a serverless
// request body is capped at ~4.5 MB no matter what next.config's
// serverActions.bodySizeLimit says. An AI-generated banner sails past that, and
// the failure was ugly: a 413 from the platform, then an unhandled error that
// white-screened the whole admin page.
//
// So the image is resized and re-encoded in the browser before it ever gets
// attached to the form. That fixes the 413 at its source and enforces the
// banner spec at the same time — the slot renders at 24:7 and never wider than
// ~1104 CSS px, so anything beyond 2400px of width is bytes nobody sees.
const BANNER_MAX_WIDTH = 2400;
const BANNER_JPEG_QUALITY = 0.85;
// Comfortably under the platform limit, leaving room for the rest of the form.
const BANNER_MAX_BYTES = 3.5 * 1024 * 1024;

async function optimizeBanner(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, BANNER_MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // A transparent PNG would otherwise composite onto black when flattened to
  // JPEG, which looks like a bug rather than a design choice.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", BANNER_JPEG_QUALITY)
  );
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

const kb = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString()} KB`;

export function CampaignForm({
  submitAction,
  stateOptions,
  cityOptions,
  initial = null,
}: {
  submitAction: (formData: FormData) => void | Promise<void>;
  stateOptions: string[];
  cityOptions: { name: string; state: string }[];
  initial?: CampaignInitial | null;
}) {
  const isEdit = !!initial;
  const [placement, setPlacement] = useState<string>(initial?.placement || "search_results");
  const isEntity = ENTITY_PLACEMENTS.has(placement);
  const isSearch = placement === "search_results";
  const isBanner = BANNER_PLACEMENTS.has(placement);
  const isProfile = PROFILE_PLACEMENTS.has(placement);
  const isEntityBanner = placement === "entity_bottom_banner";

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerNote, setBannerNote] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Shrink on selection rather than on submit, so the admin sees the result
  // before committing and a rejected file can be swapped immediately.
  const handleBannerPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBannerError(null);
    setBannerNote(null);
    if (!file) return;

    setBannerNote("Optimizing image…");
    try {
      const optimized = await optimizeBanner(file);
      if (optimized.size > BANNER_MAX_BYTES) {
        setBannerNote(null);
        setBannerError(
          `That image is still ${kb(optimized.size)} after optimizing — too large to upload. Try a simpler image or export it at a lower quality.`
        );
        e.target.value = "";
        return;
      }
      const transfer = new DataTransfer();
      transfer.items.add(optimized);
      e.target.files = transfer.files;
      setBannerNote(
        file.size === optimized.size
          ? `Ready — ${kb(optimized.size)}.`
          : `Ready — optimized from ${kb(file.size)} to ${kb(optimized.size)}.`
      );
    } catch {
      // Couldn't decode it (odd format, corrupt file). Let the original through
      // only if it's small enough to survive the upload.
      setBannerNote(null);
      if (file.size > BANNER_MAX_BYTES) {
        setBannerError(`That image is ${kb(file.size)} — too large to upload. Please export it under 3 MB.`);
        e.target.value = "";
      }
    }
  };

  // Last line of defence: never let an oversized body reach the server, because
  // the platform rejects it before our code can report anything useful.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const file = bannerInputRef.current?.files?.[0];
    if (file && file.size > BANNER_MAX_BYTES) {
      e.preventDefault();
      setBannerError(`That image is ${kb(file.size)} — too large to upload. Please export it under 3 MB.`);
    }
  };

  const initialTabs = new Set(initial?.filter_tabs || []);
  const initialStates = new Set(initial?.target_states || []);
  const initialPageTypes = new Set(initial?.banner_page_types || []);

  return (
    <form action={submitAction} onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 space-y-5">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-bold text-slate-700">
          Advertiser email
          <input name="email" type="email" required defaultValue={initial?.email || ""} placeholder="owner@example.com" className={`${inputCls} mt-1 font-normal`} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Campaign name
          <input name="name" required defaultValue={initial?.name || ""} placeholder="Sauccy Fades — Shop Ads" className={`${inputCls} mt-1 font-normal`} />
        </label>
      </div>

      {isEdit && (
        <label className="text-sm font-bold text-slate-700 block sm:max-w-xs">
          Status
          <select name="status" defaultValue={initial?.status || "active"} className={`${inputCls} mt-1 font-normal bg-white`}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
      )}

      {/* 1) Ad type first — everything below adapts to it. */}
      <label className="text-sm font-bold text-slate-700 block">
        Ad type
        <select
          name="placement"
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
          className={`${inputCls} mt-1 font-normal bg-white sm:max-w-xs`}
        >
          {AD_PLACEMENTS.map((p) => (
            <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>
          ))}
        </select>
        <span className="block text-[11px] font-normal text-slate-400 mt-1.5">{PLACEMENT_HELP[placement]}</span>
      </label>

      {/* 2) Entity — only for entity-based ads (profile + search). */}
      {isEntity && (
        <EntityTypeahead initialType={initial?.entity_type} initialSlug={initial?.creative} initialName={initial?.entityName} />
      )}

      {/* 2b) Geo targeting — profile ads + the entity bottom banner (hub banners
          scope by hub; search targets by tab). */}
      {(isProfile || isEntityBanner) && (
        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-black text-slate-800 mb-1">
            Geo targeting <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <p className="text-[11px] text-slate-400 mb-3">
            Only show this ad on profiles in the selected states/cities (matched to the viewed business&apos;s
            location). Leave everything empty to show it everywhere.
          </p>
          <p className="text-xs font-bold text-slate-600 mb-2">States</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {stateOptions.map((st) => (
              <label
                key={st}
                className="cursor-pointer select-none rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-bold text-slate-600 bg-white transition-colors has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white hover:border-indigo-400"
              >
                <input type="checkbox" name="target_states" value={st} defaultChecked={initialStates.has(st)} className="sr-only" />
                {st}
              </label>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-600 mb-2">Cities</p>
          <CitiesMultiSelect cityOptions={cityOptions} initial={initial?.target_cities || []} />
        </div>
      )}

      {/* 3) Filter tabs — only for search ads. */}
      {isSearch && (
        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-black text-slate-800 mb-1">Search filter tabs</p>
          <p className="text-[11px] text-slate-400 mb-3">Which search tabs the ad shows on. Select one or more; none = all tabs.</p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_AD_TABS.map((tab) => (
              <label
                key={tab}
                className="cursor-pointer select-none rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-bold text-slate-600 bg-white transition-colors has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white hover:border-indigo-400"
              >
                <input type="checkbox" name="filter_tabs" value={tab} defaultChecked={initialTabs.has(tab)} className="sr-only" />
                {tab}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4) Banner config — scope, uploaded image, click destination, override. */}
      {isBanner && (
        <>
          <div className="border-t border-slate-100 pt-5">
            <label className="text-sm font-bold text-slate-700 block sm:max-w-xs">
              {placement === "state_hub_banner" ? "State" : "City"} it covers
              <select name="scope" required defaultValue={initial?.scope || ""} className={`${inputCls} mt-1 font-normal bg-white`}>
                <option value="" disabled>Select a {placement === "state_hub_banner" ? "state" : "city"}…</option>
                {placement === "state_hub_banner"
                  ? stateOptions.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))
                  : stateOptions.map((st) => (
                      <optgroup key={st} label={st}>
                        {cityOptions.filter((c) => c.state === st).map((c) => (
                          <option key={`${st}-${c.name}`} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                    ))}
              </select>
              <span className="block text-[11px] font-normal text-slate-400 mt-1">Which {placement === "state_hub_banner" ? "state" : "city"} hub this banner shows on.</span>
            </label>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-black text-slate-800 mb-1">Banner image{isEdit ? " — replace (optional)" : ""}</p>
            <p className="text-[11px] text-slate-400 mb-3">
              Recommended <b>2400 × 700 px</b> (24:7). Shown cropped and centered — on phones the slot narrows to 21:9,
              so roughly <b>16% is cut from each side</b>: keep logos and text inside the middle two-thirds, and leave
              the top-left corner clear for the &quot;Sponsored&quot; label. Large images are resized automatically.
            </p>
            {isEdit && initial?.banner_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={initial.banner_image_url} alt="Current banner" className="mb-3 h-20 w-auto rounded-lg border border-slate-200 object-cover" />
            )}
            <input
              ref={bannerInputRef}
              onChange={handleBannerPick}
              type="file"
              name="banner_image"
              accept="image/png,image/jpeg,image/webp"
              required={!isEdit}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {bannerNote && <p className="mt-1.5 text-[11px] font-bold text-emerald-700">{bannerNote}</p>}
            {bannerError && <p className="mt-1.5 text-[11px] font-bold text-red-600">{bannerError}</p>}
            {isEdit && <p className="text-[11px] text-slate-400 mt-1">Leave empty to keep the current image.</p>}
          </div>

          <EntityTypeahead
            heading="Click destination — pick the entity this banner links to"
            initialType={initial?.entity_type}
            initialSlug={initial?.creative}
            initialName={initial?.entityName}
          />

          <div className="border-t border-slate-100 pt-5">
            <label className="text-sm font-bold text-slate-700 block">
              External URL <span className="font-normal text-slate-400">(optional — overrides the entity link)</span>
              <input
                type="url"
                name="click_url"
                defaultValue={initial?.click_url || ""}
                placeholder="https://advertiser.com/landing"
                className={`${inputCls} mt-1 font-normal`}
              />
              <span className="block text-[11px] font-normal text-slate-400 mt-1">If set, clicking the banner goes here instead of the entity&apos;s profile.</span>
            </label>
          </div>
        </>
      )}

      {/* 5) Entity bottom banner — page-type targeting, destination entity, copy. */}
      {isEntityBanner && (
        <>
          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-black text-slate-800 mb-1">Show on these entity page types</p>
            <p className="text-[11px] text-slate-400 mb-3">Which kinds of entity pages this banner appears on. Select one or more; none = all types.</p>
            <div className="flex flex-wrap gap-2">
              {BANNER_PAGE_TYPES.map((pt) => (
                <label
                  key={pt.key}
                  className="cursor-pointer select-none rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-bold text-slate-600 bg-white transition-colors has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white hover:border-indigo-400"
                >
                  <input type="checkbox" name="banner_page_types" value={pt.key} defaultChecked={initialPageTypes.has(pt.key)} className="sr-only" />
                  {pt.label}
                </label>
              ))}
            </div>
          </div>
          <EntityTypeahead
            heading="Link destination — the entity this banner sends visitors to"
            initialType={initial?.entity_type}
            initialSlug={initial?.creative}
            initialName={initial?.entityName}
          />
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Ad copy</p>
              <p className="text-[11px] text-slate-400">Shown in a compact bottom banner — keep it short.</p>
            </div>
            <label className="text-sm font-bold text-slate-700 block sm:max-w-xs">
              Eyebrow label
              <input name="ad_eyebrow" defaultValue={initial?.ad_eyebrow || ""} placeholder="Sponsored" maxLength={28} className={`${inputCls} mt-1 font-normal`} />
              <span className="block text-[11px] font-normal text-slate-400 mt-1">Small uppercase label above the pitch.</span>
            </label>
            <label className="text-sm font-bold text-slate-700 block">
              Headline / pitch
              <textarea name="ad_headline" defaultValue={initial?.ad_headline || ""} placeholder="Book your next fade at Sauccy Fades — walk-ins welcome." maxLength={140} rows={2} className={`${inputCls} mt-1 font-normal`} />
              <span className="block text-[11px] font-normal text-slate-400 mt-1">One or two short sentences (~140 characters max) so it fits the banner.</span>
            </label>
            <label className="text-sm font-bold text-slate-700 block sm:max-w-xs">
              Button label
              <input name="ad_cta_label" defaultValue={initial?.ad_cta_label || ""} placeholder="View shop" maxLength={24} className={`${inputCls} mt-1 font-normal`} />
            </label>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-2.5 hover:bg-indigo-700 transition-colors">
          {isEdit ? "Save changes" : "Create campaign"}
        </button>
        {isEdit && (
          <a href="/admin/ad-campaigns" className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</a>
        )}
      </div>
    </form>
  );
}
