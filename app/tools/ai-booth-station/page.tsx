import { redirect } from 'next/navigation';

export default function AIBoothStationIndex() {
  // Automatically redirect to a demo shop so the user sees the dashboard right away
  // In a real app, this could be a directory of shops or a login page
  redirect('/tools/ai-booth-station/barberia-ramirez-suarez');
}
