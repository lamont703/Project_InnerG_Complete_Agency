"use client";

import { useState } from "react";
import { AD_PLACEMENTS, PLACEMENT_LABELS, SEARCH_AD_TABS } from "@/lib/ad-campaigns";
import { EntityTypeahead } from "./EntityTypeahead";

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
const PLACEMENT_HELP: Record<string, string> = {
  shop_profile: "Shows in the sponsored slot on shop profile pages, advertising the entity below (links to its profile).",
  salon_profile: "Shows in the sponsored slot on salon profile pages, advertising the entity below (links to its profile).",
  barber_supply_profile: "Shows in the sponsored slot on barber supply store pages, advertising the entity below (links to its profile).",
  beauty_supply_profile: "Shows in the sponsored slot on beauty supply store pages, advertising the entity below (links to its profile).",
  search_results: "Shows at the top of the search results on the selected filter tabs, advertising the entity below.",
  state_hub_banner: "Reserves the sponsorship banner on the state hub. Set the state it covers.",
  city_hub_banner: "Reserves the sponsorship banner on a city hub. Set the city it covers.",
};

export function CampaignForm({
  createAction,
  stateOptions,
  cityOptions,
}: {
  createAction: (formData: FormData) => void | Promise<void>;
  stateOptions: string[];
  cityOptions: { name: string; state: string }[];
}) {
  const [placement, setPlacement] = useState<string>("search_results");
  const isEntity = ENTITY_PLACEMENTS.has(placement);
  const isSearch = placement === "search_results";
  const isBanner = BANNER_PLACEMENTS.has(placement);

  return (
    <form action={createAction} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-bold text-slate-700">
          Advertiser email
          <input name="email" type="email" required placeholder="owner@example.com" className={`${inputCls} mt-1 font-normal`} />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Campaign name
          <input name="name" required placeholder="Sauccy Fades — Shop Ads" className={`${inputCls} mt-1 font-normal`} />
        </label>
      </div>

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
      {isEntity && <EntityTypeahead />}

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
                <input type="checkbox" name="filter_tabs" value={tab} className="sr-only" />
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
              <select name="scope" required defaultValue="" className={`${inputCls} mt-1 font-normal bg-white`}>
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
            <p className="text-sm font-black text-slate-800 mb-1">Banner image</p>
            <p className="text-[11px] text-slate-400 mb-3">
              Recommended <b>1200 × 350 px</b> (wide banner, ~24:7). It&apos;s displayed cropped and centered, so keep
              logos and text near the middle. PNG or JPG.
            </p>
            <input
              type="file"
              name="banner_image"
              accept="image/png,image/jpeg,image/webp"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <EntityTypeahead heading="Click destination — pick the entity this banner links to" />

          <div className="border-t border-slate-100 pt-5">
            <label className="text-sm font-bold text-slate-700 block">
              External URL <span className="font-normal text-slate-400">(optional — overrides the entity link)</span>
              <input
                type="url"
                name="click_url"
                placeholder="https://advertiser.com/landing"
                className={`${inputCls} mt-1 font-normal`}
              />
              <span className="block text-[11px] font-normal text-slate-400 mt-1">If set, clicking the banner goes here instead of the entity&apos;s profile.</span>
            </label>
          </div>
        </>
      )}

      <button type="submit" className="rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-2.5 hover:bg-indigo-700 transition-colors">
        Create campaign
      </button>
    </form>
  );
}
