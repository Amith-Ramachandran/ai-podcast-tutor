import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { UploadPage } from './pages/UploadPage';
import { DocumentPage } from './pages/DocumentPage';
import { PodcastPage } from './pages/PodcastPage';
import { QuizPage } from './pages/QuizPage';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="documents/:id" element={<DocumentPage />} />
          <Route path="podcasts/:id" element={<PodcastPage />} />
          <Route path="quiz/:id" element={<QuizPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
