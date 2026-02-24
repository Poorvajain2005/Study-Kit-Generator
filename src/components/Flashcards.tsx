import { useState } from 'react';
import { FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Flashcard } from '../types';

interface Props {
  flashcards: Flashcard[];
}

export function Flashcards({ flashcards }: Props) {
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Flashcards</h2>
        <p className="text-gray-500 text-center py-8">No flashcards generated yet</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Flashcards ({currentIndex + 1}/{flashcards.length})
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <FileDown size={16} />
          Export CSV
        </button>
      </div>

      <div className="space-y-4">
        <div
          onClick={() => setFlipped(!flipped)}
          className="min-h-[200px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center"
        >
          <div className="text-center">
            {!flipped ? (
              <>
                <p className="text-xs text-gray-500 mb-2">QUESTION</p>
                <p className="text-lg text-gray-900">{currentCard.question}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">ANSWER</p>
                <p className="text-lg text-gray-900">{currentCard.answer}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={prevCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <button
            onClick={() => setFlipped(!flipped)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Flip Card
          </button>

          <button
            onClick={nextCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
