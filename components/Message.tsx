import React, { useState, useCallback } from 'react';
import { ChatMessage } from '../types';
import { BotIcon, UserIcon, CopyIcon, CheckIcon } from './Icons';

interface MessageProps {
  message: ChatMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isModel = message.role === 'model';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (isCopied) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }, [message.content, isCopied]);

  const copyButton = (
    <button
      onClick={handleCopy}
      className={`absolute -top-3 p-1.5 bg-white border border-gray-200 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 ${
        isModel ? '-right-3' : '-left-3'
      }`}
      aria-label="Copy message"
    >
      {isCopied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );

  return (
    <div className={`flex items-start gap-4 group ${isModel ? '' : 'justify-end'}`}>
      {isModel && (
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white flex-shrink-0">
          <BotIcon />
        </div>
      )}
      <div
        className={`relative max-w-xl px-5 py-3 rounded-2xl shadow-sm ${
          isModel
            ? 'bg-gray-100 text-gray-800 rounded-tl-none'
            : 'bg-indigo-600 text-white rounded-br-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.id !== 'initial-message' && copyButton}
      </div>
       {!isModel && (
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-300 text-gray-700 flex-shrink-0">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default Message;