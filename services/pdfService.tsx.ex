import { PdfDocument } from '../types';

// PDF 파일 목록 설정
// 파일은 public 폴더(또는 프로젝트 루트)에 위치해야 합니다.
// 파일명의 .ex를 지우고 사용햐세요. (전 구글드라이브에 pdf를 공유링크를 걸어서 썼음)
export const pdfDocuments: PdfDocument[] = [
  {
    id: 'doc1',
    title: 'MLA-000 V00.00',
    link: '링크',
    description: 'MLA-000 시험 준비 V00.00'
  }
];