import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import './styles/globals.css';

// Components
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';
import ExamSelector from './components/ExamSelector';
import MockTest from './components/MockTest';
import Results from './components/Results';
import TutorSession from './components/TutorSession';
import Flashcards from './components/Flashcards';
import Study from './pages/Study';
import Analytics from './pages/Analytics';

// Import hooks 
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useProgress } from './hooks/useProgress';
// App States
const APP_STATES = {
  HOME: 'home',
  LOGIN: 'login',
  SIGNUP: 'signup',
  EXAM_SELECTION: 'exam_selection',
  DASHBOARD: 'dashboard',
  STUDY: 'study',
  ANALYTICS: 'analytics',
  MOCK_TEST: 'mock_test',
  RESULTS: 'results',
  TUTOR_SESSION: 'tutor_session',
  FLASHCARDS: 'flashcards'
};

// Main App Component
function App() {
  const { user, login, signup, logout, updateUserExam, isLoading: authLoading } = useAuth();
  const { progress, addTestResult, addStudySession, updateStreak } = useProgress(user?.id);
  
  const [currentState, setCurrentState] = useState(APP_STATES.HOME);
  const [selectedExam, setSelectedExam] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [flashcardTopic, setFlashcardTopic] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        if (user) {
          setCurrentState(APP_STATES.DASHBOARD);
          if (user.examType) {
            setSelectedExam(user.examType);
          }
        }
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, [user]);

  useEffect(() => {
    // Update streak when user is active
    if (user) {
      updateStreak();
    }
  }, [user, updateStreak]);

  // Handle navigation to home
  const handleGoHome = () => {
    setCurrentState(APP_STATES.HOME);
  };

  // Handle navigation to login
  const handleGoToLogin = () => {
    setCurrentState(APP_STATES.LOGIN);
  };

  // Handle login
  const handleLogin = async (email, password) => {
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success(`Welcome back, ${result.user.name}!`);
        if (result.user.examType) {
          setSelectedExam(result.user.examType);
          setCurrentState(APP_STATES.DASHBOARD);
        } else {
          setCurrentState(APP_STATES.EXAM_SELECTION);
        }
         return true;
      } else {
        toast.error(result.error || 'Login failed');
         return false;
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  // Handle signup
  const handleSignup = async (email, password, name) => {
    try {
      const result = await signup(email, password, name);
      if (result.success) {
        toast.success(`Account created successfully! Welcome, ${result.user.name}`);
        setCurrentState(APP_STATES.EXAM_SELECTION);
         return true;
      } else {
        toast.error(result.error || 'Signup failed');
        return false;
      }
    } catch (error) {
      toast.error('Signup failed. Please try again.');
       return false;
    }
  };

  // Handle exam selection
  const handleExamSelect = (exam) => {
    setSelectedExam(exam.id);
    updateUserExam(exam.id);
    toast.success(`${exam.name} preparation started!`);
    setCurrentState(APP_STATES.DASHBOARD);
  };

  // Handle starting a mock test
  const handleStartTest = () => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      setCurrentState(APP_STATES.EXAM_SELECTION);
      return;
    }
    setCurrentState(APP_STATES.MOCK_TEST);
    toast.loading('Generating AI-powered test...');
  };

  // Handle test completion
  const handleTestComplete = (results) => {
    setTestResults(results);
    
    // Track progress
    if (user) {
      addTestResult(results.score, results.analytics.weakAreas[0], results.timeSpent);
    }
    
    // Extract weak areas for tutoring
    const weakTopics = results.analytics.weakAreas.slice(0, 3);
    setWeakAreas(weakTopics);
    setCurrentState(APP_STATES.RESULTS);
    toast.success(`Test completed! Score: ${results.score}%`);
  };

  // Handle retry test
  const handleRetryTest = () => {
    setCurrentState(APP_STATES.MOCK_TEST);
    toast.loading('Preparing new test...');
  };

  // Handle starting AI tutoring session
  const handleStartTutoring = () => {
    if (weakAreas.length === 0) {
      toast.error('No weak areas identified yet. Complete a test first.');
      return;
    }
    setCurrentState(APP_STATES.TUTOR_SESSION);
    toast.success('Starting personalized tutoring session');
  };

  // Handle tutor session completion
  const handleTutorSessionComplete = (sessionResults) => {
    console.log('Tutor session completed:', sessionResults);
    
    // Track study session
    if (user && sessionResults.topicsCompleted > 0) {
      addStudySession('Tutoring Session', sessionResults.timeSpent);
    }
    
    toast.success('Tutoring session completed!');
    setCurrentState(APP_STATES.RESULTS);
  };

  // Handle review questions
  const handleReviewQuestions = () => {
    toast.success('Opening question review...');
    // This would navigate to a question review page
  };

  // Handle flashcard session
  const handleStartFlashcards = (topic) => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      setCurrentState(APP_STATES.EXAM_SELECTION);
      return;
    }
    setFlashcardTopic(topic || 'General Knowledge');
    setCurrentState(APP_STATES.FLASHCARDS);
    toast.loading('Generating smart flashcards...');
  };

  // Handle back from flashcards
  const handleFlashcardsBack = () => {
    setCurrentState(APP_STATES.DASHBOARD);
  };

  // Handle navigation to study page
  const handleGoToStudy = () => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      setCurrentState(APP_STATES.EXAM_SELECTION);
      return;
    }
    setCurrentState(APP_STATES.STUDY);
  };

  // Handle navigation to analytics page
  const handleGoToAnalytics = () => {
    setCurrentState(APP_STATES.ANALYTICS);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setSelectedExam(null);
    setTestResults(null);
    setWeakAreas([]);
    setCurrentState(APP_STATES.HOME);
    toast.success('Logged out successfully');
  };

  // Handle change exam
  const handleChangeExam = () => {
    setCurrentState(APP_STATES.EXAM_SELECTION);
  };

  // Render loading state
  if (authLoading || isAppLoading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner border-white border-t-transparent w-12 h-12 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">AI Global Tutor</h1>
          <p className="opacity-90">Preparing your learning environment...</p>
        </div>
      </div>
    );
  }

  // Render appropriate component based on current state
  const renderCurrentState = () => {
    switch (currentState) {
      case APP_STATES.HOME:
        return <Home onGetStarted={handleGoToLogin} />;

      case APP_STATES.LOGIN:
        return (
          <Login 
            onLogin={handleLogin}
            onSwitchToSignup={() => setCurrentState(APP_STATES.SIGNUP)}
            onGoHome={handleGoHome}
            isSignup={false}
          />
        );

      case APP_STATES.SIGNUP:
        return (
          <Login 
            onLogin={handleSignup}
            onSwitchToSignup={() => setCurrentState(APP_STATES.LOGIN)}
            onGoHome={handleGoHome}
            isSignup={true}
          />
        );

      case APP_STATES.EXAM_SELECTION:
        return <ExamSelector onExamSelect={handleExamSelect} />;

      case APP_STATES.DASHBOARD:
        return (
          <Dashboard 
            user={user}
            onStartTest={handleStartTest}
            onViewProgress={handleGoToAnalytics}
            onStartFlashcards={handleStartFlashcards}
            onGoToStudy={handleGoToStudy}
            onChangeExam={handleChangeExam}
          />
        );

      case APP_STATES.STUDY:
        return (
          <Study 
            user={user}
            onStartTest={handleStartTest}
            onStartFlashcards={handleStartFlashcards}
            onBack={() => setCurrentState(APP_STATES.DASHBOARD)}
            selectedExam={selectedExam}
          />
        );

      case APP_STATES.ANALYTICS:
        return <Analytics user={user} progress={progress} />;

      case APP_STATES.MOCK_TEST:
        return (
          <MockTest 
            examType={selectedExam}
            onTestComplete={handleTestComplete}
            onBack={() => setCurrentState(APP_STATES.DASHBOARD)}
          />
        );

      case APP_STATES.RESULTS:
        return (
          <Results 
            testResults={testResults}
            onRetryTest={handleRetryTest}
            onReviewQuestions={handleReviewQuestions}
            onStartTutoring={handleStartTutoring}
            onBack={() => setCurrentState(APP_STATES.DASHBOARD)}
          />
        );

      case APP_STATES.TUTOR_SESSION:
        return (
          <TutorSession 
            weakAreas={weakAreas}
            onSessionComplete={handleTutorSessionComplete}
            onBack={() => setCurrentState(APP_STATES.RESULTS)}
          />
        );

      case APP_STATES.FLASHCARDS:
        return (
          <Flashcards 
            topic={flashcardTopic}
            onBack={() => setCurrentState(APP_STATES.DASHBOARD)}
          />
        );

      default:
        return <Home onGetStarted={handleGoToLogin} />;
    }
  };

  // Check if we should show navigation
  const shouldShowNavigation = ![
    APP_STATES.HOME,
    APP_STATES.LOGIN,
    APP_STATES.SIGNUP,
    APP_STATES.EXAM_SELECTION,
    APP_STATES.MOCK_TEST,
    APP_STATES.TUTOR_SESSION,
    APP_STATES.FLASHCARDS
  ].includes(currentState);

  // Check if we should show footer
  const shouldShowFooter = ![
    APP_STATES.LOGIN,
    APP_STATES.SIGNUP,
    APP_STATES.EXAM_SELECTION,
    APP_STATES.MOCK_TEST,
    APP_STATES.TUTOR_SESSION,
    APP_STATES.FLASHCARDS
  ].includes(currentState);

  // Get current exam name
  const getCurrentExamName = () => {
    const exams = {
      'NEET': 'NEET',
      'JEE': 'JEE',
      'UPSC': 'UPSC',
      'SAT': 'SAT',
      'GRE': 'GRE',
      'IELTS': 'IELTS',
      'TOEFL': 'TOEFL',
      'CODING': 'Coding Interviews'
    };
    return selectedExam ? exams[selectedExam] : null;
  };

  return (
    <>
      <div className="App min-h-screen flex flex-col bg-gray-50">
        {/* Global Toaster for notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
            loading: {
              duration: 30000,
              iconTheme: {
                primary: '#3B82F6',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Header Navigation */}
        {shouldShowNavigation && (
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <div 
                  className="flex items-center cursor-pointer group"
                  onClick={() => setCurrentState(APP_STATES.DASHBOARD)}
                >
                  <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center mr-3 group-hover:shadow-medium transition-shadow">
                    <span className="text-white font-bold text-sm">AI</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    Global Tutor
                  </span>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex space-x-1">
                  <button
                    onClick={() => setCurrentState(APP_STATES.DASHBOARD)}
                    className={`nav-item ${
                      currentState === APP_STATES.DASHBOARD ? 'active' : ''
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleGoToStudy}
                    className={`nav-item ${
                      currentState === APP_STATES.STUDY ? 'active' : ''
                    }`}
                  >
                    Study Plan
                  </button>
                  <button
                    onClick={handleStartTest}
                    className={`nav-item ${
                      currentState === APP_STATES.MOCK_TEST ? 'active' : ''
                    }`}
                  >
                    Mock Tests
                  </button>
                  <button
                    onClick={() => handleStartFlashcards(getCurrentExamName() + ' Topics')}
                    className={`nav-item ${
                      currentState === APP_STATES.FLASHCARDS ? 'active' : ''
                    }`}
                  >
                    Flashcards
                  </button>
                  <button
                    onClick={handleGoToAnalytics}
                    className={`nav-item ${
                      currentState === APP_STATES.ANALYTICS ? 'active' : ''
                    }`}
                  >
                    Analytics
                  </button>
                </nav>

                {/* User Menu */}
                <div className="flex items-center space-x-4">
                  {selectedExam && (
                    <div className="hidden sm:flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                        {getCurrentExamName()}
                      </span>
                      <button
                        onClick={handleChangeExam}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  {user && (
                    <div className="flex items-center space-x-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {user.subscription} Plan
                        </p>
                      </div>
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-soft">
                        <span className="text-white text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative group">
                    <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => setCurrentState(APP_STATES.DASHBOARD)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                        >
                          🏠 Dashboard
                        </button>
                        <button
                          onClick={handleGoToStudy}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                        >
                          📚 Study Plan
                        </button>
                        <button
                          onClick={handleGoToAnalytics}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                        >
                          📊 Analytics
                        </button>
                        <button
                          onClick={handleChangeExam}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                        >
                          🎯 Change Exam
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${shouldShowNavigation ? 'pt-0' : ''}`}>
          {renderCurrentState()}
        </main>

        {/* Footer */}
        {shouldShowFooter && (
          <footer className="bg-gray-900 text-white py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">AI</span>
                    </div>
                    <span className="text-xl font-bold">Global Tutor</span>
                  </div>
                  <p className="text-gray-400 max-w-md mb-4 leading-relaxed">
                    AI-powered personalized learning platform for competitive exams worldwide. 
                    Making quality education accessible to every student through cutting-edge technology.
                  </p>
                  <div className="flex space-x-4">
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <span className="sr-only">Twitter</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <span className="sr-only">GitHub</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4 text-white">Exams</h3>
                  <ul className="space-y-2">
                    {['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS'].map((exam) => (
                      <li key={exam}>
                        <button 
                          onClick={() => {
                            handleExamSelect({ id: exam, name: exam });
                          }}
                          className="footer-link text-left"
                        >
                          {exam}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4 text-white">Support</h3>
                  <ul className="space-y-2">
                    <li><button className="footer-link text-left">Help Center</button></li>
                    <li><button className="footer-link text-left">Contact Us</button></li>
                    <li><button className="footer-link text-left">Privacy Policy</button></li>
                    <li><button className="footer-link text-left">Terms of Service</button></li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 AI Global Tutor. All rights reserved. Built  for students worldwide.</p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

// Root component with AuthProvider
function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default Root;