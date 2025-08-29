
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import SessionSidebar from './components/SessionSidebar';
import { ChatSession, ChatMessage } from './types';
import { getChatResponse } from './services/geminiService';
import PdfViewer from './components/PdfViewer';

const SESSIONS_KEY = 'chatSessions';

const createNewSession = (title = 'New Chat', documentContext: string | null = null, fileNames: string[] | null = null): ChatSession => ({
  id: Date.now().toString(),
  title,
  createdAt: new Date().toISOString(),
  messages: [
    {
      id: 'initial-message',
      role: 'model',
      content: "Hello! I'm your StudyMate AI. Ask me anything about your course, or upload your notes to get specific answers."
    }
  ],
  documentContext,
  fileNames,
});

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(SESSIONS_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
          setSessions(parsedSessions);
          setActiveSessionId(parsedSessions[0].id); // Activate the most recent
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      localStorage.removeItem(SESSIONS_KEY);
    }
    // If nothing loaded, create a default session
    const defaultSession = createNewSession();
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
  }, []);

  useEffect(() => {
    try {
      if (sessions.length > 0) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
    } catch (error) {
      console.error("Failed to save sessions:", error);
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  };
  
  //Handling sent message by user
  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!activeSession) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userInput };

    // Determine if a new title should be generated
    const isFirstUserMessageInNewChat = 
        activeSession.messages.length === 1 && 
        activeSession.title === 'New Chat' &&
        (!activeSession.fileNames || activeSession.fileNames.length === 0);

    const newTitle = isFirstUserMessageInNewChat
        ? (userInput.length > 30 ? userInput.substring(0, 27) + '...' : userInput)
        : activeSession.title;

    // Immediately update the UI with the user's message and new title
    const updatedSessionWithUserMessage = {
      ...activeSession,
      title: newTitle,
      messages: [...activeSession.messages, userMessage],
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId ? updatedSessionWithUserMessage : s));
    
    try {
        // Call Flask backend instead of local function
        const response = await fetch("http://localhost:5000/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": activeSession.id
          },
          body: JSON.stringify({ query: userInput })
        });


        if (!response.ok) {
          throw new Error("Backend error");
        }

        const data = await response.json();
        const responseContent = data.answer;  // Flask should return { "answer": "..." }

        const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseContent };
        
        // Update the session with the bot's response
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return { ...s, messages: [...s.messages, botMessage] };
            }
            return s;
        }));
    } catch (error) {
        const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: "I'm having trouble connecting right now. Please try again later." };
        
        // Update the session with the error message
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return { ...s, messages: [...s.messages, errorMessage] };
            }
            return s;
        }));
    }
  }, [activeSession, activeSessionId]);

  const handleNewSession = () => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const remainingSessions = sessions.filter(s => s.id !== id);
    if (remainingSessions.length === 0) {
      const newSession = createNewSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(remainingSessions);
      if (activeSessionId === id) {
        setActiveSessionId(remainingSessions[0].id);
      }
    }
  };

  const handleFileProcessed = (content: string, names: string[]) => {
    if (!activeSession) return;
    const isFresh = activeSession.messages.length <= 1 && (!activeSession.fileNames || activeSession.fileNames.length === 0);
    const newTitle = names.join(', ');
    if (isFresh) {
      updateSession(activeSession.id, {
        documentContext: content,
        fileNames: names,
        title: newTitle,
      });
    } else {
      const newSession = createNewSession(newTitle, content, names);
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    }
  };

  const handleFileReset = () => {
    if (activeSession) {
      updateSession(activeSession.id, {
        documentContext: null,
        fileNames: null,
        title: 'New Chat',
      });
    }
  };

  return (
    <div className="flex h-screen font-sans bg-gray-50 text-gray-800 overflow-hidden">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId || ''}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
      />
      <div className="flex flex-col flex-1 h-full relative">
        {isSidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)} 
            className="absolute inset-0 bg-black/30 z-10 lg:hidden"
            aria-hidden="true"
          />
        )}
        <Header onToggleSidebar={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 flex flex-col items-center p-4 overflow-hidden">
          
          <div className="w-full max-w-4xl h-full flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200">
            {activeSession && (
              <>
              
                <FileUpload
                  key={activeSession.id}
                  sessionId={activeSession.id}
                  fileNames={activeSession.fileNames}
                  messages={activeSession.messages}
                  sessionTitle={activeSession.title}
                  onFileProcessed={handleFileProcessed}
                  onFileReset={handleFileReset}
                />
                <ChatInterface
                  messages={activeSession.messages}
                  onSendMessage={handleSendMessage}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
