import { useState, useRef } from 'react';
import { estimateTokens } from '../lib/tokens';
import { llm } from '../lib/llm';
import {
  ENC_PROMPTS, DEC_APEX_PROMPT, JUDGE_PROMPT,
  EVAL_EN, EVAL_ZH, SAMPLE_EN, SAMPLE_ZH,
} from '../lib/codebook';

interface Stats {
  inTok: number; outTok: number; ratio: string; saved: number; time: string;
}

export default function Codec() {
  const [input, setInput] = useState('');
  const [encoded, setEncoded] = useState('');
  const [rawText, setRawText] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [encoding, setEncoding] = useState(false);
  const [curLang, setCurLang] = useState<'en' | 'zh'>('en');

  // Cumulative
  const [cumIn, setCumIn] = useState(0);
  const [cumOut, setCumOut] = useState(0);
  const [cumSaved, setCumSaved] = useState(0);
  const [encCount, setEncCount] = useState(0);

  // Query
  const [query, setQuery] = useState('');
  const [codecAnswer, setCodecAnswer] = useState('');
  const [rawAnswer, setRawAnswer] = useState('');
  const [querying, setQuerying] = useState(false);

  // Eval
  const [evalLog, setEvalLog] = useState<string[]>([]);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalSummary, setEvalSummary] = useState('');

  const logRef = useRef<HTMLDivElement>(null);

  function loadSample(lang: 'en' | 'zh') {
    setCurLang(lang);
    setInput(lang === 'en' ? SAMPLE_EN : SAMPLE_ZH);
  }

  async function encode() {
    const t = input.trim();
    if (!t || encoding) return;
    setRawText(t);
    setEncoding(true);
    setEncoded('');
    setStats(null);
    setEvalLog([]);
    setEvalSummary('');
    setCodecAnswer('');
    setRawAnswer('');

    // Detect language
    let cjk = 0;
    for (const c of t) { if (c.charCodeAt(0) > 0x2E7F) cjk++; }
    const lang: 'en' | 'zh' = cjk > t.length * 0.1 ? 'zh' : 'en';
    setCurLang(lang);

    const t0 = performance.now();
    try {
      const enc = await llm([{ role: 'system', content: ENC_PROMPTS.apex }, { role: 'user', content: t }], 8192);
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setEncoded(enc);

      const it = estimateTokens(t), ot = estimateTokens(enc);
      const rt = (it / ot).toFixed(1);
      setStats({ inTok: it, outTok: ot, ratio: rt, saved: it - ot, time: elapsed });

      setCumIn(p => p + it);
      setCumOut(p => p + ot);
      setCumSaved(p => p + (it - ot));
      setEncCount(p => p + 1);

      // Auto-eval
      setTimeout(() => runEval(enc, t, lang), 100);
    } catch (e: any) {
      setEncoded('Error: ' + e.message);
    } finally {
      setEncoding(false);
    }
  }

  async function handleQuery() {
    const q = query.trim();
    if (!q || !encoded || querying) return;
    setQuerying(true);
    setCodecAnswer('Decoding...');
    setRawAnswer('Querying...');
    try {
      const [c, r] = await Promise.all([
        llm([{ role: 'system', content: DEC_APEX_PROMPT }, { role: 'user', content: 'ENCODED:\n' + encoded + '\n\nQ: ' + q }], 2048),
        llm([{ role: 'user', content: rawText + '\n\nQ: ' + q }], 2048),
      ]);
      setCodecAnswer(c);
      setRawAnswer(r);
    } catch (e: any) {
      setCodecAnswer('Error: ' + e.message);
      setRawAnswer('Error: ' + e.message);
    } finally {
      setQuerying(false);
    }
  }

  async function runEval(enc?: string, raw?: string, lang?: 'en' | 'zh') {
    const e = enc || encoded, r = raw || rawText, lg = lang || curLang;
    if (!e || !r || evalRunning) return;
    setEvalRunning(true);
    setEvalLog([]);
    setEvalSummary('');

    const eqs = lg === 'en' ? EVAL_EN : EVAL_ZH;
    let totalHit = 0, totalFacts = 0;
    const logs: string[] = [];

    for (let i = 0; i < eqs.length; i++) {
      const { q, facts } = eqs[i];
      setEvalSummary(`${i + 1}/${eqs.length}...`);
      logs.push(`Q${i + 1}: ${q}`);
      setEvalLog([...logs]);

      try {
        const ans = await llm([{ role: 'system', content: DEC_APEX_PROMPT }, { role: 'user', content: 'ENCODED:\n' + e + '\n\nQ: ' + q }], 1024);
        const judgeInput = 'QUESTION: ' + q + '\nFACTS:\n' + facts.map((f, j) => (j + 1) + '. ' + f).join('\n') + '\nANSWER:\n' + ans;
        const judgeOut = await llm([{ role: 'system', content: JUDGE_PROMPT }, { role: 'user', content: judgeInput }], 256);

        let scores: number[];
        try {
          const match = judgeOut.match(/\[[\d,\s]+\]/);
          scores = match ? JSON.parse(match[0]) : facts.map(() => 0);
        } catch { scores = facts.map(() => 0); }

        const hit = scores.reduce((a, b) => a + b, 0);
        totalHit += hit;
        totalFacts += facts.length;
        const pct = Math.round(hit / facts.length * 100);
        const cls = pct >= 80 ? 'text-green' : pct >= 50 ? 'text-orange' : 'text-red';
        logs.push(`  ${cls} ${hit}/${facts.length} (${pct}%) ${facts.map((f, j) => (scores[j] ? '[+]' : '[-]') + f).join(' | ')}`);
      } catch (e: any) {
        logs.push(`  text-red Error: ${e.message}`);
        totalFacts += facts.length;
      }
      setEvalLog([...logs]);
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }

    const finalPct = Math.round(totalHit / totalFacts * 100);
    const grade = finalPct >= 90 ? 'S' : finalPct >= 80 ? 'A' : finalPct >= 60 ? 'B' : finalPct >= 40 ? 'C' : 'D';
    const ratioStr = stats ? stats.ratio + 'x' : '?';
    logs.push(`SCORE: ${totalHit}/${totalFacts} (${finalPct}%) | Grade: ${grade} | Compression: ${ratioStr}`);
    setEvalLog([...logs]);
    setEvalSummary(`Grade: ${grade} (${finalPct}%)`);
    setEvalRunning(false);
  }

  // Cost savings based on popular LLM input pricing (per 1M tokens)
  // Input pricing per 1M tokens (latest 2026 models)
  const LLM_PRICES: Record<string, number> = {
    'GPT-5.4 Pro': 30, 'Claude Opus 4.6': 5, 'GPT-5.4': 2.5, 'Gemini 3 Pro': 2,
  };
  function calcSaved(tokens: number) {
    return Object.entries(LLM_PRICES).map(([name, price]) => ({
      name, saved: (tokens * price / 1_000_000),
    }));
  }

  function copyEncoded() {
    if (encoded) navigator.clipboard.writeText(encoded);
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #00e676)', color: '#0a0a0f' }}>T$</div>
          <span className="text-sm font-bold tracking-wider" style={{ color: '#a29bfe' }}>TokenSave</span>
          <span className="text-xs ml-2" style={{ color: '#8888aa' }}>-- Compress text before sending to expensive LLMs</span>
        </div>
        {encCount > 0 && (
          <div className="flex gap-4 items-center">
            <span className="text-xs" style={{ color: '#8888aa' }}>
              Saved <b style={{ color: '#00e676' }}>{cumSaved.toLocaleString()}</b> tokens | <b style={{ color: '#00e676' }}>{(cumIn / cumOut).toFixed(1)}x</b> avg
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.15)', color: '#00e676', fontWeight: 'bold' }}>
              ~${(cumSaved * 30 / 1_000_000).toFixed(4)} saved (GPT-5.4 Pro)
            </span>
          </div>
        )}
      </header>

      {/* Main panels */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Input panel */}
        <div className="flex flex-col overflow-hidden" style={{ borderRight: '1px solid #2a2a3a' }}>
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <span className="text-xs tracking-widest" style={{ color: '#8888aa' }}>PASTE YOUR TEXT</span>
            <span className="flex gap-1.5">
              <button onClick={() => loadSample('en')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>EN Demo</button>
              <button onClick={() => loadSample('zh')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>ZH Demo</button>
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste any text here -- meeting notes, contracts, reports, emails...&#10;&#10;Then click COMPRESS to shrink it down to a fraction of the tokens.&#10;Send the compressed version to GPT-4, Claude, Gemini, etc."
              className="w-full h-full resize-none outline-none p-3"
              style={{ background: 'transparent', border: 'none', color: '#e0e0e8', fontFamily: 'inherit', fontSize: '11px', lineHeight: 1.7 }}
            />
          </div>
          <div className="flex gap-1.5 px-3.5 py-2" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
            <button onClick={encode} disabled={encoding || !input.trim()}
              className="px-5 py-1.5 text-xs cursor-pointer tracking-wider font-bold"
              style={{ background: encoding ? '#2a2a3a' : 'linear-gradient(135deg, #6c5ce7, #a29bfe)', color: '#fff', border: 'none', fontFamily: 'inherit', opacity: !input.trim() ? 0.3 : 1 }}>
              {encoding ? <><span className="spinner" />COMPRESSING...</> : 'COMPRESS'}
            </button>
            <button onClick={() => { setInput(''); setEncoded(''); setStats(null); setEvalLog([]); setEvalSummary(''); setCodecAnswer(''); setRawAnswer(''); }}
              className="px-3 py-1.5 text-xs cursor-pointer"
              style={{ background: 'transparent', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>CLEAR</button>
            {input && <span className="text-xs self-center ml-2" style={{ color: '#8888aa' }}>{estimateTokens(input).toLocaleString()} tokens</span>}
          </div>
        </div>

        {/* Output panel */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <span className="text-xs tracking-widest" style={{ color: '#8888aa' }}>COMPRESSED OUTPUT</span>
            {encoded && (
              <button onClick={copyEncoded} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#00e676', fontFamily: 'inherit' }}>COPY</button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {encoded ? (
              <pre className="p-3 whitespace-pre-wrap break-all" style={{ fontSize: '11px', lineHeight: 1.6, color: '#00e676', opacity: 0.9 }}>
                {encoded}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center" style={{ color: '#8888aa', opacity: 0.3 }}>
                <div style={{ fontSize: '28px' }}>T$</div>
                <div className="text-xs">Paste text on the left and click COMPRESS</div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="flex flex-col gap-1.5 px-3.5 py-2" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
              <div className="flex gap-4 flex-wrap items-center">
                <span className="text-xs" style={{ color: '#8888aa' }}>
                  <b style={{ color: '#a29bfe' }}>{stats.inTok.toLocaleString()}</b> tok
                  <span style={{ color: '#6c5ce7' }}>{' → '}</span>
                  <b style={{ color: '#00e676' }}>{stats.outTok.toLocaleString()}</b> tok
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', fontSize: '13px' }}>
                  {stats.ratio}x compression
                </span>
                <span className="text-xs" style={{ color: '#8888aa' }}>{stats.time}s</span>
              </div>
              <div className="flex gap-3 flex-wrap items-center">
                <span className="text-xs" style={{ color: '#8888aa' }}>Cost saved per call:</span>
                {calcSaved(stats.saved).map(({ name, saved }) => (
                  <span key={name} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: saved > 0.001 ? '#00e676' : '#8888aa' }}>
                    {name} <b>${saved < 0.0001 ? '<0.01' : saved < 0.01 ? saved.toFixed(4) : saved.toFixed(3)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Savings projection */}
          {stats && (
            <div className="flex gap-3 flex-wrap items-center px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: 'rgba(0,230,118,0.03)' }}>
              <span className="text-xs font-bold" style={{ color: '#00e676' }}>If you send {stats.ratio}x less tokens:</span>
              {[100, 1000, 10000].map(n => {
                const saved54pro = (stats.saved * n * 30 / 1_000_000);
                return (
                  <span key={n} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.08)', color: '#00e676' }}>
                    {n.toLocaleString()} calls = <b>${saved54pro < 1 ? saved54pro.toFixed(2) : saved54pro.toFixed(1)}</b>
                  </span>
                );
              })}
              <span className="text-xs" style={{ color: '#8888aa' }}>(GPT-5.4 Pro $30/M input)</span>
            </div>
          )}

          {/* Query section */}
          {encoded && (
            <>
              <div className="flex" style={{ borderTop: '1px solid #2a2a3a' }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder="Test quality: ask a question about the original text..."
                  className="flex-1 px-3 py-2 outline-none"
                  style={{ background: '#1a1a26', border: 'none', color: '#e0e0e8', fontFamily: 'inherit', fontSize: '11px' }}
                />
                <button onClick={handleQuery} disabled={querying} className="px-3 py-2 text-xs cursor-pointer"
                  style={{ background: '#6c5ce7', color: '#fff', border: 'none', fontFamily: 'inherit', opacity: querying ? 0.3 : 1 }}>TEST</button>
              </div>

              {(codecAnswer || rawAnswer) && (
                <div className="grid grid-cols-2 max-h-40 overflow-auto" style={{ borderTop: '1px solid #2a2a3a' }}>
                  <div className="p-2" style={{ borderRight: '1px solid #2a2a3a' }}>
                    <div className="tracking-widest mb-1" style={{ color: '#8888aa', textTransform: 'uppercase', fontSize: '8px' }}>From compressed</div>
                    <div className="text-xs whitespace-pre-wrap" style={{ color: '#00e676' }}>{codecAnswer}</div>
                  </div>
                  <div className="p-2">
                    <div className="tracking-widest mb-1" style={{ color: '#8888aa', textTransform: 'uppercase', fontSize: '8px' }}>From original</div>
                    <div className="text-xs whitespace-pre-wrap" style={{ color: '#ffab40' }}>{rawAnswer}</div>
                  </div>
                </div>
              )}

              {/* Eval */}
              <div className="flex items-center gap-2 px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
                <button onClick={() => runEval()} disabled={evalRunning}
                  className="px-3 py-1 text-xs cursor-pointer"
                  style={{ background: '#6c5ce7', color: '#fff', border: 'none', fontFamily: 'inherit', opacity: evalRunning ? 0.3 : 1 }}>
                  {evalRunning ? <><span className="spinner" />EVALUATING...</> : 'EVALUATE QUALITY'}
                </button>
                <span className="text-xs" style={{ color: '#8888aa' }}>{evalSummary}</span>
              </div>

              {evalLog.length > 0 && (
                <div ref={logRef} className="max-h-52 overflow-auto px-3.5 py-2" style={{ borderTop: '1px solid #2a2a3a', fontSize: '10px', lineHeight: 1.8 }}>
                  {evalLog.map((l, i) => {
                    let color = '#8888aa';
                    let text = l;
                    if (l.includes('text-green')) { color = '#00e676'; text = l.replace('text-green ', ''); }
                    else if (l.includes('text-orange')) { color = '#ffab40'; text = l.replace('text-orange ', ''); }
                    else if (l.includes('text-red')) { color = '#ff5252'; text = l.replace('text-red ', ''); }
                    else if (l.startsWith('SCORE:')) { color = '#a29bfe'; }
                    return <div key={i} style={{ color }}>{text}</div>;
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
