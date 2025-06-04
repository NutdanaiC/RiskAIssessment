
import { RiskLevel } from './types'; 

// Safely access process.env.API_KEY
const rawApiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

// Ensure GEMINI_API_KEY is undefined if rawApiKey is not a real, non-placeholder string.
export const GEMINI_API_KEY: string | undefined =
    (typeof rawApiKey === 'string' && rawApiKey.trim() !== "" && rawApiKey !== "undefined" && rawApiKey !== "null")
    ? rawApiKey
    : undefined;

// Default model for text tasks, can be changed via UI
export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17'; 
// Available text models for selection
export const AVAILABLE_TEXT_MODELS = [
  'gemini-2.5-flash-preview-04-17',
  // Add other compatible text models here in the future
] as const; // 'as const' makes it a tuple of string literals for stricter typing

export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002'; // For image generation, not currently used for analysis

export const GEMINI_IMAGE_ANALYSIS_PROMPT_TEMPLATE = `
คุณคือผู้เชี่ยวชาญด้านความปลอดภัยในการทำงาน วิเคราะห์ภาพนี้เพื่อระบุความเสี่ยงด้านความปลอดภัยที่อาจเกิดขึ้นทั้งหมด สำหรับแต่ละความเสี่ยงที่ตรวจพบ โปรดให้ข้อมูลต่อไปนี้:
1.  'mask': ชุดของพิกัด [x,y] ที่ประกอบกันเป็นรูปหลายเหลี่ยม (polygon) ล้อมรอบพื้นที่ความเสี่ยง พิกัดควรเป็นค่า normalized ระหว่าง 0 ถึง 1 โดย (0,0) คือมุมซ้ายบนของภาพ และ (1,1) คือมุมขวาล่าง
2.  'box_2d': ขอบเขตสี่เหลี่ยม [x_min, y_min, x_max, y_max] ที่ล้อมรอบความเสี่ยง โดยพิกัดเป็นค่า normalized เช่นกัน
3.  'label': ชื่อความเสี่ยงหรือคำอธิบายสั้นๆ เป็นภาษาไทย (เช่น "นั่งร้านไม่มั่นคง", "สายไฟไม่เป็นระเบียบ", "ทำงานบนที่สูงไม่มีอุปกรณ์ป้องกัน")

ตอบกลับเป็นอาร์เรย์ JSON ของออบเจ็กต์เท่านั้น โดยแต่ละออบเจ็กต์มีคีย์ 'mask', 'box_2d', และ 'label' หากไม่พบความเสี่ยงใดๆ ให้ตอบกลับเป็นอาร์เรย์ว่าง []
ตัวอย่างผลลัพธ์:
[
  {
    "mask": [[0.1,0.2], [0.3,0.2], [0.3,0.4], [0.1,0.4]],
    "box_2d": [0.1, 0.2, 0.3, 0.4],
    "label": "กล่องวางซ้อนกันสูงเกินไป"
  }
]
`;

export const GEMINI_DETAILED_ASSESSMENT_PROMPT_TEMPLATE = (riskLabel: string): string => `
สำหรับความเสี่ยง "{RISK_LABEL}" ที่ระบุในภาพ และตามบริบทของภาพ:
โปรดทำการประเมินความเสี่ยงโดยละเอียดตามหลักการของ ISO 45001 และให้ข้อมูลต่อไปนี้เป็นภาษาไทยในรูปแบบ JSON เท่านั้น:
{
  "risk_name": "{RISK_LABEL}",
  "severity_score": <ตัวเลข 1-5 โดย 1=น้อยมาก, 5=รุนแรงที่สุด/ถึงแก่ชีวิต>,
  "likelihood_score": <ตัวเลข 1-5 โดย 1=เกิดยากมาก, 5=เกิดขึ้นบ่อยครั้ง/เกือบตลอดเวลา>,
  "risk_level_verbal_description": "คำอธิบายโดยละเอียดของระดับความเสี่ยงที่ประเมินได้จาก severity และ likelihood พร้อมเหตุผลประกอบ (เช่น 'ความเสี่ยงสูงเนื่องจากมีโอกาสพลัดตกจากที่สูงและอาจบาดเจ็บสาหัส')",
  "corrective_preventive_measures": ["มาตรการแก้ไข/ป้องกันที่ 1 (โปรดพิจารณา Hierarchy of Controls หากเป็นไปได้ เช่น การกำจัด, การทดแทน, การควบคุมเชิงวิศวกรรม, การควบคุมด้านบริหารจัดการ, PPE)", "มาตรการที่ 2", "..."],
  "international_standards_references": ["มาตรฐานสากลที่เกี่ยวข้อง เช่น ISO 45001, ISO 12100 (หากเกี่ยวข้อง)", "..."],
  "relevant_thai_laws": ["กฎหมายไทยที่เกี่ยวข้อง เช่น พ.ร.บ. ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554 มาตรา X", "..."],
  "kubota_standards_references": ["มาตรฐานคูโบต้าที่เกี่ยวข้อง (ถ้ามีข้อมูล หรือระบุว่า 'ไม่มีข้อมูลเฉพาะ')", "..."]
}
ตรวจสอบให้แน่ใจว่าผลลัพธ์เป็น JSON ที่ถูกต้องตามโครงสร้างนี้เท่านั้น แทนที่ {RISK_LABEL} ด้วย "${riskLabel}" จริง
`.replace(/{RISK_LABEL}/g, riskLabel);


export const THAI_LABELS = {
  APP_TITLE: 'RiskAIssessment',
  APP_SUBTITLE: 'ประเมินความเสี่ยงด้วย AI อัจฉริยะด้านภาพจาก Gemini',
  UPLOAD_PROMPT: 'เลือก หรือ ลากไฟล์รูปภาพมาวางที่นี่',
  UPLOAD_BUTTON: 'อัปโหลดรูปภาพ',
  ANALYZING_IMAGE: 'กำลังวิเคราะห์ภาพเบื้องต้น...',
  ANALYZING_RISK_DETAILS_BATCH: (total: number) => 
    `กำลังประเมินความเสี่ยงโดยละเอียดสำหรับ ${total} รายการ...`,
  NO_RISKS_FOUND: 'การวิเคราะห์เบื้องต้นเสร็จสิ้น ไม่พบความเสี่ยงที่ชัดเจน',
  NO_RISKS_FOUND_DISPLAY: 'ไม่พบความเสี่ยงในภาพนี้ หรือ AI ไม่สามารถระบุได้',
  IMAGE_PREVIEW: 'ภาพตัวอย่างและการตรวจจับ',
  RISK_SUMMARY: 'สรุปผลการประเมินความเสี่ยง',
  RISK_SUMMARY_EMPTY: 'ยังไม่มีการวิเคราะห์ความเสี่ยง',
  SORT_BY_RISK_LEVEL: 'เรียงตามระดับความเสี่ยง',
  DETAILED_REPORT: 'รายงานการประเมินความเสี่ยงโดยละเอียด',
  HAZARD_DESCRIPTION: 'ลักษณะอันตราย/ความเสี่ยง',
  SEVERITY: 'ความรุนแรง',
  LIKELIHOOD: 'โอกาสเกิด',
  RISK_LEVEL: 'ระดับความเสี่ยง',
  RISK_LEVEL_DESCRIPTION: 'คำอธิบายระดับความเสี่ยง',
  CORRECTIVE_MEASURES: 'มาตรการแก้ไข/ป้องกัน (ตาม Hierarchy of Controls)',
  INTERNATIONAL_STANDARDS: 'มาตรฐานสากลอ้างอิง',
  THAI_LAWS: 'กฎหมายไทยที่เกี่ยวข้อง',
  KUBOTA_STANDARDS: 'มาตรฐานคูโบต้า (ถ้ามี)',
  EXPORT_PDF: 'ส่งออกเป็น PDF',
  EXPORTING_PDF: 'กำลังส่งออก PDF...', 
  VIEW_HISTORY: 'ประวัติการประเมิน',
  ASSESSMENT_HISTORY: 'ประวัติการประเมินความเสี่ยง',
  NO_HISTORY: 'ยังไม่มีประวัติการประเมิน',
  LOAD_ASSESSMENT: 'โหลด',
  DELETE_ASSESSMENT: 'ลบ',
  CONFIRM_DELETE_TITLE: 'ยืนยันการลบ',
  CONFIRM_DELETE_MESSAGE: (name: string) => `คุณแน่ใจหรือไม่ว่าต้องการลบการประเมิน "${name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
  CANCEL: 'ยกเลิก',
  DELETE: 'ลบ',
  EDIT: 'แก้ไข', 
  CLOSE: 'ปิด',
  ERROR_GENERAL: 'เกิดข้อผิดพลาดบางอย่าง',
  ERROR_GEMINI: 'เกิดข้อผิดพลาดในการสื่อสารกับ Gemini API หรือการประมวลผลข้อมูล',
  ERROR_NO_IMAGE: 'กรุณาอัปโหลดรูปภาพก่อนทำการวิเคราะห์',
  ERROR_FILE_TYPE: 'ไฟล์รูปภาพไม่ถูกต้อง กรุณาเลือกไฟล์ JPG, PNG, หรือ WEBP',
  POWERED_BY_GEMINI: 'ขับเคลื่อนโดย Gemini API จาก Google',
  ASSESSMENT_FOR: 'การประเมินสำหรับ:',
  MASK_LABEL_PREFIX: 'ความเสี่ยง:',
  RISK: 'ความเสี่ยง',
  DETAILS: 'รายละเอียด',
  ACTIVE_RISK_LABEL: 'ความเสี่ยงที่เลือก:',
  NO_DETAILS_AVAILABLE: 'ไม่มีข้อมูลรายละเอียดสำหรับการประเมินนี้',
  DATE_TIME_ASSESSED: 'วันที่/เวลาประเมิน',
  REVEAL_ON_HOVER: 'แสดงเมื่อเมาส์ชี้',
  AI_MODEL_SETTINGS_TITLE: 'ตั้งค่าโมเดล AI',
  SELECT_TEXT_MODEL_LABEL: 'เลือกโมเดลสำหรับการวิเคราะห์',
};

export const HIERARCHY_OF_CONTROLS_ORDER = [
  /กำจัด/i, 
  /ทดแทน/i, 
  /วิศวกรรม/i, 
  /บริหารจัดการ/i, 
  /อุปกรณ์ป้องกันส่วนบุคคล|PPE/i 
];

export const RISK_LEVEL_COLORS: { [key in RiskLevel]: string } = {
  [RiskLevel.HIGH]: 'bg-red-500 text-white',
  [RiskLevel.MEDIUM]: 'bg-amber-500 text-black',
  [RiskLevel.LOW]: 'bg-emerald-500 text-black',
  [RiskLevel.NOT_ASSESSED]: 'bg-gray-500 text-white',
};

export const RISK_LEVEL_SORT_ORDER: { [key in RiskLevel]: number } = {
  [RiskLevel.HIGH]: 1,
  [RiskLevel.MEDIUM]: 2,
  [RiskLevel.LOW]: 3,
  [RiskLevel.NOT_ASSESSED]: 4,
};
