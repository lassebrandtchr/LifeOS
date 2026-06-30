import { JarvisDashboard } from "@/components/dashboard/jarvis-dashboard";
import { getGreeting } from "@/features/dashboard/greeting";
import { getDashboardData } from "@/features/dashboard/stats";

export default async function HomePage() {
  const [greeting, data] = await Promise.all([
    Promise.resolve(getGreeting()),
    getDashboardData(),
  ]);
  return <JarvisDashboard greeting={greeting} data={data} />;
}
