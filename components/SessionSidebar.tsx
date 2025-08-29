
import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon, TrashIcon } from './Icons';

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
}) => {
  return (
    <aside
      className={`absolute lg:relative flex flex-col h-full bg-gray-800 text-white transition-transform duration-300 ease-in-out z-20 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 w-64 flex-shrink-0`}
    >
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
        >
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <div
                className={`group flex items-center justify-between p-3 rounded-md cursor-pointer ${
                  session.id === activeSessionId
                    ? 'bg-indigo-600'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <span className="truncate flex-1 pr-2">{session.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 flex-shrink-0"
                    aria-label="Delete session"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 text-xs text-center text-gray-500 border-t border-gray-700">
        StudyMate AI Sessions
      </div>
    </aside>
  );
};

export default SessionSidebar;
