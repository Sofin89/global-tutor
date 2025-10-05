import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, BookOpen, Lightbulb, Target, Clock, CheckCircle,
  ChevronRight, ChevronLeft, Volume2, VolumeX, Pause, Play,
  Star, HelpCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';

const TutorSession = ({ weakAreas, onSessionComplete }) => {
  const [currentTopic, setCurrentTopic] = useState(0);
  const [sessionProgress, setSessionProgress] = useState({
    topicsCompleted: 0,
    totalTopics: weakAreas.length,
    timeSpent: 0,
    understandingLevel: 0
  });
  const [currentStep, setCurrentStep] = useState(0); // 0: Concept, 1: Examples, 2: Practice
  const [isPlaying, setIsPlaying] = useState(false);
  const [userFeedback, setUserFeedback] = useState({});
  const [sessionData, setSessionData] = useState([]);

  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize session data
    const initialData = weakAreas.map(topic => ({
      topic,
      steps: [
        {
          type: 'concept',
          title: `Understanding ${topic}`,
          content: generateConceptExplanation(topic),
          completed: false
        },
        {
          type: 'examples',
          title: `Real-world Examples`,
          content: generateExamples(topic),
          completed: false
        },
        {
          type: 'practice',
          title: `Quick Practice`,
          questions: generatePracticeQuestions(topic),
          completed: false
        }
      ],
      mastered: false
    }));
    setSessionData(initialData);
  }, [weakAreas]);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setSessionProgress(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const generateConceptExplanation = (topic) => {
    const explanations = {
      'Organic Chemistry': `Organic chemistry is the study of carbon-containing compounds and their properties, structures, and reactions. Carbon's unique ability to form four covalent bonds allows for incredible molecular diversity, from simple methane to complex proteins and DNA.`,
      'Thermodynamics': `Thermodynamics deals with energy transfer and transformation in physical systems. The four laws govern how energy moves and changes form, with applications ranging from engines to biological systems.`,
      'Genetics': `Genetics is the study of genes, genetic variation, and heredity in organisms. It explains how traits are passed from parents to offspring and how DNA encodes biological information.`
    };
    return explanations[topic] || `Let's explore the fundamental concepts of ${topic}. This topic is essential for understanding more advanced concepts in your exam.`;
  };

  const generateExamples = (topic) => {
    const examples = {
      'Organic Chemistry': [
        'Hydrocarbon combustion: CH₄ + 2O₂ → CO₂ + 2H₂O',
        'Esterification: Carboxylic acid + Alcohol → Ester + Water',
        'Nucleophilic substitution in alkyl halides'
      ],
      'Thermodynamics': [
        'Heat engine efficiency: η = 1 - T_cold/T_hot',
        'Entropy increase in spontaneous processes',
        'Gibbs free energy determining reaction spontaneity'
      ],
      'Genetics': [
        'Mendelian inheritance patterns in pea plants',
        'DNA replication semi-conservative model',
        'Genetic code translation into proteins'
      ]
    };
    return examples[topic] || [
      'Example 1: Basic application of the concept',
      'Example 2: Intermediate level problem',
      'Example 3: Advanced exam-style question'
    ];
  };

  const generatePracticeQuestions = (topic) => [
    {
      question: `What is the fundamental principle behind ${topic}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This principle forms the basis for understanding more complex concepts.'
    },
    {
      question: `Which of these best demonstrates ${topic} in action?`,
      options: ['Scenario A', 'Scenario B', 'Scenario C', 'Scenario D'],
      correctAnswer: 1,
      explanation: 'This scenario clearly illustrates the practical application.'
    }
  ];

  const currentTopicData = sessionData[currentTopic];
  const currentStepData = currentTopicData?.steps[currentStep];

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else if (currentTopic < weakAreas.length - 1) {
      setCurrentTopic(currentTopic + 1);
      setCurrentStep(0);
      setSessionProgress(prev => ({
        ...prev,
        topicsCompleted: prev.topicsCompleted + 1
      }));
    } else {
      // Session complete
      onSessionComplete({
        ...sessionProgress,
        topicsCompleted: sessionProgress.topicsCompleted + 1,
        understandingLevel: calculateUnderstandingLevel()
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentTopic > 0) {
      setCurrentTopic(currentTopic - 1);
      setCurrentStep(2);
    }
  };

  const markStepCompleted = () => {
    const updatedData = [...sessionData];
    updatedData[currentTopic].steps[currentStep].completed = true;
    setSessionData(updatedData);
  };

  const calculateUnderstandingLevel = () => {
    const totalSteps = sessionData.reduce((sum, topic) => sum + topic.steps.length, 0);
    const completedSteps = sessionData.reduce((sum, topic) => 
      sum + topic.steps.filter(step => step.completed).length, 0
    );
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const handleFeedback = (step, isHelpful) => {
    setUserFeedback(prev => ({
      ...prev,
        [`${currentTopic} - ${ currentStep }`] : isHelpful
      }));
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!currentTopicData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900">Preparing Your AI Tutoring Session...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Tutoring Session</h1>
            <p className="text-gray-600 mt-2">
              Personalized learning for your weak areas
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(sessionProgress.timeSpent)}
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Session Progress</h2>
              
              {/* Overall Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-semibold">
                    {Math.round((sessionProgress.topicsCompleted / sessionProgress.totalTopics) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(sessionProgress.topicsCompleted / sessionProgress.totalTopics) * 100}%` }}
                  />
                </div>
              </div>

              {/* Topics List */}
              <div className="space-y-3">
                {sessionData.map((topicData, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      index === currentTopic
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setCurrentTopic(index);
                      setCurrentStep(0);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          topicData.mastered ? 'bg-green-500' :
                          index === currentTopic ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <span className={`font-medium ${
                          index === currentTopic ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {topicData.topic}
                        </span>
                      </div>
                      {topicData.mastered && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    
                    {/* Steps Progress */}
                    <div className="flex gap-1 mt-2">
                      {topicData.steps.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className={`w-1/3 h-1 rounded ${
                            step.completed
                              ? 'bg-green-500'
                              : stepIndex === currentStep && index === currentTopic
                              ? 'bg-blue-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Session Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Topics Completed</div>
                    <div className="font-semibold">
                      {sessionProgress.topicsCompleted}/{sessionProgress.totalTopics}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Understanding</div>
                    <div className="font-semibold">
                      {calculateUnderstandingLevel()}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-xl shadow-lg p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentTopic}-${currentStep}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="min-h-96"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Target className="w-4 h-4 mr-1" />
                        {currentTopicData.topic}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {currentStepData.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        Step {currentStep + 1} of 3
                      </span>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(step => (
                          <div
                            key={step}
                            className={`w-2 h-2 rounded-full ${
                              step === currentStep
                                ? 'bg-blue-500'
                                : step < currentStep
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="prose prose-lg max-w-none mb-8">
                    {currentStep === 0 && (
                      <div>
                        <div className="flex items-center mb-4 p-4 bg-blue-50 rounded-lg">
                          <Lightbulb className="w-5 h-5 text-blue-600 mr-3" />
                          <span className="font-semibold text-blue-900">
                            Key Concept Explanation
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {currentStepData.content}
                        </p>
                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-semibold text-yellow-900 mb-2">
                            💡 Exam Tip
                          </h4>
                          <p className="text-yellow-800 text-sm">
                            This concept frequently appears in {weakAreas[currentTopic]} questions. 
                            Focus on understanding the fundamental principles rather than memorization.
                          </p>
                        </div>
                      </div>
                    )}

                    {currentStep === 1 && (
                      <div>
                        <div className="flex items-center mb-4 p-4 bg-green-50 rounded-lg">
                          <BookOpen className="w-5 h-5 text-green-600 mr-3" />
                          <span className="font-semibold text-green-900">
                            Practical Examples
                          </span>
                        </div>
                        <div className="space-y-4">
                          {currentStepData.content.map((example, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-start">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-1">
                                  {index + 1}
                                </div>
                                <p className="text-gray-700">{example}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div>
                        <div className="flex items-center mb-4 p-4 bg-purple-50 rounded-lg">
                          <Brain className="w-5 h-5 text-purple-600 mr-3" />
                          <span className="font-semibold text-purple-900">
                            Practice Questions
                          </span>
                        </div>
                        <div className="space-y-6">
                          {currentStepData.questions.map((question, qIndex) => (
                            <div key={qIndex} className="p-6 border border-gray-200 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-4">
                                {question.question}
                              </h4>
                              <div className="space-y-3">
                                {question.options.map((option, oIndex) => (
                                  <div
                                    key={oIndex}
                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                  >
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-3"></div>
                                    <span>{option}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Explanation:</strong> {question.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feedback and Navigation */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={prevStep}
                        disabled={currentTopic === 0 && currentStep === 0}
                        className="flex items-center px-4 py-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      {/* Feedback Buttons */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <button
                          onClick={() => handleFeedback(currentStep, true)}
                          className={`p-1 rounded ${
                            userFeedback[`${currentTopic}-${currentStep}`] === true
                              ? 'text-green-600 bg-green-50'
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFeedback(currentStep, false)}
                          className={`p-1 rounded ${
                            userFeedback[`${currentTopic}-${currentStep}`] === false
                              ? 'text-red-600 bg-red-50'
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={markStepCompleted}
                        className="flex items-center px-4 py-2 text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Complete
                      </button>
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {currentTopic === weakAreas.length - 1 && currentStep === 2
                          ? 'Complete Session'
                          : 'Next'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* AI Tutor Chat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Tutor Assistant</h3>
                  <p className="text-sm text-gray-600">Here to help you understand better</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm text-gray-700">
                      Need help with this concept? I can provide additional examples or explain it differently.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm text-blue-700">
                      Can you give me a real-world application of this?
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question about this topic..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    Ask
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TutorSession;