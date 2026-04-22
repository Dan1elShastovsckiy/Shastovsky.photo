import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppCache } from '../lib/cache';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { Moon, Sun, Settings, Globe, Camera, Youtube, ChevronRight } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  titleRu?: string;
  slug: string;
  type: 'country' | 'theme';
  country?: string;
  countryRu?: string;
  theme?: string;
  themeRu?: string;
  section?: string;
  sectionRu?: string;
  description: string;
  descriptionRu?: string;
  cover: string;
  tags: string[];
  videos?: string[];
}

const getThumb = (url: string) => {
  if (!url) return url;
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  if (path.endsWith('.webp') && !path.endsWith('-thumb.webp')) {
    urlObj.pathname = path.replace('.webp', '-thumb.webp');
  }
  return urlObj.toString().replace(window.location.origin, '');
};

export default function Landing({ onNavigateAdmin, onSelectPost }: { onNavigateAdmin: () => void, onSelectPost: (id: string) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'country' | 'theme'>('all');
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();

  useEffect(() => {
    document.title = lang === 'ru' ? 'Shastovsky.Photo — Коллекции' : 'Shastovsky.Photo — Collections';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', lang === 'ru' ? 'Портфолио и фотоистории' : 'Photography portfolio and stories');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = lang === 'ru' ? 'Портфолио и фотоистории' : 'Photography portfolio and stories';
      document.head.appendChild(meta);
    }
  }, [lang]);

  useEffect(() => {
    async function fetchPosts() {
      if (AppCache.posts && Date.now() - AppCache.postsTimestamp < 1000 * 60 * 5) {
        setPosts(AppCache.posts);
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'posts'),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        AppCache.posts = data;
        AppCache.postsTimestamp = Date.now();
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((p: Post) => filter === 'all' || p.type === filter);

  // Group posts by section
  const sections = filteredPosts.reduce((acc: Record<string, Post[]>, post: Post) => {
    const defaultSec = post.section || '';
    const localizedSec = (lang === 'ru' ? post.sectionRu || defaultSec : defaultSec) || (lang === 'ru' ? 'Остальное' : 'Other');
    if (!acc[localizedSec]) acc[localizedSec] = [];
    acc[localizedSec].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  const sectionKeys = Object.keys(sections);

  return (
    <div className="min-h-screen transition-colors duration-500 overflow-x-hidden relative">
      {/* Subtle monochromatic blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />

      <header className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center glass px-6 py-4 rounded-3xl">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-black tracking-[0.2em] uppercase">Shastovsky.Photo</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="p-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors uppercase">
              {lang}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-32 px-6 pb-20">
        <section className="mb-20">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black mb-12 tracking-tighter uppercase break-words hyphens-auto"
          >
            {lang === 'ru' ? 'Коллекции' : 'Collections'}
          </motion.h2>
          
          <div className="flex flex-wrap gap-3 md:gap-4">
            {(['all', 'country', 'theme'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-8 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === f 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black' 
                    : 'glass opacity-40 hover:opacity-100 text-slate-900 dark:text-white'
                }`}
              >
                {f === 'all' && (lang === 'ru' ? 'Все' : 'All')}
                {f === 'country' && (lang === 'ru' ? 'Страны' : 'Countries')}
                {f === 'theme' && (lang === 'ru' ? 'Сюжеты' : 'Themes')}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card h-80 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="space-y-32">
            {sectionKeys.map((sectionTitle) => (
              <section key={sectionTitle} className="space-y-12">
                {sectionTitle && (
                  <motion.h3 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-xs font-black uppercase tracking-[0.4em] opacity-40 border-l-2 border-white/20 pl-6 ml-2"
                  >
                    {sectionTitle}
                  </motion.h3>
                )}
                
                <div className="bento-grid">
                  <AnimatePresence>
                    {sections[sectionTitle].map((post, index) => {
                      const isFeatured = index % 5 === 0; // Every 5th post is featured for rhythm
                      const title = lang === 'ru' ? post.titleRu || post.title : post.title;
                      const description = lang === 'ru' ? post.descriptionRu || post.description : post.description;
                      let typeLabel = '';
                      if (post.type === 'country') {
                        typeLabel = lang === 'ru' ? post.countryRu || post.country || '' : post.country || '';
                      } else {
                        typeLabel = lang === 'ru' ? post.themeRu || post.theme || '' : post.theme || '';
                      }

                      return (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 15 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "100px" }}
                          transition={{ duration: 0.5 }}
                          exit={{ opacity: 0 }}
                          onClick={() => onSelectPost(post.id)}
                          className={`glass-card group flex flex-col cursor-pointer ${
                            isFeatured ? 'col-span-2 row-span-2 md:col-span-2 md:row-span-2' : 'col-span-1 row-span-1'
                          }`}
                        >
                          <div className="absolute inset-0 z-0 bg-slate-100 dark:bg-slate-900">
                            <img 
                              src={getThumb(post.cover)} 
                              alt={title} 
                              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent dark:from-black dark:via-black/20" />
                          </div>
                          
                          <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end text-white">
                            <div className="mb-4">
                              <span className="inline-block px-3 py-1 glass rounded-full text-[9px] font-black uppercase tracking-widest mb-3 opacity-60">
                                {typeLabel}
                              </span>
                              
                        <h3 className={`font-black leading-tight group-hover:opacity-100 transition-all duration-500 ${
                          isFeatured ? 'text-3xl md:text-5xl' : 'text-xl sm:text-2xl'
                        }`}>
                          {title}
                        </h3>
                            </div>
                            
                            <p className={`opacity-60 line-clamp-2 md:line-clamp-3 mb-4 font-medium italic ${
                              isFeatured ? 'text-sm md:text-lg' : 'text-xs md:text-sm'
                            }`}>
                              {description}
                            </p>

                                <div className="flex gap-2">
                                  {post.tags?.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[9px] opacity-40 uppercase tracking-widest font-black">#{tag}</span>
                                  ))}
                                </div>
                              </div>

                          {post.videos && post.videos.length > 0 && (
                            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 glass text-white text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest">
                              Motion
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-12 pt-16 border-t border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
            <a href="https://shastovsky.ru/" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center p-6 hover:scale-[1.02] transition-transform aspect-square">
              <span className="text-4xl sm:text-5xl font-black">S</span>
            </a>
            <a href="https://seo.shastovsky.ru/" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center p-4 text-center hover:scale-[1.02] transition-transform flex-col gap-2 aspect-square">
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest break-all">shastovsky.<br/>seo</span>
            </a>
            <a href="https://www.instagram.com/yellolwapple" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center flex-col gap-2 p-4 hover:scale-[1.02] transition-transform aspect-square">
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest">Instagram</span>
              <span className="opacity-40 text-[9px] sm:text-[10px]">@yellolwapple</span>
            </a>
            <a href="https://t.me/shastovscky" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center flex-col gap-2 p-4 hover:scale-[1.02] transition-transform aspect-square">
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest">Telegram</span>
              <span className="opacity-40 text-[9px] sm:text-[10px]">@shastovscky</span>
            </a>
            <a href="https://www.youtube.com/@itsmyadv" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center flex-col gap-2 p-4 hover:scale-[1.02] transition-transform aspect-square">
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest">YouTube</span>
              <span className="opacity-40 text-[9px] sm:text-[10px]">@itsmyadv</span>
            </a>
            <a href="https://vc.ru/id1145025" target="_blank" rel="noreferrer" className="glass-card flex items-center justify-center flex-col gap-2 p-4 hover:scale-[1.02] transition-transform aspect-square">
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest">VC.ru</span>
              <span className="opacity-40 text-[9px] sm:text-[10px]">Blog</span>
            </a>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={onNavigateAdmin} 
            className="p-4 opacity-10 hover:opacity-100 transition-opacity"
            aria-label="Admin Access"
          >
            <Settings size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
