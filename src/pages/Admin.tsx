import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Save, Upload, Trash2, X, Globe, Tag, Type, FileText, Youtube, Plus, Edit2, LogOut } from 'lucide-react';
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
  section?: string;
  sectionRu?: string;
  description: string;
  descriptionRu?: string;
  device?: string;
  cover: string;
  photos: string[];
  tags: string[];
  videos?: string[];
  status: 'published' | 'draft';
}

const ADMIN_EMAIL = 'shastovsckiy@gmail.com';

const emptyForm: Omit<Post, 'id' | 'photos' | 'tags' | 'videos'> & { tags: string, videos: string } = {
  title: '',
  titleRu: '',
  slug: '',
  type: 'country',
  country: '',
  countryRu: '',
  theme: '',
  themeRu: '',
  section: '',
  sectionRu: '',
  description: '',
  descriptionRu: '',
  device: '',
  cover: '',
  tags: '',
  status: 'published',
  videos: '',
};

export default function Admin({ onNavigateLanding }: { onNavigateLanding: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'form'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ file: string, progress: number } | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageStats, setImageStats] = useState<Record<string, { sizeMb: number, timestamp: number }>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === ADMIN_EMAIL) {
        setUser(u);
        fetchPosts();
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched: Post[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(fetched);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      if (res.user.email !== ADMIN_EMAIL) {
        toast.error(`Access denied for ${res.user.email}. Admins only.`);
        await signOut(auth);
      } else {
        toast.success(`Welcome, ${res.user.displayName}`);
      }
    } catch (e) {
      toast.error('Login failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedUrls: string[] = [];
    const validFiles = Array.from(files);

    for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        setUploadProgress({ file: file.name, progress: 0 });

        try {
          const data = await new Promise<{ url: string, sizeMb: number }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload');
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress({ file: file.name, progress: percent });
              }
            };
            xhr.onload = () => {
              if (xhr.status === 200) {
                try {
                  const resData = JSON.parse(xhr.responseText);
                  resolve(resData);
                } catch (err) {
                  reject(new Error("Parse fail"));
                }
              } else {
                reject(new Error("Upload failed"));
              }
            };
            xhr.onerror = () => reject(new Error("Network Error"));
            xhr.send(formData);
          });
          
          uploadedUrls.push(data.url);
          setImageStats(prev => ({ 
            ...prev, 
            [data.url]: { sizeMb: data.sizeMb, timestamp: Date.now() } 
          }));
        } catch (error) {
          toast.error(`Upload failed for ${file.name}`);
        }
    }

    if (isGallery) {
      setPhotos(prev => [...prev, ...uploadedUrls]);
    } else {
      if (uploadedUrls[0]) setForm(f => ({ ...f, cover: uploadedUrls[0] }));
    }
    
    setUploadProgress(null);
    toast.success('Upload complete');
  };

  const handleRecompress = async (url: string) => {
    const filename = url.split('/').pop();
    if (!filename) return;

    const toastId = toast.loading('Compressing...', { id: 'compress-' + filename });
    try {
      const res = await fetch('/api/recompress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (!res.ok) throw new Error("Recompress failed");
      const data = await res.json();
      
      toast.success('Compressed to ' + data.sizeMb.toFixed(2) + ' MB!', { id: toastId });
      setImageStats(prev => ({ 
        ...prev, 
        [url]: { sizeMb: data.sizeMb, timestamp: Date.now() } 
      }));
    } catch (e) {
      toast.error('Compression failed', { id: toastId });
    }
  };

  const handleEdit = (p: Post) => {
    setEditId(p.id);
    setForm({
      title: p.title || '',
      titleRu: p.titleRu || '',
      slug: p.slug || '',
      type: p.type || 'country',
      country: p.country || '',
      countryRu: p.countryRu || '',
      theme: p.theme || '',
      themeRu: p.themeRu || '',
      section: p.section || '',
      sectionRu: p.sectionRu || '',
      description: p.description || '',
      descriptionRu: p.descriptionRu || '',
      device: p.device || '',
      cover: p.cover || '',
      tags: (p.tags || []).join(', '),
      status: p.status || 'published',
      videos: (p.videos || []).join('\n'),
    });
    setPhotos(p.photos || []);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.id !== id));
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cover) return toast.error('Cover image is required');
    
    setLoading(true);
    try {
      const postData = {
        ...form,
        photos,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        videos: form.videos.split('\n').map(v => v.trim()).filter(Boolean),
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, 'posts', editId), postData);
        toast.success('Post updated!');
      } else {
        const createData = { ...postData, createdAt: serverTimestamp() };
        await addDoc(collection(db, 'posts'), createData);
        toast.success('Post created successfully!');
      }
      
      setForm(emptyForm);
      setPhotos([]);
      setEditId(null);
      fetchPosts();
      setView('list');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save post. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-black" />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900 dark:bg-[#050505] dark:text-[#f8fafc]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col items-center"
        >
          <h2 className="text-3xl font-black mb-8 text-center italic">Admin Access</h2>
          <p className="text-sm opacity-60 text-center mb-8">Sign in with authorized Google Account</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
          >
            Sign in with Google
          </button>
          <button onClick={onNavigateLanding} className="mt-6 text-sm underline opacity-50 hover:opacity-100">
            Back to Site
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#050505] dark:text-[#f8fafc] overflow-x-hidden font-sans pb-32">
      <header className="sticky top-0 z-50 glass border-b border-white/10 p-4 sticky-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => view === 'form' ? setView('list') : onNavigateLanding()}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black italic tracking-wide">
              {view === 'form' ? (editId ? 'Edit Post' : 'New Post') : 'Admin Panel'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {view === 'list' && (
              <button
                onClick={() => { setEditId(null); setForm(emptyForm); setPhotos([]); setView('form'); }}
                className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm hover:opacity-80 transition-all"
              >
                <Plus size={16} /> Create
              </button>
            )}
            <button onClick={() => signOut(auth)} className="opacity-50 hover:opacity-100 transition-opacity">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {view === 'list' && (
          <div className="space-y-6">
            {loadingPosts ? (
              <div className="text-center opacity-50 py-10 font-mono text-sm">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center opacity-50 py-10 font-mono text-sm">No posts yet</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <div key={post.id} className="glass rounded-[2rem] overflow-hidden group">
                    <div className="aspect-[4/3] bg-black/5 relative">
                      {post.cover && <img src={post.cover} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => handleEdit(post)} className="bg-white text-black p-3 rounded-full hover:scale-105 active:scale-95">
                          <Edit2 size={20} />
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="bg-red-500 text-white p-3 rounded-full hover:scale-105 active:scale-95">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${post.status === 'published' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                          {post.status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 bg-black/5 dark:bg-white/10 rounded-full uppercase">
                          {post.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight mb-1">{post.title}</h3>
                      <p className="opacity-50 text-xs truncate">{post.slug}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
            {/* Form Fields: Basically identical to original but slightly cleaned up */}
            <section className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <Type size={16} /> Basic Info & Section
              </label>
              <div className="glass p-6 rounded-[2rem] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required placeholder="Title (EN)" className="glass-input" value={form.title}
                    onChange={p => setForm({...form, title: p.target.value, slug: p.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                  <input required placeholder="Title (RU)" className="glass-input" value={form.titleRu} onChange={p => setForm({...form, titleRu: p.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input placeholder="Section (EN) e.g. Weddings" className="glass-input" value={form.section} onChange={p => setForm({...form, section: p.target.value})} />
                  <input placeholder="Section (RU) e.g. Свадьбы" className="glass-input" value={form.sectionRu} onChange={p => setForm({...form, sectionRu: p.target.value})} />
                </div>
                <input required placeholder="URL Slug" className="glass-input text-sm opacity-60" value={form.slug} readOnly />
              </div>
            </section>

            <section className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <Globe size={16} /> Category
              </label>
              <div className="glass p-6 rounded-[2.5rem] flex flex-col sm:flex-row gap-4">
                <select className="glass-input flex-1" value={form.type} onChange={p => setForm({...form, type: p.target.value as 'country' | 'theme'})}>
                  <option value="country">Country</option>
                  <option value="theme">Theme</option>
                </select>
                {form.type === 'country' ? (
                  <div className="flex-1 flex gap-4">
                    <input required placeholder="Country (EN)" className="glass-input flex-1" value={form.country} onChange={p => setForm({...form, country: p.target.value})} />
                    <input required placeholder="Country (RU)" className="glass-input flex-1" value={form.countryRu} onChange={p => setForm({...form, countryRu: p.target.value})} />
                  </div>
                ) : (
                  <div className="flex-1 flex gap-4">
                    <input required placeholder="Theme (EN)" className="glass-input flex-1" value={form.theme} onChange={p => setForm({...form, theme: p.target.value})} />
                    <input required placeholder="Theme (RU)" className="glass-input flex-1" value={form.themeRu} onChange={p => setForm({...form, themeRu: p.target.value})} />
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <FileText size={16} /> Content
              </label>
              <div className="glass p-6 rounded-[2rem] space-y-4">
                <input placeholder="Device / Camera Used" className="glass-input" value={form.device} onChange={p => setForm({...form, device: p.target.value})} />
                <textarea required placeholder="Description (EN)..." className="glass-input min-h-[120px]" value={form.description} onChange={p => setForm({...form, description: p.target.value})} />
                <textarea placeholder="Description (RU)..." className="glass-input min-h-[120px]" value={form.descriptionRu} onChange={p => setForm({...form, descriptionRu: p.target.value})} />
              </div>
            </section>

            <section className="space-y-4 relative">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <Upload size={16} /> Media (Upload in background)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 relative overflow-hidden group min-h-[200px]">
                  {form.cover ? (
                    <>
                      <img src={`${form.cover}${imageStats[form.cover] ? `?t=${imageStats[form.cover].timestamp}` : ''}`} className="absolute inset-0 w-full h-full object-cover" />
                      
                      {imageStats[form.cover] && (
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold ${imageStats[form.cover].sizeMb > 1.5 ? 'bg-orange-500 text-white' : 'bg-black/50 text-white'}`}>
                          {imageStats[form.cover].sizeMb.toFixed(2)} MB
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {imageStats[form.cover] && imageStats[form.cover].sizeMb > 1.5 && (
                          <button type="button" onClick={() => handleRecompress(form.cover)} className="px-4 py-2 bg-orange-500 rounded-full text-white text-xs font-bold shadow-lg">
                            🗜️ Compress
                          </button>
                        )}
                        <button type="button" onClick={() => setForm({...form, cover: ''})} className="p-2 bg-red-500 rounded-full text-white shadow-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="opacity-40" />
                      <span className="text-xs font-bold opacity-40 uppercase tracking-widest text-center">Primary Cover</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </>
                  )}
                </div>

                <div className="glass p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 relative overflow-hidden group min-h-[200px]">
                  <Upload className="opacity-40" />
                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest text-center">
                    Gallery ({photos.length}) <br/> Click to add more
                  </span>
                  <input type="file" multiple accept="image/*" onChange={e => handleFileUpload(e, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {photos.length > 0 && (
                <div className="glass p-4 rounded-[2rem] flex gap-4 overflow-x-auto snap-x">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden group snap-center">
                      <img src={`${p}${imageStats[p] ? `?t=${imageStats[p].timestamp}` : ''}`} className="w-full h-full object-cover" />
                      
                      {imageStats[p] && (
                        <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${imageStats[p].sizeMb > 1.5 ? 'bg-orange-500 text-white' : 'bg-black/50 text-white'}`}>
                          {imageStats[p].sizeMb.toFixed(2)}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {imageStats[p] && imageStats[p].sizeMb > 1.5 && (
                          <button type="button" onClick={() => handleRecompress(p)} className="p-1.5 bg-orange-500 rounded-full text-white shadow-lg">
                            🗜️
                          </button>
                        )}
                        <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="p-1.5 bg-red-500 rounded-full text-white shadow-lg">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <Youtube size={16} /> YouTube Links
              </label>
              <textarea placeholder="One link per line..." className="glass-input text-xs font-mono" rows={3} value={form.videos} onChange={p => setForm({...form, videos: p.target.value})} />
            </section>

            <section className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold opacity-60 ml-2">
                <Tag size={16} /> Metadata
              </label>
              <div className="glass p-6 rounded-[2rem] space-y-4">
                <input placeholder="Tags (comma separated)" className="glass-input" value={form.tags} onChange={p => setForm({...form, tags: p.target.value})} />
                <select className="glass-input" value={form.status} onChange={p => setForm({...form, status: p.target.value as 'published' | 'draft'})}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
              <div className="max-w-3xl mx-auto flex justify-end pointer-events-auto">
                <button
                  type="submit"
                  disabled={loading || !!uploadProgress}
                  className="bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-50 font-bold px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-3 transition-all active:scale-95"
                >
                  {loading ? 'Saving to Database...' : <><Save size={20} /> {editId ? 'Save Changes' : 'Create Post'}</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Progress UI */}
      <AnimatePresence>
        {uploadProgress && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 z-50 glass p-4 rounded-2xl flex items-center gap-4 max-w-sm"
          >
            <div className="w-10 h-10 border-4 border-black/10 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin flex-shrink-0" />
            <div className="flex-1 w-full min-w-0">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-xs truncate max-w-[150px]">{uploadProgress.file}</p>
                <p className="font-bold text-xs">{uploadProgress.progress}%</p>
              </div>
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div className="bg-black dark:bg-white h-full transition-all duration-300" style={{ width: `${uploadProgress.progress}%` }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
