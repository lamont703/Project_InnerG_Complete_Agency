/**
 * Services and categories: turning Google's catalogue into a selection, and a
 * selection back into a complete field value.
 *
 * The hazard here is different from attributes, and worse. `serviceItems` and
 * `categories` are REPLACED wholesale by a patch — they are not merged. Sending
 * two services to a listing that has forty-four deletes forty-two of them,
 * instantly and without warning. The agency listing this was built against has
 * exactly forty-four.
 *
 * So the merge functions below are the safety-critical part of this file: they
 * always start from what already exists and only add. Every one of them is
 * tested for the property that nothing present beforehand disappears.
 *
 * Pure — no network, no database.
 */

export interface ServiceType {
  serviceTypeId: string;
  displayName: string;
}

/** A serviceItems entry as Google returns and accepts it. */
export interface ServiceItem {
  structuredServiceItem?: { serviceTypeId: string; description?: string };
  freeFormServiceItem?: {
    category?: string;
    label?: { displayName: string; description?: string; languageCode?: string };
  };
}

export interface Category {
  name: string;
  displayName: string;
}

export interface ServiceOption {
  serviceTypeId: string;
  label: string;
  /** True when the listing already offers it. */
  selected: boolean;
}

export interface ServiceSelection {
  options: ServiceOption[];
  /** Owner-written services that aren't in Google's structured catalogue. */
  freeForm: string[];
  offeredCount: number;
  availableCount: number;
}

export function buildServiceSelection(
  serviceTypes: ServiceType[],
  current: ServiceItem[]
): ServiceSelection {
  const offered = new Set(
    current.map((i) => i.structuredServiceItem?.serviceTypeId).filter(Boolean) as string[]
  );

  const seen = new Set<string>();
  const options: ServiceOption[] = [];
  for (const st of serviceTypes) {
    if (!st?.serviceTypeId || seen.has(st.serviceTypeId)) continue;
    seen.add(st.serviceTypeId);
    options.push({
      serviceTypeId: st.serviceTypeId,
      label: st.displayName || st.serviceTypeId,
      selected: offered.has(st.serviceTypeId),
    });
  }

  options.sort((a, b) => Number(b.selected) - Number(a.selected) || a.label.localeCompare(b.label));

  const freeForm = current
    .map((i) => i.freeFormServiceItem?.label?.displayName)
    .filter((x): x is string => !!x);

  return {
    options,
    freeForm,
    offeredCount: offered.size + freeForm.length,
    availableCount: options.length,
  };
}

/**
 * Build the complete serviceItems array to send.
 *
 * Starts from the existing list and adds. A structured service the owner
 * deselects is removed; anything we don't recognise — free-form entries, or
 * structured types outside the catalogue we fetched — is carried through
 * untouched, because a service we can't classify is still a service the owner
 * put there.
 */
export function mergeServiceItems(args: {
  current: ServiceItem[];
  /** Structured ids the owner wants offered, from the catalogue we showed them. */
  selectedTypeIds: string[];
  /** Only ids in this set may be added or removed; anything else is untouched. */
  catalogueIds: Set<string>;
  /** New owner-written services to append. */
  newFreeForm?: string[];
}): ServiceItem[] {
  const { current, selectedTypeIds, catalogueIds, newFreeForm = [] } = args;
  const selected = new Set(selectedTypeIds.filter((id) => catalogueIds.has(id)));

  const kept: ServiceItem[] = [];
  for (const item of current) {
    const id = item.structuredServiceItem?.serviceTypeId;
    if (!id) { kept.push(item); continue; }            // free-form and anything unexpected
    if (!catalogueIds.has(id)) { kept.push(item); continue; } // outside what we showed
    if (selected.has(id)) kept.push(item);              // still offered
    // else: owner deselected it
  }

  const existingIds = new Set(
    kept.map((i) => i.structuredServiceItem?.serviceTypeId).filter(Boolean) as string[]
  );
  for (const id of selected) {
    if (!existingIds.has(id)) kept.push({ structuredServiceItem: { serviceTypeId: id } });
  }

  const existingLabels = new Set(
    kept.map((i) => i.freeFormServiceItem?.label?.displayName?.toLowerCase()).filter(Boolean)
  );
  for (const raw of newFreeForm) {
    const label = raw.trim();
    if (!label || existingLabels.has(label.toLowerCase())) continue;
    existingLabels.add(label.toLowerCase());
    kept.push({ freeFormServiceItem: { label: { displayName: label, languageCode: "en" } } });
  }

  return kept;
}

/** Google's cap on additional categories. */
export const MAX_ADDITIONAL_CATEGORIES = 9;

export interface CategoryMergeResult {
  primaryCategory: Category;
  additionalCategories: Category[];
  /** Names that didn't fit under the cap, so the caller can say so. */
  dropped: Category[];
}

/**
 * Build the complete categories value.
 *
 * Two rules Google is strict about, enforced here rather than trusted to the UI:
 * the primary category is never changed by this path — moving what a business
 * *is* is not a bulk-edit operation — and a category already present is never
 * duplicated. The cap is enforced by dropping the tail and reporting it, rather
 * than silently sending an over-long list Google would reject.
 */
export function mergeCategories(args: {
  primary: Category;
  currentAdditional: Category[];
  /** Categories the owner chose to add. */
  add: Category[];
  /** Category names the owner chose to remove. */
  remove?: string[];
}): CategoryMergeResult {
  const { primary, currentAdditional, add, remove = [] } = args;
  const removing = new Set(remove);

  const merged: Category[] = [];
  const seen = new Set<string>([primary.name]);

  for (const c of currentAdditional) {
    if (removing.has(c.name) || seen.has(c.name)) continue;
    seen.add(c.name);
    merged.push(c);
  }
  for (const c of add) {
    if (seen.has(c.name)) continue; // already present, or is the primary
    seen.add(c.name);
    merged.push(c);
  }

  return {
    primaryCategory: primary,
    additionalCategories: merged.slice(0, MAX_ADDITIONAL_CATEGORIES),
    dropped: merged.slice(MAX_ADDITIONAL_CATEGORIES),
  };
}
