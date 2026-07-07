import { getRecentEvents } from "./data";
import { EventSubmission } from "./EventSubmission";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Submission | Inner G Complete Agency",
  robots: { index: false, follow: false },
};

export default async function EventSubmissionPage() {
  const recentEvents = await getRecentEvents();
  return <EventSubmission recentEvents={recentEvents} />;
}
