import { useState } from 'react';
import { Bell, Mic, Send, Volume2 } from 'lucide-react';
import { speakTextAloud } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';

const QUICK_REPLIES = [
  'Crates are stacked at village dairy gate',
  'Please bring 2 extra plastic tarpaulins',
  'Unload at Bay 4, Anwar mandi stall',
  'ದಯವಿಟ್ಟು ಗೇಟ್ ಬಳಿ ಕರೆ ಮಾಡಿ (Call at gate)',
];

export function FarmerMessagesPage() {
  const pools = useAppStore((s) => s.pools);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const notifications = useAppStore((s) => s.notifications);
  const accounts = useAppStore((s) => s.accounts);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const language = useAppStore((s) => s.language);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);

  const activeAccount = accounts.find((a) => a.id === currentAccountId) ?? accounts[0];
  const activePool = pools[0];
  const threadMessages = chatMessages.filter((m) => m.threadId === activePool.id);

  const [draft, setDraft] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendChatMessage(activePool.id, activeAccount.name, 'farmer', draft);
    setDraft('');
  };

  const handleSendVoiceBubble = () => {
    sendChatMessage(
      activePool.id,
      activeAccount.name,
      'farmer',
      'Voice note: 20 crates ready under neem shade near Vemgal cross.',
      true,
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Driver & Pool Chat Thread */}
        <div className="flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-7">
          <div className="border-b border-border pb-3">
            <h1 className="text-lg font-extrabold text-ink">
              Driver & Pool Thread — {activePool.code}
            </h1>
            <p className="text-xs text-ink-muted">
              {activePool.transporterName} ({activePool.vehiclePlate}) + {activePool.shares.length} pool shippers
            </p>
          </div>

          <div className="my-4 max-h-[360px] flex-1 space-y-3 overflow-y-auto pr-1">
            {threadMessages.map((msg) => {
              const isFarmer = msg.senderRole === 'farmer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFarmer ? 'items-end' : 'items-start'}`}
                >
                  <span className="mb-0.5 text-[10px] font-bold text-ink-muted">
                    {msg.senderName} •{' '}
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      isFarmer
                        ? 'bg-primary text-white'
                        : 'border border-border bg-surface-2 text-ink'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.isVoiceNote && (
                      <button
                        type="button"
                        onClick={() => speakTextAloud(msg.text, language)}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-black/15 px-2 py-1 text-[11px] font-bold"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Play {msg.voiceDurationSec ?? 8}s Voice Note
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Replies */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => sendChatMessage(activePool.id, activeAccount.name, 'farmer', qr)}
                className="rounded-xl border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-primary"
              >
                {qr}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Message driver"
              className="min-h-[46px] flex-1 rounded-xl border border-border bg-surface-2 px-3.5 text-xs font-medium text-ink"
            />
            <button
              type="button"
              onClick={handleSendVoiceBubble}
              aria-label="Send voice note"
              className="flex min-h-[46px] min-w-[46px] items-center justify-center rounded-xl border border-primary bg-primary-100 text-primary-strong hover:bg-primary hover:text-white"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-strong"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </form>
        </div>

        {/* Notifications Centre */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary-strong" />
            <h2 className="text-base font-extrabold text-ink">Notifications Centre</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-2xl border border-border bg-bg p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-ink">{n.title}</span>
                  <span className="text-[10px] text-ink-muted">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
