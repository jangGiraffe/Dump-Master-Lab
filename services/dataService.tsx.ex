// Configuration for data sources
// 파일명의 .ex를 지우고 사용햐세요.

/**
 * 문제 은행 데이터 설정 (Data Configuration)
 * 
 * 각 항목 설명:
 * - id: 고유 식별자 (중복 불가)
 * - name: UI에 표시될 문제 은행 이름
 * - url: public/dump 폴더 내의 JSON 파일 경로
 * - examCode: 시험 코드 (예: MLA-C01). 같은 코드를 가진 항목끼리 그룹화됩니다.
 * - examName: 시험 전체 이름 (예: AWS Certified Machine Learning - Specialty)
 * - requiredTier: 접근 권한 ('N': 일반, 'V': VIP)
 */
 
export const dataSources = [
  {
    id: 'kr-100Q-by-Gemini',
    name: 'MLA-C01-100Q-by-Gemini (KR)',
    url: 'dump/MLA-C01-100Q-by-Gemini.json',
    examCode: 'MLA-C01',
    examName: 'AWS Certified Machine Learning - Specialty',
    requiredTier: 'N'
  }
];