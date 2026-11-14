import type { NewsSource } from "@/types";

/**
 * Mock news used when Bright Data is unavailable.
 * Always mark isMock: true so the UI can distinguish demo data.
 */
export const MOCK_NEWS_SOURCES: NewsSource[] = [
  {
    id: "mock-news-1",
    title: "AI Chip Demand Accelerates Enterprise Cloud Spending",
    publisher: "Mock Wire",
    url: "https://example.com/news/ai-chip-demand",
    publishedAt: "2026-11-13T14:00:00.000Z",
    summary:
      "Cloud providers report higher capital expenditure as enterprises race to deploy generative AI workloads.",
    keyClaims: [
      "Enterprise AI infrastructure spending rose sharply this quarter.",
      "Chip supply constraints remain a bottleneck for new deployments.",
    ],
    isMock: true,
  },
  {
    id: "mock-news-2",
    title: "Central Banks Signal Caution Amid Uneven Growth",
    publisher: "Mock Economics Daily",
    url: "https://example.com/news/central-banks-caution",
    publishedAt: "2026-11-13T09:30:00.000Z",
    summary:
      "Policymakers emphasize data-dependent rate decisions while inflation cools unevenly across regions.",
    keyClaims: [
      "Inflation is moderating but services prices remain sticky.",
      "Officials prefer gradual policy adjustments over abrupt shifts.",
    ],
    isMock: true,
  },
  {
    id: "mock-news-3",
    title: "Open-Source Models Narrow Gap With Proprietary Systems",
    publisher: "Mock Tech Review",
    url: "https://example.com/news/open-source-models",
    publishedAt: "2026-11-12T18:15:00.000Z",
    summary:
      "New open-weight models show competitive reasoning scores, intensifying debate over access and safety.",
    keyClaims: [
      "Benchmark gaps between open and closed models continue to shrink.",
      "Enterprises are evaluating hybrid model strategies.",
    ],
    isMock: true,
  },
];
