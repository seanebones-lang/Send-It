/**
 * Example repositories for quick testing
 * These are popular, well-maintained projects that demonstrate different frameworks
 */

export interface ExampleRepository {
  id: string;
  name: string;
  url: string;
  framework: string;
  description: string;
  icon: string; // Emoji or icon name
  color: string; // Tailwind color class
  stars: string; // Approximate star count
}

export const exampleRepositories: ExampleRepository[] = [
  {
    id: 'nextjs',
    name: 'Next.js Starter',
    url: 'https://github.com/vercel/next.js',
    framework: 'Next.js',
    description: 'The React framework for production - perfect for Vercel',
    icon: '⚡',
    color: 'from-black to-gray-800',
    stars: '120k+',
  },
  {
    id: 'vite-react',
    name: 'Vite + React',
    url: 'https://github.com/vitejs/vite',
    framework: 'Vite',
    description: 'Next generation frontend tooling - blazing fast',
    icon: '⚡',
    color: 'from-purple-600 to-blue-600',
    stars: '65k+',
  },
  {
    id: 'create-react-app',
    name: 'Create React App',
    url: 'https://github.com/facebook/create-react-app',
    framework: 'React',
    description: 'Set up a modern web app by running one command',
    icon: '⚛️',
    color: 'from-blue-500 to-cyan-500',
    stars: '102k+',
  },
  {
    id: 'vue',
    name: 'Vue.js',
    url: 'https://github.com/vuejs/core',
    framework: 'Vue',
    description: 'Progressive JavaScript framework for building UIs',
    icon: '🖖',
    color: 'from-green-500 to-emerald-600',
    stars: '45k+',
  },
  {
    id: 'nuxt',
    name: 'Nuxt.js',
    url: 'https://github.com/nuxt/nuxt',
    framework: 'Nuxt',
    description: 'The Intuitive Vue Framework for web applications',
    icon: '💚',
    color: 'from-green-600 to-teal-600',
    stars: '52k+',
  },
];
