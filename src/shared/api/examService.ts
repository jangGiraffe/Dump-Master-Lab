import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ExamLevel } from '../model/types';

export interface ExamInfo {
    code: string;
    name: string;
    description: string;
    category: string;
    officialTimeLimitMinutes?: number;
    officialQuestionCount?: number;
    level?: ExamLevel;
    languages: string[];
}

// Data for D-Day configuration
export interface UserExamConfig {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    code: string;
}

export const examsInfo: Record<string, ExamInfo> = {
    'MLA-C01': {
        code: 'MLA-C01',
        name: 'AWS Certified Machine Learning - Associate',
        description: '기계 학습 아키텍처 설계, 구현 및 고도화 능력을 검증하는 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 140,
        officialQuestionCount: 65,
        level: 'ASSOCIATE',
        languages: ['EN', 'JP', 'KR']
    },
    'AIP-C01': {
        code: 'AIP-C01',
        name: 'AWS Certified Generative AI Developer - Professional',
        description: 'AWS 환경에서 생성형 AI 기반 솔루션을 설계, 통합 및 유지 관리하는 전문가급 능력을 검증합니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 215,
        officialQuestionCount: 85,
        level: 'PROFESSIONAL',
        languages: ['EN', 'JP']
    },
    'CLF-C02': {
        code: 'CLF-C02',
        name: 'AWS Certified Cloud Practitioner',
        description: '클라우드 개념, 보안, 기술 및 전반적인 이해를 검증하는 기초 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 90,
        officialQuestionCount: 65,
        level: 'FOUNDATIONAL',
        languages: ['EN', 'JP', 'KR']
    },
    'SAA-C03': {
        code: 'SAA-C03',
        name: 'AWS Certified Solutions Architect - Associate',
        description: 'AWS 기술을 활용한 가용성, 비용 효율성 및 확장 가능한 시스템 설계 능력을 검증합니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65,
        level: 'ASSOCIATE',
        languages: ['EN', 'JP', 'KR']
    },
    'DVA-C02': {
        code: 'DVA-C02',
        name: 'AWS Certified Developer - Associate',
        description: 'AWS 기반 애플리케이션 개발, 최적화 및 배포 능력을 검증하는 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65,
        level: 'ASSOCIATE',
        languages: ['EN', 'JP', 'KR']
    },
    'SOA-C02': {
        code: 'SOA-C02',
        name: 'AWS Certified SysOps Administrator - Associate',
        description: 'AWS 컴퓨팅, 네트워크, 데이터베이스 및 스토리지 리소스의 배포 및 관리 능력을 검증합니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 130,
        officialQuestionCount: 65,
        level: 'ASSOCIATE',
        languages: ['EN', 'JP', 'KR']
    },
    'DOP-C02': {
        code: 'DOP-C02',
        name: 'AWS Certified DevOps Engineer - Professional',
        description: '분산 애플리케이션 시스템 운영 및 관리, 배포 자동화 능력을 검증하는 전문가급 시험입니다.',
        category: 'AWS Certification',
        officialTimeLimitMinutes: 180,
        officialQuestionCount: 75,
        level: 'PROFESSIONAL',
        languages: ['EN', 'JP', 'KR']
    },
    'SAMPLE': {
        code: 'SAMPLE',
        name: 'Sample Exam Questions',
        description: '체험하기 및 일반 회원을 위한 무료 샘플 문제 모음입니다.',
        category: 'Practice',
        officialTimeLimitMinutes: 30,
        officialQuestionCount: 10,
        level: 'FOUNDATIONAL',
        languages: ['EN', 'KR']
    }
};

const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE || 'LOCAL';
const LOCAL_EXAM_CONFIG_KEY = 'dump_master_exam_info';
const LOCAL_EXAM_CACHE_TS_KEY = 'dump_master_exam_cache_ts';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

    // Helper to get user-specific storage keys
    private getUserKeys(userId: string) {
        const suffix = userId || 'guest';
        return {
            config: `${LOCAL_EXAM_CONFIG_KEY}_${suffix}`,
            ts: `${LOCAL_EXAM_CACHE_TS_KEY}_${suffix}`
        };
    }

    async saveUserExamConfig(userId: string, config: UserExamConfig) {
        const timestamp = Date.now();
        const keys = this.getUserKeys(userId);

        // 1. Always Save to Local Storage and Update Cache TS (User-specific)
        // This allows guest users with IDs to persist their data locally.
        localStorage.setItem(keys.config, JSON.stringify(config));
        localStorage.setItem(keys.ts, timestamp.toString());

        // 2. Save to Cloud if enabled and NOT guest
        if (STORAGE_MODE === 'CLOUD' && userId && userId !== 'guest' && !userId.startsWith('guest_')) {
            try {
                await setDoc(doc(db, 'examConfigs', userId), {
                    ...config,
                    updatedAt: timestamp
                });
            } catch (e) {
            }
        }
    }

    async getUserExamConfig(userId: string): Promise<UserExamConfig | null> {
        const now = Date.now();
        const keys = this.getUserKeys(userId);

        // 1. Check User-specific Local Storage first
        const localData = localStorage.getItem(keys.config);
        const cacheTs = localStorage.getItem(keys.ts);
        const localConfig = localData ? JSON.parse(localData) as UserExamConfig : null;

        // 2. If Cloud mode, check cache validity (3 hours)
        if (STORAGE_MODE === 'CLOUD' && userId && userId !== 'guest' && !userId.startsWith('guest_')) {
            const isCacheExpired = !cacheTs || (now - parseInt(cacheTs)) > CACHE_TTL;

            // If cache is expired or missing, fetch from Cloud
            if (isCacheExpired) {
                try {
                    
                    const docSnap = await getDoc(doc(db, 'examConfigs', userId));
                    if (docSnap.exists()) {
                        const cloudConfig = docSnap.data() as UserExamConfig;
                        // Sync local storage and update timestamp
                        localStorage.setItem(keys.config, JSON.stringify(cloudConfig));
                        localStorage.setItem(keys.ts, now.toString());
                        return cloudConfig;
                    } else {
                        // If no cloud data, clear user-specific local to be consistent
                        if (localConfig) {
                            localStorage.removeItem(keys.config);
                            localStorage.removeItem(keys.ts);
                        }
                        return null;
                    }
                } catch (e) {
                    // On error, fallback to local even if expired
                    return localConfig;
                }
            } else {
                
            }
        }

        return localConfig;
    }

    async deleteUserExamConfig(userId: string) {
        const keys = this.getUserKeys(userId);
        localStorage.removeItem(keys.config);
        localStorage.removeItem(keys.ts);

        if (STORAGE_MODE === 'CLOUD' && userId && userId !== 'guest' && !userId.startsWith('guest_')) {
            try {
                await deleteDoc(doc(db, 'examConfigs', userId));
            } catch (e) {
            }
        }
    }

}

export const examService = new ExamService();
