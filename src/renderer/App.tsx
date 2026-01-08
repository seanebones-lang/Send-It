import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <header className="p-6 shadow-md dark:shadow-gray-800 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Send-It</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Send-It</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Auto Prototype Deployment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900">
              <h3 className="text-xl font-semibold mb-2">Git Operations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your git repository operations
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md dark:shadow-gray-900">
              <h3 className="text-xl font-semibold mb-2">Deploy</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Deploy your prototypes automatically
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
