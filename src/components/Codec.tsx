import { useState, useRef, useCallback } from 'react';
import { estimateTokens } from '../lib/tokens';
import { llm } from '../lib/llm';
import { ENC_PROMPTS, SAMPLE_EN, SAMPLE_ZH } from '../lib/codebook';
interface Stats {
  inTok: number; outTok: number; ratio: string; saved: number; time: string;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Plain text files
  if (['txt', 'md', 'csv', 'json', 'xml', 'html', 'log', 'rst', 'tex'].includes(ext)) {
    return file.text();
  }

  // PDF - dynamic import
  if (ext === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(' '));
    }
    return pages.join('\n\n');
  }

  // DOCX - dynamic import
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }

  // Fallback: try as text
  try {
    return await file.text();
  } catch {
    throw new Error(`Unsupported file type: .${ext}`);
  }
}

export default function Codec() {
  const [input, setInput] = useState('');
  const [encoded, setEncoded] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [encoding, setEncoding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cumulative
  const [cumIn, setCumIn] = useState(0);
  const [cumOut, setCumOut] = useState(0);
  const [cumSaved, setCumSaved] = useState(0);
  const [encCount, setEncCount] = useState(0);

  function loadSample(lang: 'en' | 'zh') {
    setInput(lang === 'en' ? SAMPLE_EN : SAMPLE_ZH);
    setFileName('');
  }

  const handleFile = useCallback(async (file: File) => {
    try {
      const text = await extractText(file);
      if (text.trim()) {
        setInput(text);
        setFileName(file.name);
      } else {
        setInput('(Empty file or could not extract text)');
      }
    } catch (e: any) {
      setInput('Error reading file: ' + e.message);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function encode() {
    const t = input.trim();
    if (!t || encoding) return;
    setEncoding(true);
    setEncoded('');
    setStats(null);
    setCopied(false);

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
    } catch (e: any) {
      setEncoded('Error: ' + e.message);
    } finally {
      setEncoding(false);
    }
  }

  function copyEncoded() {
    if (encoded) {
      navigator.clipboard.writeText(encoded);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function fmtDollar(n: number) {
    if (n >= 1) return '$' + n.toFixed(1);
    if (n >= 0.01) return '$' + n.toFixed(2);
    return '$' + n.toFixed(4);
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
          <div className="flex gap-3 items-center">
            <span className="text-xs" style={{ color: '#8888aa' }}>
              Session: <b style={{ color: '#00e676' }}>{encCount}</b> compresses |
              <b style={{ color: '#00e676' }}> {cumSaved.toLocaleString()}</b> tokens saved |
              <b style={{ color: '#00e676' }}> {(cumIn / cumOut).toFixed(1)}x</b> avg
            </span>
          </div>
        )}
      </header>

      {/* Main panels */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Input panel */}
        <div className="flex flex-col overflow-hidden" style={{ borderRight: '1px solid #2a2a3a' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}>
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-widest" style={{ color: '#8888aa' }}>PASTE OR DROP FILE</span>
              {fileName && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#a29bfe' }}>{fileName}</span>}
            </div>
            <span className="flex gap-1.5">
              <button onClick={() => fileInputRef.current?.click()} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#a29bfe', fontFamily: 'inherit' }}>OPEN FILE</button>
              <button onClick={() => loadSample('en')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>EN Demo</button>
              <button onClick={() => loadSample('zh')} className="text-xs px-2 py-0.5 cursor-pointer"
                style={{ background: '#1a1a26', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>ZH Demo</button>
            </span>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx,.csv,.json,.xml,.html,.log,.rst,.tex" onChange={handleFileInput} style={{ display: 'none' }} />
          </div>
          <div className="flex-1 overflow-auto relative">
            {dragging && (
              <div className="absolute inset-0 flex items-center justify-center z-10"
                style={{ background: 'rgba(108,92,231,0.15)', border: '2px dashed #6c5ce7' }}>
                <div className="text-center">
                  <div style={{ fontSize: '24px', color: '#a29bfe' }}>Drop file here</div>
                  <div className="text-xs mt-1" style={{ color: '#8888aa' }}>.txt .md .pdf .docx .csv .json</div>
                </div>
              </div>
            )}
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setFileName(''); }}
              placeholder="Paste text or drag & drop a file here...&#10;&#10;Supports: .txt .md .pdf .docx .csv .json .html&#10;&#10;Then click COMPRESS to shrink it down to a fraction of the tokens.&#10;Send the compressed version to GPT-4, Claude, Gemini, etc."
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
            <button onClick={() => { setInput(''); setEncoded(''); setStats(null); setFileName(''); }}
              className="px-3 py-1.5 text-xs cursor-pointer"
              style={{ background: 'transparent', border: '1px solid #2a2a3a', color: '#8888aa', fontFamily: 'inherit' }}>CLEAR</button>
            {input && <span className="text-xs self-center ml-2" style={{ color: '#8888aa' }}>{estimateTokens(input).toLocaleString()} tokens</span>}
          </div>
        </div>

        {/* Output panel */}
        <div className="flex flex-col overflow-hidden">
          {/* Hero stats banner */}
          {stats && (
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,230,118,0.1))', borderBottom: '1px solid #2a2a3a' }}>
              <div className="flex items-center gap-5">
                {/* Big compression ratio */}
                <div className="flex flex-col items-center">
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#00e676', lineHeight: 1 }}>{stats.ratio}x</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8888aa' }}>compression</div>
                </div>
                {/* Divider */}
                <div style={{ width: 1, height: 40, background: '#2a2a3a' }} />
                {/* Token reduction */}
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#a29bfe' }}>{stats.inTok.toLocaleString()}</span>
                    <span style={{ fontSize: '14px', color: '#6c5ce7' }}>&rarr;</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#00e676' }}>{stats.outTok.toLocaleString()}</span>
                    <span className="text-xs" style={{ color: '#8888aa' }}>tokens</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
                    <b style={{ color: '#00e676' }}>{stats.saved.toLocaleString()}</b> tokens saved in {stats.time}s
                  </div>
                </div>
                {/* Divider */}
                <div style={{ width: 1, height: 40, background: '#2a2a3a' }} />
                {/* Money saved */}
                <div className="flex flex-col">
                  <div className="text-xs mb-1" style={{ color: '#8888aa' }}>You save per call:</div>
                  <div className="flex gap-2 flex-wrap">
                    {([['GPT-5.4 Pro', 30], ['Opus 4.6', 5], ['GPT-5.4', 2.5]] as [string, number][]).map(([name, price]) => (
                      <span key={name} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', fontWeight: 600 }}>
                        {name} {fmtDollar(stats.saved * price / 1_000_000)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compressed output */}
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <span className="text-xs tracking-widest" style={{ color: '#8888aa' }}>COMPRESSED OUTPUT</span>
            {encoded && (
              <button onClick={copyEncoded} className="text-xs px-3 py-1 cursor-pointer font-bold tracking-wider"
                style={{ background: copied ? '#00e676' : 'linear-gradient(135deg, #6c5ce7, #00e676)', color: copied ? '#0a0a0f' : '#fff', border: 'none', fontFamily: 'inherit', borderRadius: 3 }}>
                {copied ? 'COPIED' : 'COPY'}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {encoded ? (
              <pre className="p-3 whitespace-pre-wrap break-all" style={{ fontSize: '11px', lineHeight: 1.6, color: '#00e676', opacity: 0.9 }}>
                {encoded}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center" style={{ color: '#8888aa', opacity: 0.4 }}>
                <div style={{ fontSize: '32px' }}>T$</div>
                <div className="text-xs">Paste text on the left and click COMPRESS</div>
              </div>
            )}
          </div>

          {/* Volume projection bar */}
          {stats && (
            <div className="flex gap-3 flex-wrap items-center px-3.5 py-2" style={{ borderTop: '1px solid #2a2a3a', background: '#12121a' }}>
              <span className="text-xs font-bold" style={{ color: '#a29bfe' }}>At scale (GPT-5.4 Pro):</span>
              {[100, 1000, 10000, 100000].map(n => {
                const s = stats.saved * n * 30 / 1_000_000;
                return (
                  <span key={n} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.08)', color: '#00e676' }}>
                    {n >= 1000 ? (n / 1000) + 'K' : n} calls <b>{fmtDollar(s)}</b>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
