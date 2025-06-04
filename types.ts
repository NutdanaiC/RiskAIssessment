
import { AVAILABLE_TEXT_MODELS } from './constants';

export enum RiskLevel {
  HIGH = 'สูง',
  MEDIUM = 'กลาง',
  LOW = 'ต่ำ',
  NOT_ASSESSED = 'ยังไม่ได้ประเมิน'
}

export interface SeverityLikelihood {
  severity: number; // 1-5
  likelihood: number; // 1-5
}

// Data structure directly from Gemini for initial detection
export interface RawGeminiDetection {
  mask: Array<[number, number]>; // Polygon points [x,y] normalized (0-1)
  box_2d: [number, number, number, number]; // [x_min, y_min, x_max, y_max] normalized (0-1)
  label: string; // Thai: e.g., "นั่งร้านไม่มั่นคง"
}
export type RawGeminiDetectionResponse = RawGeminiDetection[];


// Core information about a detected risk after parsing/normalization
export interface DetectedRiskCore {
  id: string; // UUID
  maskPoints: Array<[number, number]>; // Polygon points [x,y] in image pixel coordinates
  boundingBox: [number, number, number, number]; // [x,y,w,h] in image pixel coordinates
  label: string; 
}

// Data structure directly from Gemini for detailed assessment
export interface RawGeminiDetailedAssessment {
  risk_name: string; // Should match the label given
  severity_score: number; // 1-5
  likelihood_score: number; // 1-5
  risk_level_verbal_description: string;
  corrective_preventive_measures: string[];
  international_standards_references: string[];
  relevant_thai_laws: string[];
  kubota_standards_references?: string[];
}
export type RawGeminiDetailedResponse = RawGeminiDetailedAssessment;


// Parsed and processed detailed assessment information
export interface DetailedAssessment {
  severity: number; 
  likelihood: number; 
  riskLevelDescription: string; 
  correctivePreventiveMeasures: string[];
  internationalStandards: string[];
  thaiLaws: string[];
  kubotaStandards?: string[];
}

// Fully analyzed risk, combining core detection with detailed assessment
export interface AnalyzedRisk extends DetectedRiskCore {
  detailedAssessment?: DetailedAssessment; // Optional if detailed analysis fails
  calculatedRiskLevel: RiskLevel;
}

// Structure for storing/retrieving assessment history
export interface AssessmentRecord {
  id: string; // uuid
  timestamp: number;
  imageName: string;
  imageUrl: string; // dataURL of the image used
  analyzedRisks: AnalyzedRisk[];
  assessmentTitle: string;
}

// Type for selectable text model IDs
export type TextModelId = typeof AVAILABLE_TEXT_MODELS[number];
