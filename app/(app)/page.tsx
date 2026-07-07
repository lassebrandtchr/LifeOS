import { JarvisDashboard } from "@/components/dashboard/jarvis-dashboard";
import { getGreeting } from "@/features/dashboard/greeting";
import { getDashboardData } from "@/features/dashboard/stats";
import { getAllWeather } from "@/lib/weather/open-meteo";
import { getCarIndustryNews, getTechAiNews } from "@/lib/news/google-news";
import { getBilinfoSummary } from "@/lib/bilinfo/client";
import { getMailMessages } from "@/features/integrations/queries";
import { getTasksByBucket } from "@/features/tasks/queries";
import { bucketOrder } from "@/features/tasks/constants";
import { buildActionList } from "@/features/dashboard/action-list";

export default async function HomePage() {
  const [greeting, data, weather, allMails, taskBuckets, carNews, techNews, bilinfo] = await Promise.all([
    Promise.resolve(getGreeting()),
    getDashboardData(),
    getAllWeather(),
    getMailMessages(50),
    getTasksByBucket(),
    getCarIndustryNews(5),
    getTechAiNews(5),
    getBilinfoSummary(),
  ]);
  const news = { work: carNews, private: techNews };

  // Samme Action-liste-logik som /storgaard-biler og /privat (buildActionList),
  // så forsidens lille udgave altid stemmer overens med undersidernes fulde
  // liste. Bygger BEGGE verdener her – JarvisDashboard vælger selv den
  // rigtige ud fra isWorkHours, ligesom den allerede gør med Hurtige handlinger.
  const workTasks = bucketOrder.flatMap((b) => taskBuckets[b]).filter((t) => t.workspace === "work");
  const privateTasks = bucketOrder.flatMap((b) => taskBuckets[b]).filter((t) => t.workspace === "private");
  // Aldrig blande Gmail ind i arbejde eller Outlook ind i privat (samme
  // eksplicitte kilde-guard som på undersiderne).
  const workMails = allMails.filter((m) => m.workspace === "work" && m.source === "outlook");
  const privateMails = allMails.filter((m) => m.workspace !== "work" && m.source !== "outlook");

  const actionGroups = {
    work: buildActionList(workTasks, workMails, "work"),
    private: buildActionList(privateTasks, privateMails, "private"),
  };

  return (
    <JarvisDashboard
      greeting={greeting}
      data={data}
      weather={weather}
      actionGroups={actionGroups}
      news={news}
      bilinfo={bilinfo}
    />
  );
}
