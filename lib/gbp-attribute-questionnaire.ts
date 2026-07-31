/**
 * Turning Google's available-attribute list into questions an owner can answer.
 *
 * Attributes cannot be automated in the way the rest of the audit's fix list
 * can. Google supplies a fixed catalogue per category and region — 48 for
 * "Barber shop" — and every entry is a factual claim about someone's business:
 * whether there's a wheelchair-accessible restroom, whether the owner identifies
 * as Black-owned, whether walk-ins are taken. We cannot know any of that, and
 * guessing would put false statements on a live listing under the owner's name.
 *
 * So the "automation" is: fetch the catalogue, work out what's unanswered, ask
 * the owner once, and write their answers. The owner's answer IS the approval —
 * there is no AI proposal to review, because there is nothing legitimate to
 * propose.
 *
 * Pure — no network, no database — so the grouping and prioritisation can be
 * tested against fixtures.
 */

export type AttributeValueType = "BOOL" | "URL" | "ENUM" | "REPEATED_ENUM" | string;

/** An entry from attributes?categoryName=…&regionCode=… */
export interface AvailableAttribute {
  parent: string;
  displayName: string;
  groupDisplayName?: string;
  valueType: AttributeValueType;
  repeatable?: boolean;
  deprecated?: boolean;
  valueMetadata?: { value: string; displayName: string }[];
}

/** An entry from locations/{id}/attributes */
export interface SetAttribute {
  name: string;
  valueType?: AttributeValueType;
  values?: any[];
}

export interface Question {
  /** Attribute id, e.g. "attributes/has_wheelchair_accessible_restroom". */
  name: string;
  label: string;
  group: string;
  valueType: AttributeValueType;
  /** Current answer, when the owner has already set one. */
  currentValue?: boolean | null;
  options?: { value: string; displayName: string }[];
}

export interface Questionnaire {
  /** Yes/no questions we can both ask and write today. */
  askable: Question[];
  /** Already answered — shown so an owner can change their mind. */
  answered: Question[];
  /**
   * Available but needing an input we haven't built or a write shape we haven't
   * verified (URL, ENUM, REPEATED_ENUM). Surfaced rather than hidden, so the
   * count an owner sees matches Google's.
   */
  unsupported: { name: string; label: string; group: string; valueType: AttributeValueType }[];
  totalAvailable: number;
  answeredCount: number;
}

/**
 * Group order. Identity and accessibility lead because they are live filters on
 * Maps — a customer can narrow to Black-owned or wheelchair-accessible
 * businesses, so an unset attribute there doesn't rank you lower, it removes you
 * from the result set entirely. The rest follow in rough order of how often a
 * customer decides on them.
 */
const GROUP_ORDER = [
  "From the business",
  "Accessibility",
  "Planning",
  "Amenities",
  "Crowd",
  "Service options",
  "Payments",
  "Parking",
  "Offerings",
  "Children",
  "Recycling",
];

function groupRank(group: string): number {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? GROUP_ORDER.length : i;
}

const boolValue = (a?: SetAttribute): boolean | null => {
  if (!a || !Array.isArray(a.values) || a.values.length === 0) return null;
  return a.values[0] === true;
};

export function buildQuestionnaire(
  available: AvailableAttribute[],
  current: SetAttribute[]
): Questionnaire {
  const setByName = new Map(current.map((a) => [a.name, a]));

  const askable: Question[] = [];
  const answered: Question[] = [];
  const unsupported: Questionnaire["unsupported"] = [];

  for (const a of available) {
    // Deprecated entries still come back from the API; asking about them wastes
    // the owner's attention on something Google is retiring.
    if (a.deprecated) continue;

    const group = a.groupDisplayName || "Other";

    if (a.valueType !== "BOOL") {
      unsupported.push({ name: a.parent, label: a.displayName, group, valueType: a.valueType });
      continue;
    }

    const existing = setByName.get(a.parent);
    const q: Question = {
      name: a.parent,
      label: a.displayName,
      group,
      valueType: "BOOL",
      currentValue: boolValue(existing),
    };
    (q.currentValue === null ? askable : answered).push(q);
  }

  const bySortOrder = (x: Question, y: Question) =>
    groupRank(x.group) - groupRank(y.group) || x.label.localeCompare(y.label);
  askable.sort(bySortOrder);
  answered.sort(bySortOrder);
  unsupported.sort((x, y) => groupRank(x.group) - groupRank(y.group) || x.label.localeCompare(y.label));

  return {
    askable,
    answered,
    unsupported,
    totalAvailable: available.filter((a) => !a.deprecated).length,
    answeredCount: answered.length,
  };
}

/**
 * Convert submitted answers into the payload writeAttributes expects.
 *
 * Only names present in `askableNames` are accepted. A client that posts an
 * arbitrary attribute id — including one from another category — would
 * otherwise have us writing something Google never offered for this business.
 *
 * "Don't know" is represented by omitting the answer, never by sending false.
 * False is a claim ("this business is not wheelchair accessible") and it will be
 * shown to customers as one.
 */
export function answersToAttributes(
  answers: Record<string, boolean | null | undefined>,
  askableNames: Set<string>
): { attributes: any[]; rejected: string[] } {
  const attributes: any[] = [];
  const rejected: string[] = [];

  for (const [name, value] of Object.entries(answers)) {
    if (!askableNames.has(name)) {
      rejected.push(name);
      continue;
    }
    if (value !== true && value !== false) continue; // unanswered stays unanswered
    attributes.push({ name, valueType: "BOOL", values: [value] });
  }

  return { attributes, rejected };
}

/** Group the askable questions for display, preserving the priority order. */
export function groupQuestions(questions: Question[]): { group: string; questions: Question[] }[] {
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    if (!map.has(q.group)) map.set(q.group, []);
    map.get(q.group)!.push(q);
  }
  return [...map.entries()]
    .map(([group, qs]) => ({ group, questions: qs }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group));
}
