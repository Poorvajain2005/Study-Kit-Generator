import { useState } from 'react';
import { FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Flashcard } from '../types';

interface Props {
  flashcards: Flashcard[];
  darkMode: boolean;
}

export function Flashcards({ flashcards, darkMode }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleExport = () => {
    const csv = 'Question,Answer\n' +
      flashcards.map(card =>
        `"${card.question.replace(/"/g, '""')}","${card.answer.replace(/"/g, '""')}"`
      ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900/40 border-slate-700/70' : 'bg-white/90 border-slate-200'}`}>
        <h2 className={`mb-4 text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>Flashcards</h2>
        <p className={`py-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No flashcards generated yet</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const cardTone = darkMode
    ? 'bg-slate-900/40 border-slate-700/70 text-slate-100'
    : 'bg-white/90 border-slate-200 text-slate-900';

  return (
    <div className={`rounded-2xl border p-6 ${cardTone}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
          Flashcards ({currentIndex + 1}/{flashcards.length})
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
        >
          <FileDown size={16} />
          Export CSV
        </button>
      </div>

      <div className="space-y-4">
        <div
          onClick={() => setFlipped(!flipped)}
          className={`flex min-h-[220px] cursor-pointer items-center justify-center rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
            darkMode
              ? 'border-slate-700/80 bg-gradient-to-br from-slate-900/70 to-indigo-950/40'
              : 'border-slate-200 bg-gradient-to-br from-cyan-50 to-indigo-50'
          }`}
        >
          <div className="text-center">
            {!flipped ? (
              <>
                <p className={`mb-2 text-xs tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>QUESTION</p>
                <p className="text-lg font-medium leading-relaxed">{currentCard.question}</p>
              </>
            ) : (
              <>
                <p className={`mb-2 text-xs tracking-[0.18em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ANSWER</p>
                <p className="text-lg font-medium leading-relaxed">{currentCard.answer}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={prevCard}
            disabled={flashcards.length <= 1}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
              darkMode
                ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <button
            onClick={() => setFlipped(!flipped)}
            className="rounded-xl border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-blue-300 transition-all duration-300 hover:-translate-y-0.5"
          >
            Flip Card
          </button>

          <button
            onClick={nextCard}
            disabled={flashcards.length <= 1}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
              darkMode
                ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
