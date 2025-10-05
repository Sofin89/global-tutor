
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, RotateCcw, Shuffle, 
  Bookmark, BookmarkCheck, Plus, Brain, Star,
  CheckCircle, XCircle, Clock
} from 'lucide-react';

const Flashcards = ({ topic, onBack }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    viewed: 0,
    mastered: 0,
    timeSpent: 0
  });
  const [bookmarked, setBookmarked] = useState(new Set());

  useEffect(() => {
    if (topic) {
      generateFlashcards(topic);
    }
  }, [topic]);

  const generateFlashcards = async (selectedTopic) => {
    setIsLoading(true);
    try {
      // Simulate API call to generate flashcards
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, count: 10 })
      });
      const data = await response.json();
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      // Fallback data
      setFlashcards(generateFallbackFlashcards(selectedTopic));
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackFlashcards = (selectedTopic) => {
    const topics = {
      'Biology': [
        { front: 'What is photosynthesis?', back: 'The process by which plants convert light energy into chemical energy to produce food.' },
        { front: 'Define mitosis', back: 'Cell division process that results in two identical daughter cells.' },
        { front: 'What are enzymes?', back: 'Biological catalysts that speed up chemical reactions in living organisms.' }
      ],
      'Chemistry': [
        { front: 'What is the periodic table?', back: 'A tabular arrangement of chemical elements organized by atomic number and properties.' },
        { front: 'Define molarity', back: 'The number of moles of solute per liter of solution.' },
        { front: 'What is a covalent bond?', back: 'A chemical bond that involves sharing electron pairs between atoms.' }
      ],
      'Physics': [
        { front: "Newton's First Law", back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.' },
        { front: 'Define velocity', back: 'The speed of an object in a particular direction.' },
        { front: 'What is kinetic energy?', back: 'Energy possessed by an object due to its motion.' }
      ]
    };

    return topics[selectedTopic] || [
      { front: 'Sample Question', back: 'Sample Answer' }
    ];
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setSessionStats(prev => ({ ...prev, viewed: prev.viewed + 1 }));
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const toggleBookmark = (index) => {
    const newBookmarked = new Set(bookmarked);
    if (newBookmarked.has(index)) {
      newBookmarked.delete(index);
    } else {
      newBookmarked.add(index);
    }
    setBookmarked(newBookmarked);
  };

  const markAsMastered = (index) => {
    const updatedCards = flashcards.map((card, i) => 
      i === index ? { ...card, mastered: true } : card
    );
    setFlashcards(updatedCards);
    setSessionStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));
  };

  const currentCard = flashcards[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900">Generating Smart Flashcards...</h2>
          <p className="text-gray-600 mt-2">AI is creating personalized flashcards for {topic}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Smart Flashcards</h1>
            <p className="text-gray-600 mt-2">Master {topic} with AI-powered flashcards</p>
          </div>
          
          {/* Session Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{sessionStats.viewed}</div>
              <div className="text-gray-600">Viewed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{sessionStats.mastered}</div>
              <div className="text-gray-600">Mastered</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{flashcards.length}</div>
              <div className="text-gray-600">Total</div>
            </div>
          </div>
        </motion.div>

        {flashcards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center bg-white rounded-xl shadow-lg p-12"
          >
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Flashcards Generated</h2>
            <p className="text-gray-600 mb-6">Select a topic to generate AI-powered flashcards</p>
            <button
              onClick={() => generateFlashcards(topic)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Generate Flashcards
            </button>
          </motion.div>
        ) : (
          <>
            {/* Flashcard */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <div 
                className="relative h-96 cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="relative w-full h-full preserve-3d"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Front of Card */}
                  <div className="absolute inset-0 w-full h-full backface-hidden">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          Question
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(currentIndex);
                          }}
                          className="text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          {bookmarked.has(currentIndex) ? (
                            <BookmarkCheck className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <Bookmark className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      <div className="text-center flex-1 flex items-center justify-center">
                        <h2 className="text-2xl font-semibold text-gray-900 leading-relaxed">
                          {currentCard.front}
                        </h2>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500">Click to reveal answer</p>
                      </div>
                    </div>
                  </div>

                  {/* Back of Card */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 h-full flex flex-col justify-between text-white">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                          Answer
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsMastered(currentIndex);
                            }}
                            className={`p-1 rounded-lg transition-colors ${
                              currentCard.mastered 
                                ? 'bg-green-500' 
                                : 'bg-white/20 hover:bg-white/30'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(currentIndex);
                            }}
                            className="bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors"
                          >
                            {bookmarked.has(currentIndex) ? (
                              <BookmarkCheck className="w-4 h-4 text-yellow-300" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-center flex-1 flex items-center justify-center">
                        <p className="text-xl leading-relaxed">
                          {currentCard.back}
                        </p>
                      </div>

                      <div className="text-center opacity-80">
                        <p className="text-sm">Click to see question</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Card Progress */}
              <div className="flex justify-center mt-4 mb-8">
                <div className="flex gap-1">
                  {flashcards.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-1 rounded-full transition-colors ${
                        index === currentIndex
                          ? 'bg-blue-600'
                          : index < currentIndex
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center items-center gap-4"
            >
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="p-3 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-6 py-3 bg-white shadow-lg rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {isFlipped ? 'Show Question' : 'Show Answer'}
              </button>

              <button
                onClick={shuffleCards}
                className="px-6 py-3 bg-white shadow-lg rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </button>

              <button
                onClick={nextCard}
                disabled={currentIndex === flashcards.length - 1}
                className="p-3 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </motion.div>

            {/* Progress Summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 bg-white rounded-xl shadow-lg p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Session Progress</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((currentIndex + 1) / flashcards.length * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Completion</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {sessionStats.mastered}
                  </div>
                  <div className="text-sm text-gray-600">Mastered</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {bookmarked.size}
                  </div>
                  <div className="text-sm text-gray-600">Bookmarked</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Flashcards;