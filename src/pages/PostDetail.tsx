import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppCache } from '../lib/cache';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../hooks/useLanguage';
import { ArrowLeft, Globe, Tag, Youtube, Camera, Clock, Share2, Grid, List, ChevronLeft, ChevronRight, X, Smartphone, Download } from 'lucide-react';
import toast from 'react-hot-toast';

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
  description: string;
  descriptionRu?: string;
  device?: string;
  cover: string;
  photos: string[];
  videos: string[];
  tags: string[];
  createdAt: any;
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

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export default function PostDetail({ postId, onBack }: { postId: string, onBack: () => void }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'bento' | 'feed'>('bento');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { lang } = useLanguage();

  useEffect(() => {
    async function fetchPost() {
      if (AppCache.postDetails[postId]) {
        setPost(AppCache.postDetails[postId]);
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedPost = { id: docSnap.id, ...docSnap.data() } as Post;
          AppCache.postDetails[postId] = fetchedPost;
          setPost(fetchedPost);
        } else {
          toast.error('Post not found');
          onBack();
        }
      } catch (error) {
        toast.error('Error loading post');
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
    window.scrollTo(0, 0);
  }, [postId]);

  const title = post ? (lang === 'ru' ? post.titleRu || post.title : post.title) : '';
  const description = post ? (lang === 'ru' ? post.descriptionRu || post.description : post.description) : '';
  let typeLabel = '';
  if (post) {
    if (post.type === 'country') {
      typeLabel = lang === 'ru' ? post.countryRu || post.country || '' : post.country || '';
    } else {
      typeLabel = lang === 'ru' ? post.themeRu || post.theme || '' : post.theme || '';
    }
  }

  useEffect(() => {
    if (post) {
      document.title = `${title} — Shastovsky.Photo`;
      const metaDesc = document.querySelector('meta[name="description"]');
      const descContent = description.slice(0, 150) + '...';
      if (metaDesc) {
        metaDesc.setAttribute('content', descContent);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = descContent;
        document.head.appendChild(meta);
      }
    }
  }, [post, title, description]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `shastovsky_${post.id}_${lightboxIndex}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast.error(lang === 'ru' ? 'Ошибка скачивания' : 'Download failed');
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-500">
      {/* Hero Section */}
      <div className="relative h-[80vh] w-full overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          src={post.cover} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 text-white">
          <button onClick={onBack} className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors flex items-center gap-2">
            <ArrowLeft size={18} /> <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">{lang === 'ru' ? 'Назад' : 'Back'}</span>
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success(lang === 'ru' ? 'Ссылка скопирована!' : 'Link copied!');
          }} className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors">
            <Share2 size={18} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-7xl mx-auto text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="inline-block px-4 py-1 glass rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-80">
              {typeLabel}
            </span>
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
              {title}
            </h1>
            <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              <div className="flex items-center gap-2"><Globe size={14} /> {typeLabel}</div>
              <div className="flex items-center gap-2"><Clock size={14} /> {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US') : (lang === 'ru' ? 'Недавно' : 'Recently')}</div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 md:px-16 py-20 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-24">
          {/* Narrative */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-10 border-l-2 border-black/20 dark:border-white/20 pl-6">{lang === 'ru' ? 'История' : 'Story'}</h2>
            
            {post.device && (
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-8">
                <Smartphone size={16} /> 
                {lang === 'ru' ? 'Снято на: ' : 'Shot on: '} {post.device}
              </div>
            )}
            
            <p className="text-xl md:text-2xl leading-relaxed opacity-80 whitespace-pre-wrap font-serif italic text-slate-800 dark:text-slate-300">
              {description}
            </p>
          </section>

          {/* Gallery */}
          {post.photos && post.photos.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 flex items-center gap-3">
                  <Camera size={20} /> {lang === 'ru' ? 'Кадры' : 'Moments'}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode('bento')}
                    className={`p-2 rounded-xl transition-all duration-300 ${viewMode === 'bento' ? 'glass opacity-100' : 'opacity-30 hover:opacity-100'}`}
                  >
                    <Grid size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('feed')}
                    className={`p-2 rounded-xl transition-all duration-300 ${viewMode === 'feed' ? 'glass opacity-100' : 'opacity-30 hover:opacity-100'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {viewMode === 'bento' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[300px]">
                  {post.photos.map((photo, i) => {
                    // Optimized Bento rhythm
                    const isLarge = i % 5 === 0;
                    const isWide = i % 5 === 3;
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        onClick={() => setLightboxIndex(i)}
                        className={`glass-card overflow-hidden group cursor-pointer ${
                          isLarge ? 'col-span-1 row-span-2 md:col-span-2 md:row-span-2' : 
                          isWide ? 'col-span-2 row-span-1 md:col-span-2' : 'col-span-1 row-span-1'
                        }`}
                      >
                        <img 
                          src={getThumb(photo)} 
                          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" 
                          loading="lazy" 
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {post.photos.map((photo, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "200px" }}
                      transition={{ duration: 0.5 }}
                      onClick={() => setLightboxIndex(i)}
                      className="w-full cursor-pointer group rounded-[2rem] overflow-hidden relative"
                    >
                      <img 
                        src={photo} // Use full res for feed view since it's large
                        className="w-full h-auto object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Videos */}
          {post.videos && post.videos.length > 0 && (
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-10 flex items-center gap-3">
                <Youtube size={20} /> Motion
              </h2>
              <div className="space-y-12">
                {post.videos.map((video, i) => {
                  const videoId = video.includes('v=') ? video.split('v=')[1].split('&')[0] : video.split('/').pop();
                  return (
                    <div key={i} className="glass rounded-[3rem] overflow-hidden aspect-video shadow-2xl relative group">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full transition-all duration-700"
                      ></iframe>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-10">
          <div className="glass p-10 rounded-[3rem] sticky top-32">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-10 border-b border-black/5 dark:border-white/5 pb-4">{lang === 'ru' ? 'Детали' : 'Details'}</h3>
            
            <div className="space-y-10">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.4em] block mb-4 opacity-40">{lang === 'ru' ? 'Категория' : 'Category'}</label>
                <div className="font-black tracking-widest text-sm">{post.type.toUpperCase()}</div>
              </div>
              
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.4em] block mb-4 opacity-40">{lang === 'ru' ? 'Теги' : 'Tags'}</label>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, i) => (
                    <span key={i} className="glass px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest opacity-60">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-black/5 dark:border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40 leading-loose italic">
                {lang === 'ru' ? 'Все материалы защищены авторским правом. Используйте с указанием ссылки на SHASTOVSKY.PHOTO' : 'All materials are protected by copyright. Use with attribution to SHASTOVSKY.PHOTO'}
              </p>
            </div>
          </div>
        </aside>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-20 text-center border-t border-black/5 dark:border-white/5 relative z-10">
        <button onClick={onBack} className="text-[10px] font-black tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-opacity">
          {lang === 'ru' ? 'ВЕРНУТЬСЯ К КОЛЛЕКЦИЯМ' : 'RETURN TO COLLECTIONS'}
        </button>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && post.photos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-8 backdrop-blur-xl touch-none"
          >
            <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
              <button 
                onClick={() => handleDownload(post.photos[lightboxIndex])}
                className="p-4 text-white/50 hover:text-white transition-colors"
                title={lang === 'ru' ? 'Скачать изображение' : 'Download image'}
              >
                <Download size={32} />
              </button>
              <button 
                onClick={() => setLightboxIndex(null)}
                className="p-4 text-white/50 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>
            </div>

            <button 
              onClick={() => setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : post.photos.length - 1)}
              className="absolute left-2 md:left-8 p-4 text-white/50 hover:text-white z-50 transition-colors pointer-events-auto"
            >
              <ChevronLeft size={48} strokeWidth={1} />
            </button>

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  setLightboxIndex((prev) => prev !== null && prev < post.photos!.length - 1 ? prev + 1 : 0);
                } else if (swipe > swipeConfidenceThreshold) {
                  setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : post.photos!.length - 1);
                }
              }}
              className="absolute inset-0 flex items-center justify-center p-4 md:p-12 cursor-grab active:cursor-grabbing"
            >
              {/* Progressive loading: show blurred thumbnail behind full res */}
              <img 
                src={getThumb(post.photos[lightboxIndex])}
                className="absolute max-w-full max-h-full object-contain opacity-50 blur-md pointer-events-none"
                referrerPolicy="no-referrer"
                alt=""
              />
              <motion.img 
                key={lightboxIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={post.photos[lightboxIndex]} 
                className="max-w-full max-h-full object-contain select-none pointer-events-none relative z-10"
                referrerPolicy="no-referrer"
                alt="Fullscreen view"
              />
            </motion.div>

            <button 
              onClick={() => setLightboxIndex((prev) => prev !== null && prev < post.photos.length - 1 ? prev + 1 : 0)}
              className="absolute right-2 md:right-8 p-4 text-white/50 hover:text-white z-50 transition-colors pointer-events-auto"
            >
              <ChevronRight size={48} strokeWidth={1} />
            </button>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
              {post.photos.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/20'}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
