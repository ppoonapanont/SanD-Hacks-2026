import type {
  GenerateAudioRequest,
  GenerateAudioResponse,
  GeneratePodcastRequest,
  GeneratePodcastResponse,
  GetPodcastResponse,
  InteractRequest,
  InteractResponse,
  NextTurnRequest,
  NextTurnResponse,
  PodcastHistoryResponse,
  ResumeRequest,
  ResumeResponse,
  TranscribeAudioResponse,
} from "@/types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : `Request failed with status ${response.status}`,
    );
  }
  return data;
}

/** Typed fetch helpers for Developer 2 UI wiring. */

export async function generatePodcast(
  body: GeneratePodcastRequest,
): Promise<GeneratePodcastResponse> {
  const response = await fetch("/api/podcast/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function nextTurn(
  body: NextTurnRequest,
): Promise<NextTurnResponse> {
  const response = await fetch("/api/podcast/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function interact(
  body: InteractRequest,
): Promise<InteractResponse> {
  const response = await fetch("/api/podcast/interact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function resumePodcast(
  body: ResumeRequest,
): Promise<ResumeResponse> {
  const response = await fetch("/api/podcast/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function getPodcast(id: string): Promise<GetPodcastResponse> {
  const response = await fetch(`/api/podcast/${id}`);
  return parseJson(response);
}

export async function getPodcastHistory(): Promise<PodcastHistoryResponse> {
  const response = await fetch("/api/podcast/history");
  return parseJson(response);
}

export async function generateAudio(
  body: GenerateAudioRequest,
): Promise<GenerateAudioResponse> {
  const response = await fetch("/api/audio/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function transcribeAudio(
  formData: FormData,
): Promise<TranscribeAudioResponse> {
  const response = await fetch("/api/audio/transcribe", {
    method: "POST",
    body: formData,
  });
  return parseJson(response);
}
