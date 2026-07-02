import { JarvisDashboard } from "@/components/dashboard/jarvis-dashboard";
import { getGreeting } from "@/features/dashboard/greeting";
import { getDashboardData } from "@/features/dashboard/stats";
import { getAllWeather } from "@/lib/weather/open-meteo";

export default async function HomePage() {
  const [greeting, data, weather] = await Promise.all([
    Promise.resolve(getGreeting()),
    getDashboardData(),
    getAllWeather(),
  ]);
  return <JarvisDashboard greeting={greeting} data={data} weather={weather} />;
}
