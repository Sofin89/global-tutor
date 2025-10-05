// ExamSelector.jsx placeholder
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ExamSelector = ({ onExamSelect }) => {
  const exams = [
    { id: 'NEET', name: 'NEET', color: 'bg-green-500', description: 'Medical Entrance Exam' },
    { id: 'JEE', name: 'JEE', color: 'bg-blue-500', description: 'Engineering Entrance' },
    { id: 'UPSC', name: 'UPSC', color: 'bg-purple-500', description: 'Civil Services' },
    { id: 'SAT', name: 'SAT', color: 'bg-yellow-500', description: 'College Admissions' },
    { id: 'GRE', name: 'GRE', color: 'bg-red-500', description: 'Graduate Studies' },
    { id: 'IELTS', name: 'IELTS', color: 'bg-indigo-500', description: 'English Proficiency' },
    { id: 'TOEFL', name: 'TOEFL', color: 'bg-pink-500', description: 'English Test' },
    { id: 'CODING', name: 'Coding Interviews', color: 'bg-gray-500', description: 'Tech Interviews' }
  ];

  const [selectedExam, setSelectedExam] = useState(null);

  const handleSelect = (exam) => {
    setSelectedExam(exam);
    onExamSelect(exam);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Global Tutor
          </h1>
          <p className="text-xl text-gray-600">
            Personalized adaptive learning for competitive exams worldwide
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {exams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transform transition-all duration-200 ${
                selectedExam?.id === exam.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleSelect(exam)}
            >
              <div className={`w-12 h-12 ${exam.color} rounded-lg flex items-center justify-center mb-4`}>
                <span className="text-white font-bold text-lg">
                  {exam.name.charAt(0)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {exam.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {exam.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {selectedExam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to start your {selectedExam.name} journey?
            </h2>
            <p className="text-gray-600 mb-6">
              Get personalized mock tests, adaptive learning, and AI-powered explanations.
            </p>
            <div className="flex gap-4">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Start Mock Test
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Explore Syllabus
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExamSelector;