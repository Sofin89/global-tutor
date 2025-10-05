import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart, Area
} from 'recharts';
import {
  Award, TrendingUp, Clock, Target, Brain, BookOpen,
  CheckCircle, XCircle, ChevronRight, Download,
  Share2, RotateCcw, Star, AlertTriangle
} from 'lucide-react';

const Results = ({ testResults, onRetryTest, onReviewQuestions, onStartTutoring }) => {
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    if (testResults) {
      analyzeResults();
    }
  }, [testResults]);

  const analyzeResults = () => {
    // Simulate detailed analysis
    const analysis = {
      timeAnalysis: {
        averageTimePerQuestion: Math.round(testResults.timeSpent / testResults.totalQuestions),
        timeDistribution: [
          { range: '0-30s', count: 3 },
          { range: '30-60s', count: 4 },
          { range: '1-2m', count: 2 },
          { range: '2m+', count: 1 }
        ]
      },
      questionAnalysis: testResults.detailedResults.map(result => ({
        ...result,
        timeSpent: Math.floor(Math.random() * 120) + 30, // Simulated time
        confidence: Math.floor(Math.random() * 100)
      })),
      improvementSuggestions: [
        'Focus on Organic Chemistry reaction mechanisms',
        'Practice time management for longer problems',
        'Review fundamental concepts in Thermodynamics',
        'Work on reading comprehension for word problems'
      ]
    };
    setDetailedAnalysis(analysis);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const StatCard = ({ icon: Icon, label, value, subtitle, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <div className="flex items-center mt-1">
              <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}% from last test
              </p>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-blue-50">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </motion.div>
  );

  const TopicPerformanceItem = ({ topic, performance }) => (
    <motion.div
      whileHover={{ backgroundColor: '#F9FAFB' }}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
    >
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-3 ${
          performance.percentage >= 70 ? 'bg-green-500' :
          performance.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span className="font-medium text-gray-900">{topic}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              performance.percentage >= 70 ? 'bg-green-500' :
              performance.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${performance.percentage}%` }}
          />
        </div>
        <span className="font-semibold text-gray-700 w-12 text-right">
          {Math.round(performance.percentage)}%
        </span>
        <span className="text-sm text-gray-500 w-16">
          ({performance.correct}/{performance.total})
        </span>
      </div>
    </motion.div>
  );

  if (!testResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">No Test Results Available</h2>
          <p className="text-gray-600 mt-2">Complete a test to see your results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
          <p className="text-gray-600 mt-2">
            Detailed analysis of your performance and personalized recommendations
          </p>
        </motion.div>

        {/* Score Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            icon={Award}
            label="Overall Score"
            value={`${testResults.score}%`}
            trend={5}
          />
          <StatCard
            icon={CheckCircle}
            label="Correct Answers"
            value={`${testResults.correctAnswers}/${testResults.totalQuestions}`}
            trend={2}
          />
          <StatCard
            icon={Clock}
            label="Time Spent"
            value={`${Math.floor(testResults.timeSpent / 60)}m ${testResults.timeSpent % 60}s`}
          />
          <StatCard
            icon={TrendingUp}
            label="Performance Trend"
            value="Improving"
            trend={8}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Score Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Analytics</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={Object.entries(testResults.analytics.topicPerformance).map(([topic, perf]) => ({
                  topic,
                  score: perf.percentage,
                  questions: perf.total,
                  correct: perf.correct
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="topic" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar 
                    yAxisId="left"
                    dataKey="score" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]}
                    name="Score %"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="correct" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Correct Answers"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button
                onClick={onReviewQuestions}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">Review Questions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={onStartTutoring}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Brain className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">AI Tutoring Session</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={onRetryTest}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <RotateCcw className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900">Retry Test</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <Download className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Download Report</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Topic Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Topic Performance</h2>
            <button className="text-blue-600 font-medium text-sm">View Detailed Analysis</button>
          </div>
          
          <div className="space-y-3">
            {Object.entries(testResults.analytics.topicPerformance).map(([topic, performance]) => (
              <TopicPerformanceItem
                key={topic}
                topic={topic}
                performance={performance}
              />
            ))}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Weak Areas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Areas Needing Improvement</h2>
            </div>
            <div className="space-y-3">
              {testResults.analytics.weakAreas.map((area, index) => (
                <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-500 mr-3" />
                  <span className="text-gray-700">{area}</span>
                </div>
              ))}
              {testResults.analytics.weakAreas.length === 0 && (
                <p className="text-gray-600 text-center py-4">
                  Great job! No significant weak areas detected.
                </p>
              )}
            </div>
          </div>

          {/* Strong Areas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Star className="w-6 h-6 text-green-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Strong Areas</h2>
            </div>
            <div className="space-y-3">
              {testResults.analytics.strongAreas.map((area, index) => (
                <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                  <span className="text-gray-700">{area}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-4 mt-8"
        >
          <button
            onClick={onRetryTest}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Take Another Test
          </button>
          <button
            onClick={onStartTutoring}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Start AI Tutoring
          </button>
          <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
            Share Results
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Results;
