// services/flashcards-generator.js
const { v4: uuidv4 } = require('uuid');

class FlashcardsGenerator {
  constructor() {
    this.flashcardTypes = {
      'concept': this._generateConceptFlashcard.bind(this),
      'formula': this._generateFormulaFlashcard.bind(this),
      'definition': this._generateDefinitionFlashcard.bind(this),
      'example': this._generateExampleFlashcard.bind(this),
      'mnemonic': this._generateMnemonicFlashcard.bind(this)
    };
  }

  async generateFlashcards(topic, count = 10, types = ['concept', 'definition', 'example']) {
    try {
      const flashcards = [];
      const cardsPerType = Math.ceil(count / types.length);

      for (const type of types) {
        if (this.flashcardTypes[type]) {
          const typeFlashcards = await this.flashcardTypes[type](topic, cardsPerType);
          flashcards.push(...typeFlashcards);
        }
      }

      // Shuffle and limit to requested count
      const shuffled = this._shuffleArray(flashcards).slice(0, count);
      
      return {
        setId: uuidv4(),
        topic,
        totalCards: shuffled.length,
        types: types,
        flashcards: shuffled,
        generatedAt: new Date().toISOString(),
        estimatedStudyTime: this._calculateStudyTime(shuffled.length)
      };
    } catch (error) {
      console.error('Flashcard Generation Error:', error);
      return this._generateFallbackFlashcards(topic, count);
    }
  }

  async _generateConceptFlashcard(topic, count) {
    // This would integrate with LLaMA API in production
    const concepts = await this._extractKeyConcepts(topic, count);
    
    return concepts.map(concept => ({
      id: uuidv4(),
      type: 'concept',
      front: `Explain: ${concept}`,
      back: this._generateConceptExplanation(concept),
      difficulty: 'medium',
      tags: [topic, 'concept'],
      metadata: {
        source: 'AI Generated',
        confidence: 0.8
      }
    }));
  }

  async _generateFormulaFlashcard(topic, count) {
    const formulas = await this._extractFormulas(topic, count);
    
    return formulas.map(formula => ({
      id: uuidv4(),
      type: 'formula',
      front: `Formula: ${formula.expression}`,
      back: {
        description: formula.description,
        application: formula.application,
        example: formula.example,
        variables: formula.variables
      },
      difficulty: formula.difficulty,
      tags: [topic, 'formula', 'math'],
      metadata: {
        source: 'AI Generated',
        confidence: 0.9
      }
    }));
  }

  async _generateDefinitionFlashcard(topic, count) {
    const definitions = await this._extractDefinitions(topic, count);
    
    return definitions.map(definition => ({
      id: uuidv4(),
      type: 'definition',
      front: `Define: ${definition.term}`,
      back: {
        definition: definition.meaning,
        context: definition.context,
        relatedTerms: definition.related
      },
      difficulty: 'easy',
      tags: [topic, 'definition'],
      metadata: {
        source: 'AI Generated',
        confidence: 0.85
      }
    }));
  }

  async _generateExampleFlashcard(topic, count) {
    const examples = await this._extractExamples(topic, count);
    
    return examples.map(example => ({
      id: uuidv4(),
      type: 'example',
      front: `Example: ${example.problem}`,
      back: {
        solution: example.solution,
        explanation: example.explanation,
        keyLearning: example.learning
      },
      difficulty: example.difficulty,
      tags: [topic, 'example', 'application'],
      metadata: {
        source: 'AI Generated',
        confidence: 0.75
      }
    }));
  }

  async _generateMnemonicFlashcard(topic, count) {
    const mnemonics = await this._generateMnemonics(topic, count);
    
    return mnemonics.map(mnemonic => ({
      id: uuidv4(),
      type: 'mnemonic',
      front: `Remember: ${mnemonic.concept}`,
      back: {
        mnemonic: mnemonic.device,
        explanation: mnemonic.howItWorks,
        application: mnemonic.usage
      },
      difficulty: 'easy',
      tags: [topic, 'mnemonic', 'memory'],
      metadata: {
        source: 'AI Generated',
        confidence: 0.7
      }
    }));
  }

  // AI Integration methods (would call LLaMA API)
  async _extractKeyConcepts(topic, count) {
    // Simulated AI response - replace with actual LLaMA API call
    return [
      'Fundamental Theorem of Calculus',
      'Limits and Continuity',
      'Derivatives and Applications',
      'Integration Techniques',
      'Differential Equations'
    ].slice(0, count);
  }

  async _extractFormulas(topic, count) {
    // Simulated AI response
    return [
      {
        expression: '∫ f(x) dx = F(x) + C',
        description: 'Indefinite Integral',
        application: 'Finding antiderivatives',
        example: '∫ 2x dx = x² + C',
        variables: { f: 'function', F: 'antiderivative', C: 'constant' },
        difficulty: 'medium'
      }
    ].slice(0, count);
  }

  async _extractDefinitions(topic, count) {
    // Simulated AI response
    return [
      {
        term: 'Derivative',
        meaning: 'The rate at which a function changes with respect to its variable',
        context: 'Calculus and Mathematical Analysis',
        related: ['Differentiation', 'Slope', 'Tangent']
      }
    ].slice(0, count);
  }

  async _extractExamples(topic, count) {
    // Simulated AI response
    return [
      {
        problem: 'Find the derivative of f(x) = 3x² + 2x - 5',
        solution: "f'(x) = 6x + 2",
        explanation: 'Apply power rule to each term',
        learning: 'Power rule: d/dx[xⁿ] = n*xⁿ⁻¹',
        difficulty: 'easy'
      }
    ].slice(0, count);
  }

  async _generateMnemonics(topic, count) {
    // Simulated AI response
    return [
      {
        concept: 'Order of Operations',
        device: 'PEMDAS (Parentheses, Exponents, Multiplication, Division, Addition, Subtraction)',
        howItWorks: 'Acronym to remember the sequence',
        usage: 'Use when solving mathematical expressions'
      }
    ].slice(0, count);
  }

  _generateConceptExplanation(concept) {
    // Simple explanation generator - replace with AI
    return `Detailed explanation of ${concept} including key points, applications, and common misconceptions.`;
  }

  _calculateStudyTime(cardCount) {
    // 30 seconds per card for review
    return Math.ceil(cardCount * 0.5);
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  _generateFallbackFlashcards(topic, count) {
    const flashcards = [];
    for (let i = 1; i <= count; i++) {
      flashcards.push({
        id: uuidv4(),
        type: 'concept',
        front: `${topic} Concept ${i}`,
        back: `Detailed explanation of ${topic} concept ${i}. This would be AI-generated in production.`,
        difficulty: 'medium',
        tags: [topic, 'fallback'],
        metadata: {
          source: 'Fallback',
          confidence: 0.5
        }
      });
    }
    
    return {
      setId: uuidv4(),
      topic,
      totalCards: count,
      types: ['concept'],
      flashcards,
      generatedAt: new Date().toISOString(),
      estimatedStudyTime: this._calculateStudyTime(count),
      isFallback: true
    };
  }

  // Spaced Repetition Algorithm
  calculateNextReview(flashcard, performance) {
    const { difficulty, reviewHistory = [] } = flashcard;
    const lastReview = reviewHistory[reviewHistory.length - 1];
    
    let interval = 1; // days
    
    if (lastReview) {
      const lastInterval = lastReview.interval || 1;
      const lastPerformance = lastReview.performance || 0.5;
      
      if (performance >= 0.8) {
        // Excellent recall - double interval
        interval = Math.min(lastInterval * 2, 365);
      } else if (performance >= 0.6) {
        // Good recall - moderate increase
        interval = Math.min(lastInterval * 1.5, 180);
      } else if (performance >= 0.4) {
        // Moderate recall - keep same interval
        interval = lastInterval;
      } else {
        // Poor recall - decrease interval
        interval = Math.max(1, Math.floor(lastInterval * 0.5));
      }
      
      // Adjust for difficulty
      if (difficulty === 'hard') {
        interval = Math.max(1, interval - 1);
      } else if (difficulty === 'easy') {
        interval = interval + 1;
      }
    }
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    return {
      interval,
      nextReview,
      performance,
      reviewDate: new Date().toISOString()
    };
  }

  // Progress Tracking
  calculateMasteryScore(flashcardHistory) {
    if (flashcardHistory.length === 0) return 0;
    
    const recentReviews = flashcardHistory.slice(-5); // Last 5 reviews
    const averagePerformance = recentReviews.reduce((sum, review) => {
      return sum + (review.performance || 0);
    }, 0) / recentReviews.length;
    
    const consistency = this._calculateConsistency(flashcardHistory);
    
    return Math.min(100, (averagePerformance * 80) + (consistency * 20));
  }

  _calculateConsistency(reviewHistory) {
    if (reviewHistory.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < reviewHistory.length; i++) {
      const prevDate = new Date(reviewHistory[i-1].reviewDate);
      const currDate = new Date(reviewHistory[i].reviewDate);
      const interval = (currDate - prevDate) / (24 * 60 * 60 * 1000);
      intervals.push(interval);
    }
    
    const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - averageInterval, 2);
    }, 0) / intervals.length;
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - (variance / 30)); // Normalize
  }
}

module.exports = new FlashcardsGenerator();