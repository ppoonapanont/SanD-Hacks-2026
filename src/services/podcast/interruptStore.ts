import type { ConversationTurn } from "@/types";

/**
 * Side-channel interrupt state so episode `session.turns` stay the original script.
 * Interact responses are returned to the client and cached here for resume/debug.
 */
export interface InterruptRecord {
  message: string;
  targetGuestId?: string;
  turns: ConversationTurn[];
  addedSourceIds: string[];
  createdAt: string;
}

const records = new Map<string, InterruptRecord>();

export function setInterruptRecord(sessionId: string, record: InterruptRecord): void {
  records.set(sessionId, record);
}

export function getInterruptRecord(sessionId: string): InterruptRecord | undefined {
  return records.get(sessionId);
}

export function clearInterruptRecord(sessionId: string): void {
  records.delete(sessionId);
}
