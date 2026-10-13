export interface SenderFrameLike { url: string }
export interface SenderLike { id: number; mainFrame: SenderFrameLike }

export function isTrustedIpcSender(event: { sender: SenderLike; senderFrame: SenderFrameLike | null }, windowWebContentsId: number, developmentUrl?: string): boolean {
  if (!event.senderFrame) return false;
  if (event.sender.id !== windowWebContentsId || event.senderFrame !== event.sender.mainFrame) return false;
  const current = event.senderFrame.url;
  if (developmentUrl) { try { return new URL(current).origin === new URL(developmentUrl).origin; } catch { return false; } }
  return current.startsWith("file://");
}
