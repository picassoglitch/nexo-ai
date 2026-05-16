import { setRequestLocale } from 'next-intl/server';

const MODELS = [
  { id: 'sonnet', ic: '◈', name: 'Claude Sonnet 4.5', provider: 'Anthropic', use: 'Reasoning · agents', cost: '$3.40 in / $15 out', calls: '142k', state: 'gr' as const, label: 'Primary' },
  { id: 'haiku', ic: '◇', name: 'Claude Haiku', provider: 'Anthropic', use: 'Fast classification', cost: '$0.80 in / $4 out', calls: '418k', state: 'gr' as const, label: 'Active' },
  { id: '4o', ic: '◆', name: 'GPT-4o', provider: 'OpenAI', use: 'Fallback · multimodal', cost: '$5 in / $15 out', calls: '38k', state: 'gr' as const, label: 'Active' },
  { id: '4omini', ic: '◇', name: 'GPT-4o-mini', provider: 'OpenAI', use: 'Bulk content gen', cost: '$0.15 in / $0.60 out', calls: '612k', state: 'gr' as const, label: 'Active' },
  { id: 'whisper', ic: '🎤', name: 'Whisper-large-v3', provider: 'OpenAI', use: 'Caption transcription', cost: '$0.006/min', calls: '8.2k min', state: 'gr' as const, label: 'Active' },
  { id: 'llama', ic: '🦙', name: 'Llama 3.1 70B', provider: 'Local · Ollama', use: 'Signal reasoning', cost: 'Self-hosted', calls: '24k', state: 'cy' as const, label: 'GPU-02' },
  { id: 'sdxl', ic: '🎨', name: 'SDXL Turbo', provider: 'Local · Replicate', use: 'Thumbnails', cost: '$0.0035/img', calls: '4.1k', state: 'pu' as const, label: 'Rendering' },
  { id: 'sora', ic: '🎬', name: 'Sora preview', provider: 'OpenAI', use: 'Clip variants (alpha)', cost: 'Preview tier', calls: '128', state: 'am' as const, label: 'Limited' },
  { id: 'embed', ic: '▤', name: 'text-embedding-3-large', provider: 'OpenAI', use: 'Lead matching · search', cost: '$0.13 / 1M tokens', calls: '2.1M', state: 'gr' as const, label: 'Active' },
];

export default async function ModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const byProvider = MODELS.reduce<Record<string, typeof MODELS>>((acc, m) => {
    (acc[m.provider] ||= [] as typeof MODELS).push(m);
    return acc;
  }, {});

  return (
    <div className="cc-scroll">
      {Object.entries(byProvider).map(([provider, models]) => (
        <div key={provider} className="cc-mod-section">
          <div className="cc-mod-sl">{provider}</div>
          <div className="cc-mod-list">
            {models.map((m) => (
              <div key={m.id} className="cc-mod-row">
                <div className="cc-mod-ic">{m.ic}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {m.name} <span className={`cc-mod-badge ${m.state}`}>{m.label}</span>
                  </div>
                  <div className="cc-mod-sub">
                    {m.use} · {m.cost}
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b>{m.calls}</b>
                  <span>calls 30d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
