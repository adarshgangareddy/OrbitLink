import { useState } from 'react';
import {
  Bot,
  Send,
  BookOpen,
  Wrench,
} from 'lucide-react';
import type { AssistantQueryResponse } from '../../types';

interface GroundedAssistantViewProps {
  onQuery: (question: string) => Promise<AssistantQueryResponse>;
  loading?: boolean;
}

export function GroundedAssistantView({ onQuery, loading = false }: GroundedAssistantViewProps) {
  const [inputQuestion, setInputQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [conversation, setConversation] = useState<Array<{ q: string; a: AssistantQueryResponse }>>([]);

  const promptChips = [
    'Why was my connection unstable yesterday?',
    'Could my household use a cheaper plan?',
    'When is the best time to schedule a large download?',
    'How was this cost or energy estimate calculated?',
    'Which optimization should I try first?',
  ];

  const handleSubmit = async (qText: string) => {
    if (!qText.trim() || asking) return;
    setAsking(true);
    try {
      const res = await onQuery(qText.trim());
      setConversation((prev) => [...prev, { q: qText.trim(), a: res }]);
      setInputQuestion('');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Grounded AI Diagnostic Assistant & RAG
              </h2>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                ZERO FABRICATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tied strictly to deterministic backend tools and verified networking documentation with verifiable citations.
            </p>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Verified Investigation Queries:</p>
          <div className="flex flex-wrap gap-2">
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputQuestion(chip);
                  handleSubmit(chip);
                }}
                disabled={asking}
                className="text-xs text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl transition-all text-left disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(inputQuestion);
          }}
          className="mt-5 flex gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask a technical network question (e.g. Could I use a cheaper plan?)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            disabled={asking}
          />
          <button
            type="submit"
            disabled={asking || !inputQuestion.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{asking ? 'Analyzing...' : 'Ask AI'}</span>
          </button>
        </form>
      </div>

      {/* Conversation / Query Results History */}
      <div className="space-y-5">
        {conversation.map((item, cIdx) => (
          <div
            key={cIdx}
            className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn"
          >
            {/* User Question */}
            <div className="flex items-start space-x-3 pb-3 border-b border-slate-800/80">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">
                YOU
              </span>
              <p className="text-sm font-semibold text-white">{item.q}</p>
            </div>

            {/* AI Grounded Answer */}
            <div className="flex items-start space-x-3">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                ORBITLINK AI
              </span>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-slate-200 leading-relaxed">{item.a.answer}</p>

                {/* Grounded Evidence Facts */}
                {item.a.grounded_facts.length > 0 && (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Observed Telemetry Evidence:
                    </span>
                    <ul className="space-y-0.5 list-disc list-inside text-slate-300">
                      {item.a.grounded_facts.map((gf, gIdx) => (
                        <li key={gIdx}>{gf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Executed Tools & Citations Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  {/* Tools Executed */}
                  {item.a.tools_executed.length > 0 && (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold mb-1">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Executed Backend Tools:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.a.tools_executed.map((tool, tIdx) => (
                          <span
                            key={tIdx}
                            className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                          >
                            {tool}()
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Citations */}
                  {item.a.citations.length > 0 && (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Verifiable Document Citations:</span>
                      </div>
                      <div className="space-y-1.5 mt-1">
                        {item.a.citations.map((cite, ciIdx) => (
                          <div key={ciIdx} className="text-[11px] text-slate-400">
                            <p className="font-semibold text-slate-300">• {cite.source_title}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {cite.section} (Indexed: {cite.retrieval_date})
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
