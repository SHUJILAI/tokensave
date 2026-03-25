import { useState, useRef } from 'react';
import { estimateTokens } from '../lib/tokens';
import { llm } from '../lib/llm';
import {
  MODES, ENC_PROMPTS, DEC_PROMPT, DEC_APEX_PROMPT, JUDGE_PROMPT,
  EVAL_EN, EVAL_ZH, SAMPLE_EN, SAMPLE_ZH,
  type Mode,
} from '../lib/codebook';

interface Stats {
  inTok: number; outTok: number; ratio: string; saved: number;
  time: string; eTok: number; nTok: number; cTok: number; calls: number;
}

export default function Codec({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('balanced');
  const [input, setInput] = useState('');
  const [encoded, setEncoded] = useState('');
  const [rawText, setRawText] = useState('');
  const [encMode, setEncMode] = useState<Mode>('balanced');
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

    const t0 = performance.now();
    const prompt = ENC_PROMPTS[mode];
    try {
      const enc = await llm([{ role: 'system', content: prompt }, { role: 'user', content: t }], 8192);
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setEncoded(enc);
      setEncMode(mode);

      const it = estimateTokens(t), ot = estimateTokens(enc);
      const rt = (it / ot).toFixed(1);

      // Breakdown
      const lines = enc.split('\n');
      let eTok = 0, nTok = 0, cTok = 0, sepSeen = false, callCount = 0;
      for (const ln of lines) {
        const s = ln.trim();
        if (!s) continue;
        if (s === '---') { sepSeen = true; continue; }
        const tok = estimateTokens(s);
        if (!sepSeen && s.startsWith('E:')) eTok += tok;
        else if (!sepSeen && s.startsWith('N:')) nTok += tok;
        else if (sepSeen) {
          cTok += tok;
          const sep = mode === 'apex' ? /\|/g : /;/g;
          callCount += 1 + (s.match(sep) || []).length;
        }
      }

      setStats({ inTok: it, outTok: ot, ratio: rt, saved: it - ot, time: elapsed, eTok, nTok, cTok, calls: callCount });

      // Cumulative
      setCumIn(p => p + it);
      setCumOut(p => p + ot);
      setCumSaved(p => p + (it - ot));
      setEncCount(p => p + 1);

      // Auto-eval
      setTimeout(() => runEval(enc, t, mode), 100);
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
      const decPrompt = encMode === 'apex' ? DEC_APEX_PROMPT : DEC_PROMPT;
      const [c, r] = await Promise.all([
        llm([{ role: 'system', content: decPrompt }, { role: 'user', content: 'ENCODED:\n' + encoded + '\n\nQ: ' + q }], 2048),
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

  async function runEval(enc?: string, raw?: string, m?: Mode) {
    const e = enc || encoded, r = raw || rawText, md = m || encMode;
    if (!e || !r || evalRunning) return;
    setEvalRunning(true);
    setEvalLog([]);
    setEvalSummary('');

    const eqs = curLang === 'en' ? EVAL_EN : EVAL_ZH;
    let totalHit = 0, totalFacts = 0;
    const logs: string[] = [];

    for (let i = 0; i < eqs.length; i++) {
      const { q, facts } = eqs[i];
      setEvalSummary(`${i + 1}/${eqs.length}...`);
      logs.push(`Q${i + 1}: ${q}`);
      setEvalLog([...logs]);

      try {
        const decPrompt = md === 'apex' ? DEC_APEX_PROMPT : DEC_PROMPT;
        const ans = await llm([{ role: 'system', content: decPrompt }, { role: 'user', content: 'ENCODED:\n' + e + '\n\nQ: ' + q }], 1024);
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
    logs.push(`SCORE: ${totalHit}/${totalFacts} (${finalPct}%) | Grade: ${grade} | Compression: ${ratioStr} | Mode: ${md.toUpperCase()}`);
    setEvalLog([...logs]);
    setEvalSummary(`Grade: ${grade} (${finalPct}%)`);
    setEvalRunning(false);
  }

  const pctE = stats && stats.outTok ? Math.round(stats.eTok / stats.outTok * 100) : 0;
  const pctN = stats && stats.outTok ? Math.round(stats.nTok / stats.outTok * 100) : 0;
  const pctC = stats && stats.outTok ? Math.round(stats.cTok / stats.outTok * 100) : 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-xs px-2 py-1 cursor-pointer" style={{ background: 'none', border: '1px solid #2a2a3a', color: '#8888aa' }}>
            BACK
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6c5ce7, #00e676)', color: '#0a0a0f' }}>T$</div>
            <span className="text-sm font-bold tracking-wider" style={{ color: '#a29bfe' }}>TokenSave</span>
          </div>
        </div>
        <div className="flex gap-1">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="text-xs px-2.5 py-1 cursor-pointer transition-all"
              style={{
                background: mode === m.id ? '#1a1a2a' : '#1a1a26',
                border: `1px solid ${mode === m.id ? (m.color || '#6c5ce7') : '#2a2a3a'}`,
                color: mode === m.id ? (m.color || '#a29bfe') : '#8888aa',
                fontFamily: 'inherit',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main panels */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Input panel */}
        <div className="flex flex-col overflow-hidden" style={{ borderRight: '1px solid #2a2a3a' }}>
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <span className="text-xs tracking-widest" style={{ color: '#8888aa', textTransform: 'uppercase' }}>Raw Input</span>
            <span className="flex gap-1.5">
              <button onClick={() => loadSample('en')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>EN Sample</button>
              <button onClick={() => loadSample('zh')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>ZH Sample</button>
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste any text here (English or Chinese)..."
              className="w-full h-full resize-none outline-none p-3"
              style={{ background: 'transparent', border: 'none', color: '#e0e0e8', fontFamily: 'inherit', fontSize: '11px', lineHeight: 1.7 }}
            />
          </div>
          <div className="flex gap-1.5 px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
            <button onClick={encode} disabled={encoding}
              className="px-3 py-1 text-xs cursor-pointer tracking-wider"
              style={{ background: '#6c5ce7', color: '#fff', border: 'none', fontFamily: 'inherit', opacity: encoding ? 0.3 : 1 }}>
              {encoding ? <><span className="spinner" />ENCODING...</> : 'ENCODE'}
            </button>
            <button onClick={() => { setInput(''); setEncoded(''); setStats(null); setEvalLog([]); setEvalSummary(''); }}
              className="px-3 py-1 text-xs cursor-pointer"
              style={{ background: 'transparent', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>CLEAR</button>
          </div>
        </div>

        {/* Output panel */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <span className="text-xs tracking-widest" style={{ color: '#8888aa', textTransform: 'uppercase' }}>Codebook Output</span>
          </div>
          <div className="flex-1 overflow-auto">
            {encoded ? (
              <pre className="p-3 whitespace-pre-wrap break-all" style={{ fontSize: '11px', lineHeight: 1.6, color: '#00e676', opacity: 0.9 }}>
                {encoded}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: '#8888aa', opacity: 0.3 }}>
                Encoded output appears here
              </div>
            )}
          </div>

          {/* Stats bar */}
          {stats && (
            <>
              <div className="flex gap-3.5 flex-wrap px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
                <span className="text-xs" style={{ color: '#8888aa' }}>In: <b style={{ color: '#a29bfe' }}>{stats.inTok.toLocaleString()}</b> tok</span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Out: <b style={{ color: '#a29bfe' }}>{stats.outTok.toLocaleString()}</b> tok</span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Ratio: <b style={{ color: '#00e676', fontSize: '12px' }}>{stats.ratio}x</b></span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Saved: <b style={{ color: '#00e676' }}>{stats.saved.toLocaleString()}</b> tok</span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Time: <b style={{ color: '#a29bfe' }}>{stats.time}s</b></span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Mode: <b style={{ color: '#a29bfe' }}>{mode.toUpperCase()}</b></span>
              </div>

              {/* Cumulative */}
              {encCount > 0 && (
                <div className="flex gap-3.5 flex-wrap px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
                  <span className="text-xs" style={{ color: '#ffab40' }}>CUMULATIVE ({encCount} encodes):</span>
                  <span className="text-xs" style={{ color: '#8888aa' }}>In: <b style={{ color: '#ffab40' }}>{cumIn.toLocaleString()}</b></span>
                  <span className="text-xs" style={{ color: '#8888aa' }}>Out: <b style={{ color: '#ffab40' }}>{cumOut.toLocaleString()}</b></span>
                  <span className="text-xs" style={{ color: '#8888aa' }}>Saved: <b style={{ color: '#00e676' }}>{cumSaved.toLocaleString()}</b></span>
                  <span className="text-xs" style={{ color: '#8888aa' }}>Avg: <b style={{ color: '#00e676' }}>{(cumIn / cumOut).toFixed(1)}x</b></span>
                </div>
              )}

              {/* Breakdown */}
              <div className="flex gap-3.5 flex-wrap px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
                <span className="text-xs" style={{ color: '#ff79c6' }}>BREAKDOWN:</span>
                <span className="text-xs" style={{ color: '#8888aa' }}>E:dict <b style={{ color: '#ff79c6' }}>{stats.eTok} tok ({pctE}%)</b></span>
                <span className="text-xs" style={{ color: '#8888aa' }}>N:table <b style={{ color: '#ff79c6' }}>{stats.nTok} tok ({pctN}%)</b></span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Calls <b style={{ color: '#ff79c6' }}>{stats.cTok} tok ({pctC}%)</b></span>
                <span className="text-xs" style={{ color: '#8888aa' }}>Lines <b style={{ color: '#ff79c6' }}>{stats.calls} calls</b></span>
              </div>
              {/* Breakdown bar */}
              <div className="px-3.5 pb-1.5" style={{ background: '#12121a' }}>
                <div className="w-full h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1a1a26' }}>
                  <div style={{ width: pctE + '%', background: '#ff79c6', minWidth: pctE ? 1 : 0 }} />
                  <div style={{ width: pctN + '%', background: '#ffab40', minWidth: pctN ? 1 : 0 }} />
                  <div style={{ width: pctC + '%', background: '#00e676', minWidth: pctC ? 1 : 0 }} />
                </div>
              </div>
            </>
          )}

          {/* Query section */}
          {encoded && (
            <>
              <div className="flex" style={{ borderTop: '1px solid #2a2a3a' }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder="Ask a question about the original text..."
                  className="flex-1 px-3 py-2 outline-none"
                  style={{ background: '#1a1a26', border: 'none', color: '#e0e0e8', fontFamily: 'inherit', fontSize: '11px' }}
                />
                <button onClick={handleQuery} className="px-3 py-2 text-xs cursor-pointer"
                  style={{ background: '#6c5ce7', color: '#fff', border: 'none', fontFamily: 'inherit' }}>COMPARE</button>
              </div>

              {/* Compare grid */}
              {(codecAnswer || rawAnswer) && (
                <div className="grid grid-cols-2 max-h-48 overflow-auto" style={{ borderTop: '1px solid #2a2a3a' }}>
                  <div className="p-2" style={{ borderRight: '1px solid #2a2a3a' }}>
                    <div className="text-xs tracking-widest mb-1" style={{ color: '#8888aa', textTransform: 'uppercase', fontSize: '8px' }}>From Codebook (decoded)</div>
                    <div className="text-xs whitespace-pre-wrap" style={{ color: '#00e676' }}>{codecAnswer}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-xs tracking-widest mb-1" style={{ color: '#8888aa', textTransform: 'uppercase', fontSize: '8px' }}>From Raw (baseline)</div>
                    <div className="text-xs whitespace-pre-wrap" style={{ color: '#ffab40' }}>{rawAnswer}</div>
                  </div>
                </div>
              )}

              {/* Eval */}
              <div className="flex items-center gap-2 px-3.5 py-1.5" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
                <button onClick={() => runEval()} disabled={evalRunning}
                  className="px-3 py-1 text-xs cursor-pointer"
                  style={{ background: '#6c5ce7', color: '#fff', border: 'none', fontFamily: 'inherit', opacity: evalRunning ? 0.3 : 1 }}>
                  EVALUATE
                </button>
                <span className="text-xs" style={{ color: '#8888aa' }}>{evalSummary}</span>
              </div>

              {evalLog.length > 0 && (
                <div ref={logRef} className="max-h-64 overflow-auto px-3.5 py-2" style={{ borderTop: '1px solid #2a2a3a', fontSize: '10px', lineHeight: 1.8 }}>
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
