/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { LanguageProvider } from './hooks/useLanguage';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import PostDetail from './pages/PostDetail';

export default function App() {
  const getPostIdFromUrl = () => {
    const p = window.location.pathname;
    if (p.startsWith('/post/')) return p.split('/post/')[1];
    return null;
  };

  const [selectedPostId, setSelectedPostId] = useState<string | null>(getPostIdFromUrl());

  const [page, setPage] = useState<'landing' | 'admin' | 'post'>(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    if (path.startsWith('/post/')) return 'post';
    return 'landing';
  });

  // Simple routing hack for this environment
  const navigate = (to: 'landing' | 'admin' | 'post', id?: string) => {
    const path = to === 'admin' ? '/admin' : to === 'post' ? `/post/${id}` : '/';
    window.history.pushState({}, '', path);
    setPage(to);
    if (id) setSelectedPostId(id);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setPage('admin');
      } else if (path.startsWith('/post/')) {
        setSelectedPostId(path.split('/post/')[1]);
        setPage('post');
      } else {
        setPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen">
          {page === 'landing' && (
            <Landing 
              onNavigateAdmin={() => navigate('admin')} 
              onSelectPost={(id) => navigate('post', id)}
            />
          )}
          {page === 'admin' && (
            <Admin onNavigateLanding={() => navigate('landing')} />
          )}
          {page === 'post' && (
            <PostDetail 
              postId={selectedPostId || ''} 
              onBack={() => navigate('landing')} 
            />
          )}
        </div>
        <Toaster position="bottom-right" toastOptions={{
          className: 'glass text-slate-900 dark:text-slate-100',
          style: {
            background: 'transparent',
            backdropFilter: 'blur(10px)',
          }
        }} />
      </LanguageProvider>
    </ThemeProvider>
  );
}
