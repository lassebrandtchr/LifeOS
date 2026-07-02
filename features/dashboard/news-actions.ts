"use server";

import { getCarIndustryNews, getTechAiNews } from "@/lib/news/google-news";
import type { NewsItem } from "@/lib/news/types";

/**
 * Manuel "Opdater"-knap i nyhedskassen på forsiden – henter friske nyheder
 * UDEN om den normale 6-timers-cache, og undgår så vidt muligt at vise de
 * samme artikler man allerede kan se (excludeUrls).
 */
export async function refreshNews(
  isWork: boolean,
  excludeUrls: string[],
): Promise<NewsItem[]> {
  const opts = { force: true, excludeUrls };
  return isWork ? getCarIndustryNews(5, opts) : getTechAiNews(5, opts);
}
