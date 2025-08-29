
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { DownloadIcon, FullscreenIcon } from './Icons';

interface PdfViewerProps {
  urls: string[];
  fileNames: string[] | null;
}

interface PdfPageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  scale: number;
}

const PdfPage: React.FC<PdfPageProps> = memo(({ pdfDoc, pageNum, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(pageNum);
                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;
                
                const viewport = page.getViewport({ scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                };
                await page.render(renderContext).promise;
            } catch (err) {
                console.error(`Error rendering page ${pageNum}:`, err);
            }
        };
        renderPage();
    }, [pdfDoc, pageNum, scale]);

    return <canvas ref={canvasRef} data-page-number={pageNum} className="mb-4 shadow-lg bg-white" />;
});


const PdfViewer: React.FC<PdfViewerProps> = ({ urls, fileNames }) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.5);
  const [zoomMode, setZoomMode] = useState('page-width');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!urls || urls.length === 0) {
        setIsLoading(false);
        setError("No PDF file provided.");
        return;
    };
    const url = urls[0]; // Display the first PDF
    
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);

    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(pdf => {
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setPageInput('1');
      setIsLoading(false);
    }).catch(err => {
      console.error("Error loading PDF:", err);
      setError("Failed to load PDF file.");
      setIsLoading(false);
    });

  }, [urls]);

  // Calculate scale based on zoom mode and container size
  const calculateAndSetScale = useCallback(() => {
    if (!pdfDoc || !scrollContainerRef.current) return;
    
    pdfDoc.getPage(1).then(page => {
      const container = scrollContainerRef.current;
      if (zoomMode === 'page-width') {
        const pageWidth = page.getViewport({ scale: 1 }).width;
        // Subtract padding/scrollbar width for better fit
        const newScale = (container.clientWidth - 32) / pageWidth;
        setScale(newScale);
      } else if (zoomMode === 'page-fit') {
        const viewport = page.getViewport({ scale: 1 });
        const newScale = Math.min(
            (container.clientHeight - 32) / viewport.height, 
            (container.clientWidth - 32) / viewport.width
        );
        setScale(newScale);
      } else {
        setScale(parseFloat(zoomMode));
      }
    });
  }, [pdfDoc, zoomMode]);

  useEffect(() => {
    calculateAndSetScale();
    window.addEventListener('resize', calculateAndSetScale);
    return () => window.removeEventListener('resize', calculateAndSetScale);
  }, [calculateAndSetScale]);


  // Update current page on scroll using IntersectionObserver
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || numPages === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1');
                    setCurrentPage(pageNum);
                    setPageInput(pageNum.toString());
                }
            });
        },
        { root: scrollContainer, threshold: 0.5 }
    );

    const canvases = scrollContainer.querySelectorAll('canvas[data-page-number]');
    canvases.forEach(canvas => observer.observe(canvas));

    return () => canvases.forEach(canvas => observer.unobserve(canvas));
  }, [numPages, scale]); // Rerun when pages are rendered/resized

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= numPages) {
        const pageElement = scrollContainerRef.current?.querySelector(`[data-page-number="${page}"]`);
        pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } else {
        setPageInput(currentPage.toString()); // Reset to valid page
    }
  };

  const handleDownload = () => {
    if (!urls || urls.length === 0) return;
    const url = urls[0];
    const name = fileNames?.[0] || 'document.pdf';
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleFullscreen = () => {
    const elem = viewerContainerRef.current;
    if (!elem) return;
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  const ControlButton: React.FC<{onClick?: () => void, children: React.ReactNode, ariaLabel: string, title: string}> = 
    ({onClick, children, ariaLabel, title}) => (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            title={title}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-800 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
        >
            {children}
        </button>
  );

  return (
    <div ref={viewerContainerRef} className="flex flex-col h-full w-full bg-gray-100">
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex-1"></div> {/* Spacer */}

        <div className="flex items-center gap-2 flex-1 justify-center">
            {pdfDoc && (
                <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={() => { if(pageInput === '') setPageInput(currentPage.toString()) }}
                        className="w-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        aria-label="Current page number"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        / {numPages}
                    </span>
                </form>
            )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
            <select
              value={zoomMode}
              onChange={(e) => setZoomMode(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              aria-label="Zoom level"
            >
              <option value="page-fit">Page Fit</option>
              <option value="page-width">Page Width</option>
              <option value="1">100%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
            <ControlButton onClick={handleDownload} ariaLabel="Download PDF" title="Download PDF"><DownloadIcon /></ControlButton>
            <ControlButton onClick={handleFullscreen} ariaLabel="Toggle fullscreen" title="Fullscreen"><FullscreenIcon /></ControlButton>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4 flex flex-col items-center">
        {isLoading && <div className="text-gray-600 m-auto">Loading document...</div>}
        {error && <div className="text-red-600 m-auto">{error}</div>}
        {pdfDoc && !isLoading && !error && (
            <div>
                {Array.from(new Array(numPages), (_, index) => (
                    <PdfPage
                        key={`page_${index + 1}`}
                        pdfDoc={pdfDoc}
                        pageNum={index + 1}
                        scale={scale}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
