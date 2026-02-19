
export interface ExamInfo {
    code: string;
    name: string;
    description: string;
    category: string;
    officialTimeLimitMinutes?: number;
    officialQuestionCount?: number;
}

export const examsInfo: Record<string, ExamInfo> = {
    'MLA-C01': {
        code: 'MLA-C01',
        name: 'AWS Certified Machine Learning - Specialty',
        description: '기계 학습 아키텍처 설계, 구현 및 고도화 능력을 검증하는 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 180,
        officialQuestionCount: 65
    },
    'SAMPLE': {
        code: 'SAMPLE',
        name: 'Sample Exam Questions',
        description: '체험하기 및 일반 회원을 위한 무료 샘플 문제 모음입니다.',
        category: 'Practice',
        officialTimeLimitMinutes: 30,
        officialQuestionCount: 10
    },
    'CLF-C02': {
        code: 'CLF-C02',
        name: 'AWS Certified Cloud Practitioner',
        description: '클라우드 개념, 보안, 기술 및 전반적인 이해를 검증하는 기초 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 90,
        officialQuestionCount: 65
    },
    'SAA-C03': {
        code: 'SAA-C03',
        name: 'AWS Certified Solutions Architect - Associate',
        description: 'AWS 기술을 활용한 가용성, 비용 효율성 및 확장 가능한 시스템 설계 능력을 검증합니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65
    },
    'DVA-C02': {
        code: 'DVA-C02',
        name: 'AWS Certified Developer - Associate',
        description: 'AWS 기반 애플리케이션 개발, 최적화 및 배포 능력을 검증하는 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65
    },
    'SOA-C02': {
        code: 'SOA-C02',
        name: 'AWS Certified SysOps Administrator - Associate',
        description: 'AWS 컴퓨팅, 네트워크, 데이터베이스 및 스토리지 리소스의 배포 및 관리 능력을 검증합니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65
    }
};

class ExamService {
    getAllExams(): ExamInfo[] {
        return Object.values(examsInfo);
    }

    getExamByCode(code: string): ExamInfo | undefined {
        return examsInfo[code];
    }

    getExamName(code: string): string {
        return examsInfo[code]?.name || code;
    }

    getExamDescription(code: string): string {
        return examsInfo[code]?.description || '';
    }
}

export const examService = new ExamService();
