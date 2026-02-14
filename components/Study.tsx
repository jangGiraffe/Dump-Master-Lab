import React, { useState } from 'react';
import { pdfDocuments } from '../services/pdfService';
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react';

interface StudyProps {
  onBack: () => void;
}

export const Study: React.FC<StudyProps> = ({ onBack }) => {
  const [selectedPdf, setSelectedPdf] = useState(pdfDocuments[0] || null);
  // Default to showing the list on mobile
  const [showMobileList, setShowMobileList] = useState(true);

  const getEmbedUrl = (url: string) => {
    // Convert Google Drive view links to preview links for better embedding
    if (url.includes('drive.google.com') && url.includes('/view')) {
      return url.replace('/view', '/preview');
    }
    return url;
  };

  const handlePdfSelect = (doc: any) => {
    setSelectedPdf(doc);
    setShowMobileList(false); // Switch to viewer on mobile
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow bg-gray-100 overflow-hidden">
      {/* Sidebar - PDF List */}
      <div className={`
        bg-white border-r border-gray-200 flex-col z-20 shadow-sm
        md:w-80 md:flex md:static md:h-full
        ${showMobileList ? 'flex absolute inset-0 w-full h-full' : 'hidden'}
      `}>
        <div className="p-4 border-b border-gray-100 flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            title="메뉴로 돌아가기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-gray-800">학습 자료실</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pdfDocuments.length === 0 ? (
            <div className="text-center p-4 text-gray-400 text-sm">
              설정된 자료가 없습니다.
            </div>
          ) : (
            pdfDocuments.map(doc => (
              <div
                key={doc.id}
                onClick={() => handlePdfSelect(doc)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedPdf?.id === doc.id
                    ? 'bg-blue-50 border-primary text-primary'
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                  }`}
              >
                <div className="flex items-start">
                  <FileText className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${selectedPdf?.id === doc.id ? 'text-primary' : 'text-gray-400'}`} />
                  <div>
                    <h3 className="font-medium text-sm leading-snug">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 bg-gray-50 text-xs text-gray-400 border-t text-center">
          자료 위치: Google Drive
        </div>
      </div>

      {/* Main Content - PDF Viewer */}
      <div className={`
        flex-col h-full bg-gray-200 relative
        md:flex md:flex-1
        ${!showMobileList ? 'flex w-full h-full' : 'hidden'}
      `}>
        {/* Mobile Header with Back to List button */}
        <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
          <button
            onClick={() => setShowMobileList(true)}
            className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            목록
          </button>
          <span className="font-medium text-sm truncate max-w-[200px] text-gray-800">
            {selectedPdf?.title || "문서 보기"}
          </span>
          <div className="w-12"></div> {/* Spacer for balance */}
        </div>

        {selectedPdf ? (
          <iframe
            src={getEmbedUrl(selectedPdf.link)}
            className="w-full h-full border-none flex-1"
            title={selectedPdf.title}
            allow="autoplay"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-16 h-16 mb-4 text-gray-300" />
            <p>문서를 선택하여 읽기를 시작하세요</p>
          </div>
        )}

        {/* Open in new tab button */}
        {selectedPdf && (
          <div className="absolute bottom-4 right-4 md:bottom-4 md:right-4 pointer-events-auto">
            <a
              href={selectedPdf.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/90 backdrop-blur p-2 px-3 rounded-lg shadow-lg border border-gray-200 text-xs text-primary font-medium flex items-center hover:bg-white transition-colors"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              새 창에서 열기
            </a>
          </div>
        )}
      </div>
    </div>
  );
};