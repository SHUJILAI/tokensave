export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(108,92,231,0.15) 0%, #0a0a0f 60%)' }}>

      {/* Logo */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
          style={{ background: 'linear-gradient(135deg, #6c5ce7, #00e676)', color: '#0a0a0f' }}>
          T$
        </div>
        <span className="text-2xl font-bold tracking-wider" style={{ color: '#a29bfe' }}>
          TokenSave
        </span>
      </div>

      {/* Hero */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 leading-tight">
        <span style={{ color: '#e0e0e8' }}>Save up to </span>
        <span style={{
          background: 'linear-gradient(90deg, #6c5ce7, #00e676)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>33x</span>
        <span style={{ color: '#e0e0e8' }}> on LLM costs</span>
      </h1>

      <p className="text-center mb-8 max-w-lg leading-relaxed" style={{ color: '#8888aa', fontSize: '13px' }}>
        Compress your text with AI-native semantic encoding before sending to
        expensive models like GPT-4, Claude Opus, or Gemini Pro.
        Same answers, fraction of the tokens.
      </p>

      {/* Stats row */}
      <div className="flex gap-8 mb-10">
        {[
          { val: '33x', label: 'Max compression' },
          { val: '94%', label: 'Quality retained' },
          { val: '7', label: 'Compression modes' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#00e676' }}>{s.val}</div>
            <div className="text-xs mt-1" style={{ color: '#8888aa' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={onStart}
        className="px-8 py-3 rounded-lg font-bold text-sm tracking-wider cursor-pointer transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 0 30px rgba(108,92,231,0.4)',
        }}>
        START COMPRESSING
      </button>

      {/* How it works */}
      <div className="mt-16 max-w-2xl w-full">
        <h2 className="text-center text-xs tracking-widest mb-6" style={{ color: '#8888aa' }}>
          HOW IT WORKS
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Paste text', desc: 'Meeting notes, contracts, reports -- any text.' },
            { step: '02', title: 'Encode', desc: 'SMC4 codebook compresses to compact template calls.' },
            { step: '03', title: 'Use with AI', desc: 'Send compressed text to any LLM. Same quality, fewer tokens.' },
          ].map((s) => (
            <div key={s.step} className="p-4 rounded-lg" style={{ background: '#12121a', border: '1px solid #2a2a3a' }}>
              <div className="text-lg font-bold mb-1" style={{ color: '#6c5ce7' }}>{s.step}</div>
              <div className="text-xs font-bold mb-1" style={{ color: '#e0e0e8' }}>{s.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: '#8888aa' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-xs" style={{ color: '#2a2a3a' }}>
        Powered by SMC4 Semantic Codec Engine
      </div>
    </div>
  );
}
