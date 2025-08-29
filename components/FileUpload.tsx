import React, { useRef, useCallback, useState } from 'react';
import { UploadIcon, FileTextIcon, XCircleIcon, DownloadIcon } from './Icons';
import { ChatMessage } from '../types';

interface FileUploadProps {
  sessionId: string;
  fileNames: string[] | null;
  messages: ChatMessage[];
  sessionTitle: string;
  onFileProcessed: (content: string, names: string[], files: File[]) => void;
  onFileReset: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({sessionId, fileNames, messages, sessionTitle, onFileProcessed, onFileReset }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      setError('No PDF files selected. Please upload at least one .pdf file.');
      return;
    }
    
    if (pdfFiles.length < files.length) {
      setError('Some files were not PDFs and were ignored.');
    } else {
      setError(null);
    }

    try {
      // Send PDFs to Flask backend
      const formData = new FormData();
      pdfFiles.forEach(file => formData.append("files", file));
      console.log("Sending sessionID: ", sessionId);
      const response = await fetch("http://localhost:5000/upload_pdfs", {
        method: "POST",
        headers: {
          "X-Session-ID": sessionId,
        },
        body: formData
      });


      if (!response.ok) {
        throw new Error("Failed to process PDF(s) on backend.");
      }

      const result = await response.json();
      // result should contain { combined_text: string, file_names: string[] }

      onFileProcessed(result.combined_text, result.file_names, pdfFiles);

    } catch (err) {
      console.error("Error sending PDFs to backend:", err);
      setError('Failed to parse one or more PDF files.');
    } finally {
      if(event.target) event.target.value = "";
    }
  }, [onFileProcessed]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
    
  const handleReset = () => {
    setError(null);
    onFileReset();
  };
    
  const handleDownload = () => {
    const title = `StudyMate Q&A Session: ${sessionTitle}`;
    const date = `Downloaded on: ${new Date().toLocaleString()}`;
    const files = fileNames && fileNames.length > 0 ? `Context from: ${fileNames.join(', ')}` : 'Context: No files provided.';

    const chatHistory = messages
      .slice(1) // Remove initial welcome message
      .map(msg => {
        const prefix = msg.role === 'user' ? 'You' : 'StudyMate';
        return `${prefix}:\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    const content = `${title}\n${date}\n${files}\n\n================================\n\n${chatHistory}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = sessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeTitle}_chat_history.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf"
        multiple
      />
      {(!fileNames || fileNames.length === 0) ? (
        <button
          onClick={handleButtonClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-colors"
        >
          <UploadIcon />
          <span>Upload Study Notes (.pdf files)</span>
        </button>
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-blue-800 min-w-0">
                <FileTextIcon />
                <span className="font-medium truncate" title={fileNames.join(', ')}>{fileNames.join(', ')}</span>
                <span className="text-sm text-blue-600 flex-shrink-0">(Context enabled)</span>
              </div>
              <div className='flex items-center gap-2 flex-shrink-0'>
                {messages.length > 1 && (
                    <button onClick={handleDownload} className="p-1 text-gray-500 hover:text-indigo-600 transition-colors" aria-label="Download chat">
                        <DownloadIcon />
                    </button>
                )}
                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-600 transition-colors" aria-label="Reset files">
                  <XCircleIcon />
                </button>
              </div>
            </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default FileUpload;
