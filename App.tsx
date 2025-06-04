
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { THAI_LABELS, RISK_LEVEL_SORT_ORDER, AVAILABLE_TEXT_MODELS } from './constants';
import type { AnalyzedRisk, AssessmentRecord, TextModelId } from './types';
import { RiskLevel } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ImageDisplay } from './components/ImageDisplay';
import { RiskAnalysisPanel } from './components/RiskAnalysisPanel';
import { LoadingSpinner } from './components/LoadingSpinner';
import PdfExportButton from './components/PdfExportButton';
import { HistoryModal } from './components/HistoryModal';
import { getAssessmentHistory, saveAssessmentToHistory, deleteAssessmentFromHistory } from './services/historyService';
import { analyzeImageWithGemini, getDetailedRiskAssessmentFromGemini } from './services/geminiService';
import { calculateRiskLevel } from './utils/riskCalculator';

const App: React.FC = () => {
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzedRisks, setAnalyzedRisks] = useState<AnalyzedRisk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRecord[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [revealOnHover, setRevealOnHover] = useState(false);
  const [selectedTextModel, setSelectedTextModel] = useState<TextModelId>(AVAILABLE_TEXT_MODELS[0]);


  useEffect(() => {
    setAssessmentHistory(getAssessmentHistory());
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    setUploadedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
      setAnalyzedRisks([]);
      setCurrentError(null);
      setCurrentAssessmentId(null); 
    };
    reader.readAsDataURL(file);
  }, []);

  const processImageAnalysis = useCallback(async () => {
    if (!imageUrl || !uploadedImageFile) {
      setCurrentError(THAI_LABELS.ERROR_NO_IMAGE);
      return;
    }

    setIsLoading(true);
    setLoadingMessage(THAI_LABELS.ANALYZING_IMAGE);
    setCurrentError(null);
    setAnalyzedRisks([]);

    try {
      const base64ImageData = imageUrl.split(',')[1];
      const detectedCores = await analyzeImageWithGemini(base64ImageData, selectedTextModel);

      if (detectedCores.length === 0) {
        setLoadingMessage(THAI_LABELS.NO_RISKS_FOUND);
        setAnalyzedRisks([]); // Ensure risks are cleared
        setTimeout(() => setIsLoading(false), 1500);
        
        const newAssessmentId = crypto.randomUUID();
        setCurrentAssessmentId(newAssessmentId);
        const newRecord: AssessmentRecord = {
            id: newAssessmentId,
            timestamp: Date.now(),
            imageName: uploadedImageFile.name,
            imageUrl,
            analyzedRisks: [],
            assessmentTitle: `${THAI_LABELS.ASSESSMENT_FOR} ${uploadedImageFile.name}`
        };
        saveAssessmentToHistory(newRecord);
        setAssessmentHistory(prev => [newRecord, ...prev.filter(r => r.id !== newRecord.id)]);
        return;
      }
      
      setLoadingMessage(THAI_LABELS.ANALYZING_RISK_DETAILS_BATCH(detectedCores.length));

      const detailFetchOperations = detectedCores.map(core =>
        getDetailedRiskAssessmentFromGemini(core.label, base64ImageData, selectedTextModel)
      );

      const detailedResultsSettled = await Promise.allSettled(detailFetchOperations);

      const newAnalyzedRisks: AnalyzedRisk[] = detectedCores.map((core, index) => {
        const result = detailedResultsSettled[index];
        if (result.status === 'fulfilled') {
          const detailedAssessment = result.value;
          return {
            ...core,
            detailedAssessment,
            calculatedRiskLevel: calculateRiskLevel(detailedAssessment.severity, detailedAssessment.likelihood)
          };
        } else { // status === 'rejected'
          console.warn(`Error fetching details for risk "${core.label}":`, result.reason);
          return {
            ...core,
            detailedAssessment: undefined,
            calculatedRiskLevel: RiskLevel.NOT_ASSESSED
          };
        }
      });
      
      setAnalyzedRisks(newAnalyzedRisks);
      
      const newAssessmentId = crypto.randomUUID();
      setCurrentAssessmentId(newAssessmentId);
      const newRecord: AssessmentRecord = {
        id: newAssessmentId,
        timestamp: Date.now(),
        imageName: uploadedImageFile.name,
        imageUrl,
        analyzedRisks: newAnalyzedRisks,
        assessmentTitle: `${THAI_LABELS.ASSESSMENT_FOR} ${uploadedImageFile.name}`
      };
      saveAssessmentToHistory(newRecord);
      setAssessmentHistory(prev => [newRecord, ...prev.filter(r => r.id !== newRecord.id)]);

    } catch (error) {
      console.error("Error processing image analysis:", error);
      setCurrentError(error instanceof Error ? error.message : THAI_LABELS.ERROR_GEMINI);
      setAnalyzedRisks([]); // Clear risks on major error
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [imageUrl, uploadedImageFile, selectedTextModel]);
  
  useEffect(() => {
    if (imageUrl && uploadedImageFile && analyzedRisks.length === 0 && !isLoading && !currentError && !currentAssessmentId) {
        processImageAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, uploadedImageFile, processImageAnalysis, isLoading, currentError, currentAssessmentId]);


  const handleDeleteHistoryItem = (id: string) => {
    deleteAssessmentFromHistory(id);
    setAssessmentHistory(getAssessmentHistory());
    if (currentAssessmentId === id) { 
      setUploadedImageFile(null);
      setImageUrl(null);
      setAnalyzedRisks([]);
      setCurrentAssessmentId(null);
    }
  };
  
  const handleLoadHistoryItem = (record: AssessmentRecord) => {
    const mockFile = new File([], record.imageName, { type: "image/png" }); 
    setUploadedImageFile(mockFile);
    setImageUrl(record.imageUrl);
    setAnalyzedRisks(record.analyzedRisks);
    setCurrentAssessmentId(record.id);
    setCurrentError(null);
    setIsHistoryModalOpen(false);
  };

  const sortedAnalyzedRisks = useMemo(() => {
    if (!analyzedRisks) return [];
    return [...analyzedRisks].sort((a, b) => {
      return RISK_LEVEL_SORT_ORDER[a.calculatedRiskLevel] - RISK_LEVEL_SORT_ORDER[b.calculatedRiskLevel] || a.label.localeCompare(b.label, 'th');
    });
  }, [analyzedRisks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">{THAI_LABELS.APP_TITLE}</h1>
        <p className="text-gray-400 mt-2">{THAI_LABELS.APP_SUBTITLE}</p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 p-6 bg-gray-800 rounded-xl shadow-2xl">
          <ImageUploader onImageUpload={handleImageUpload} disabled={isLoading} />
          
          <div className="space-y-2">
            <label htmlFor="model-select" className="block text-sm font-medium text-sky-300">{THAI_LABELS.AI_MODEL_SETTINGS_TITLE}</label>
            <select
              id="model-select"
              value={selectedTextModel}
              onChange={(e) => setSelectedTextModel(e.target.value as TextModelId)}
              disabled={isLoading}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block p-2.5 placeholder-gray-400 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="" disabled className="text-gray-500">{THAI_LABELS.SELECT_TEXT_MODEL_LABEL}</option>
              {AVAILABLE_TEXT_MODELS.map(modelId => (
                <option key={modelId} value={modelId}>{modelId}</option>
              ))}
            </select>
          </div>

          {currentError && <p className="text-red-400 bg-red-900/50 border border-red-700 p-3 rounded-md">{currentError}</p>}
          
          <div className="flex space-x-4">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <HistoryIcon className="w-5 h-5 mr-2"/>
              {THAI_LABELS.VIEW_HISTORY}
            </button>
            {sortedAnalyzedRisks.length > 0 && imageUrl && (
               <PdfExportButton 
                risks={sortedAnalyzedRisks} 
                imageUrl={imageUrl} 
                imageName={uploadedImageFile?.name || 'assessment.jpg'} 
                assessmentTitle={currentAssessmentId ? assessmentHistory.find(r=>r.id === currentAssessmentId)?.assessmentTitle : `${THAI_LABELS.ASSESSMENT_FOR} ${uploadedImageFile?.name || 'assessment.jpg'}`}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isLoading && <LoadingSpinner message={loadingMessage} />}
          
          {!isLoading && imageUrl && (
            <div id="image-preview-for-pdf" className="bg-gray-800 p-6 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-sky-400">{THAI_LABELS.IMAGE_PREVIEW}</h2>
                {sortedAnalyzedRisks.length > 0 && (
                  <label htmlFor="reveal-on-hover-checkbox" className="flex items-center text-sm text-gray-300 cursor-pointer">
                    <input
                      id="reveal-on-hover-checkbox"
                      type="checkbox"
                      checked={revealOnHover}
                      onChange={(e) => setRevealOnHover(e.target.checked)}
                      className="mr-2 h-4 w-4 rounded text-sky-500 focus:ring-sky-400 bg-gray-700 border-gray-600"
                    />
                    {THAI_LABELS.REVEAL_ON_HOVER}
                  </label>
                )}
              </div>
              <ImageDisplay 
                imageUrl={imageUrl} 
                sortedRisks={sortedAnalyzedRisks} 
                onRiskHover={setActiveRiskId} 
                onRiskClick={setActiveRiskId} 
                activeRiskId={activeRiskId}
                revealOnHover={revealOnHover}
              />
            </div>
          )}

          {!isLoading && sortedAnalyzedRisks.length > 0 && (
             <RiskAnalysisPanel risks={sortedAnalyzedRisks} activeRiskId={activeRiskId} setActiveRiskId={setActiveRiskId} />
          )}
          {!isLoading && !currentError && imageUrl && analyzedRisks.length === 0 && (!uploadedImageFile || !uploadedImageFile.name.startsWith("mockFile_")) && ( 
             <div className="bg-gray-800 p-6 rounded-xl shadow-2xl text-center">
                <p className="text-gray-400 text-lg">{THAI_LABELS.NO_RISKS_FOUND_DISPLAY}</p>
             </div>
          )}
        </div>
      </div>
      
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={assessmentHistory}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
      />
      <footer className="text-center mt-12 py-4 border-t border-gray-700">
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} RiskAIssessment. {THAI_LABELS.POWERED_BY_GEMINI}</p>
      </footer>
    </div>
  );
};

const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default App;
