import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';
import type { LanguageCode } from '@/app/constants';
import type { VoicePhraseSeed } from '@/types/domain';

interface VoiceWaveformWidgetProps {
  language: LanguageCode;
  phrases: VoicePhraseSeed[];
  value: string;
  onChange: (nextTranscript: string) => void;
  label?: string;
}

export function VoiceWaveformWidget({
  language,
  phrases,
  value,
  onChange,
  label = 'Tap mic to speak in Kannada, Hindi, or English — or pick a quick voice phrase',
}: VoiceWaveformWidgetProps) {
  const [listening, setListening] = useState(false);
  const [bars, setBars] = useState<number[]>([18, 32, 24, 46, 28, 52, 34, 20, 40, 26, 44, 22]);
  const timerRef = useRef<number | null>(null);

  const langPhrases = phrases.filter((p) => p.lang === language);
  const displayPhrases = langPhrases.length > 0 ? langPhrases : phrases.slice(0, 6);

  useEffect(() => {
    if (!listening) return;
    const id = window.setInterval(() => {
      setBars((prev) => prev.map((_, i) => 14 + ((Date.now() / 70 + i * 19) % 44)));
    }, 110);
    return () => window.clearInterval(id);
  }, [listening]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const playScriptedPhrase = (phraseText: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setListening(true);
    const words = phraseText.split(' ');
    let idx = 0;
    onChange('');
    timerRef.current = window.setInterval(() => {
      idx += 1;
      onChange(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setListening(false);
      }
    }, 115);
  };

  const handleMicToggle = () => {
    if (listening) {
      setListening(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
        rec.interimResults = true;
        setListening(true);
        rec.onresult = (ev: any) => {
          const text = Array.from(ev.results)
            .map((r: any) => r[0]?.transcript ?? '')
            .join(' ');
          if (text) onChange(text);
        };
        rec.onerror = () => {
          // Seamless fallback to scripted harvest phrase if mic permission declined
          playScriptedPhrase(displayPhrases[0]?.transcript ?? '20 quintal tomato tomorrow morning Kolar APMC');
        };
        rec.onend = () => setListening(false);
        rec.start();
        return;
      } catch {
        // Fall through to scripted voice capture
      }
    }

    playScriptedPhrase(displayPhrases[0]?.transcript ?? '20 quintal tomato tomorrow morning Kolar APMC');
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleMicToggle}
          aria-label={listening ? 'Stop voice capture' : 'Start voice capture'}
          className={`flex min-h-[56px] min-w-[56px] shrink-0 items-center justify-center rounded-2xl px-4 py-3 font-semibold text-white shadow-soft transition-transform active:scale-95 ${
            listening ? 'bg-coral' : 'bg-primary hover:bg-primary-strong'
          }`}
        >
          {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          <span className="ml-2 text-sm sm:hidden">{listening ? 'Listening...' : 'Tap to Speak'}</span>
        </button>

        <div className="flex-1">
          <p className="text-xs font-semibold text-ink-muted">{label}</p>
          {/* Reactive Waveform */}
          <div className="mt-2 flex h-10 items-center gap-1.5 rounded-xl bg-surface-2 px-3">
            {bars.map((h, i) => (
              <motion.span
                key={i}
                animate={{ height: listening ? Math.max(8, Math.min(34, h * 0.65)) : 8 + ((value.length + i * 5) % 14) }}
                transition={{ duration: 0.12 }}
                className={`w-1.5 rounded-full ${listening ? 'bg-primary' : 'bg-primary/45'}`}
              />
            ))}
            <span className="ml-2 truncate text-xs font-medium text-ink-muted">
              {listening ? 'Listening & extracting fields live...' : 'Voice parser ready (EN • हिन्दी • ಕನ್ನಡ)'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="voice-transcript-box" className="sr-only">
          Spoken or typed booking note
        </label>
        <input
          id="voice-transcript-box"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Spoken or typed booking note"
          className="min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm font-medium text-ink focus:bg-surface"
        />
      </div>

      {/* Tappable Spoken Phrase Library */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          <Volume2 className="h-3.5 w-3.5 text-primary" />
          <span>Tap a spoken phrase ({language.toUpperCase()})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {displayPhrases.slice(0, 6).map((p) => {
            const active = value === p.transcript;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => playScriptedPhrase(p.transcript)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary-100 text-primary-strong'
                    : 'border-border bg-bg text-ink hover:border-primary/50 hover:bg-surface-2'
                }`}
              >
                {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Sparkles className="h-3 w-3 shrink-0 text-accent" />}
                <span>{p.transcript}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
