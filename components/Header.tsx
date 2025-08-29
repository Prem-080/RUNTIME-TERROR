
import React from 'react';
import { MenuIcon } from './Icons';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="w-full bg-white shadow-md p-4 border-b border-gray-200 z-10 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex justify-center items-center relative">
        <button
          onClick={onToggleSidebar}
          className="absolute left-0 p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors lg:hidden"
          aria-label="Toggle session history"
        >
          <MenuIcon />
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            <span role="img" aria-label="graduation cap" className="mr-2">🎓</span>
            StudyMate Q&A AI
          </h1>
          <p className="text-md text-gray-500 mt-1">Your personal AI-powered study partner</p>
        </div>
      </div>
    </header>
  );
};

export default Header;




