import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { DocumentPreviewPage } from './pages/DocumentPreviewPage';
import { QuizSetupPage } from './pages/QuizSetupPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizSessionPage } from './pages/QuizSessionPage';
import { QuizResultPage } from './pages/QuizResultPage';
import { QuizHistoryPage } from './pages/QuizHistoryPage';
import { LearningPathPage } from './pages/LearningPathPage';
import { CompanionsPage } from './pages/CompanionsPage';
import { JustStartPage } from './pages/JustStartPage';
import { TodoListPage } from './pages/TodoListPage';
import { ShopPage } from './pages/ShopPage';
import { InventoryPage } from './pages/InventoryPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminFeedbackPage } from './pages/AdminFeedbackPage';
import './styles/global.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
          <Route path="/todos" element={<TodoListPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/just-start" element={<JustStartPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
          <Route path="/documents/:documentId/preview" element={<DocumentPreviewPage />} />
          <Route path="/documents/:documentId/reader" element={<DocumentPreviewPage />} />
          <Route path="/documents/:documentId/path" element={<LearningPathPage />} />
          <Route path="/collections/:collectionId/quiz-setup" element={<QuizSetupPage />} />
          <Route path="/collections/:collectionId/cards" element={<FlashcardsPage />} />
          <Route path="/quizzes/:quizId/session" element={<QuizSessionPage />} />
          <Route path="/attempts/:attemptId/result" element={<QuizResultPage />} />
          <Route path="/history" element={<QuizHistoryPage />} />
          <Route path="/companions" element={<CompanionsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;
