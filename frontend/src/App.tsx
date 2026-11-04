import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { DocumentPreviewPage } from './pages/DocumentPreviewPage';
import { QuizSetupPage } from './pages/QuizSetupPage';
import { QuizSessionPage } from './pages/QuizSessionPage';
import { QuizResultPage } from './pages/QuizResultPage';
import { QuizHistoryPage } from './pages/QuizHistoryPage';
import './styles/global.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
            <Route path="/documents/:documentId/preview" element={<DocumentPreviewPage />} />
            <Route path="/collections/:collectionId/quiz-setup" element={<QuizSetupPage />} />
            <Route path="/quizzes/:quizId/session" element={<QuizSessionPage />} />
            <Route path="/attempts/:attemptId/result" element={<QuizResultPage />} />
            <Route path="/history" element={<QuizHistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
