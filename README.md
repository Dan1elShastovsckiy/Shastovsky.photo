A high-performance, full-stack photography portfolio and travel blog application built with **React**, **Vite**, **Express**, and **Firebase**. Features a sleek "Bento-grid" masonry layout, a fully integrated admin dashboard, and automated image optimization.

## ✨ Features

- **Dynamic Bento Grid Layout**: Responsive, magazine-like image gallery that adapts to mobile and desktop screens gracefully.
- **Dark / Light Mode**: Integrated system and toggleable theme support with smooth transitions.
- **Bilingual Support (i18n)**: Built-in English and Russian translations.
- **Admin Panel**: Secure dashboard (protected by Firebase Auth) to create, edit, and manage posts.
- **Intelligent Image Uploads**: 
  - Express backend uses `multer` and `sharp` to automatically convert uploaded images into highly optimized `.webp` formats.
  - Automatically generates thumbnails for fast-loading grid views.
  - Built-in compression analyzer in the admin panel to further compress images over 1.5MB on demand.
- **SEO & Performance Optimized**: Generates dynamic meta tags based on the viewed post. Uses lazy loading and `framer-motion` for buttery smooth transitions.

## 🛠️ Tech Stack

**Frontend:**
- [React 19](https://react.dev/) / [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://motion.dev/) (motion/react) for animations
- [Lucide React](https://lucide.dev/) for icons

**Backend:**
- [Express.js](https://expressjs.com/) (handles API requests and frontend static serving)
- [Multer](https://github.com/expressjs/multer) & [Sharp](https://sharp.pixelplumbing.com/) (for backend image processing & storage)

**Database & Auth:**
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (Post data storage)
- [Firebase Authentication](https://firebase.google.com/docs/auth) (Admin Google Sign-in)

---

## 🚀 Getting Started

If you want to clone this project and run it for your own portfolio, follow these steps.

### 1. Prerequisites

- **Node.js**: v18+ is recommended.
- **Firebase Project**: You must create a free project on [Firebase Console](https://console.firebase.google.com/).
  - Enable **Firestore Database**.
  - Enable **Authentication** (Google Login).

### 2. Clone and Install

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository
npm install
```

### License
This project is open-sourced under the MIT License. Feel free to clone, modify, and use it for your own stunning photography portfolio!