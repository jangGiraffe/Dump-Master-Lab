
# Dump Master Lab

덤프파일을 기반으로 문제 은행 및 학습자료를 제공하는 서비스입니다.

## � 서비스 미리보기 (Service Preview)

| 메인 화면 | PDF 학습 자료 뷰어 |
| :---: | :---: |
| <img src="img/main.png" width="400"/> | <img src="img/pdfview.png" width="400"/> |

| 퀴즈 풀이 화면 1 | 퀴즈 풀이 화면 2 |
| :---: | :---: |
| <img src="img/quiz1.png" width="400"/> | <img src="img/quiz2.png" width="400"/> |

| 결과 분석 화면 1 | 결과 분석 화면 2 |
| :---: | :---: |
| <img src="img/result1.png" width="400"/> | <img src="img/result2.png" width="400"/> |

| 설정 화면 1 | 설정 화면 2 |
| :---: | :---: |
| <img src="img/setting1.png" width="400"/> | <img src="img/setting2.png" width="400"/> |


## �🛠️ 초기 설정 (Configuration)

프로젝트를 실행하기 전에, 제공된 예시 파일들의 이름에서 `.ex` 확장자를 제거하여 실제 설정 파일로 활성화해야 합니다.

다음 파일들의 이름을 변경해 주세요:

1. **`services/dataService.tsx.ex`** &rarr; **`services/dataService.tsx`**
   - 문제 은행 데이터 소스(JSON 파일 등)를 설정하는 파일입니다.
2. **`services/pdfService.tsx.ex`** &rarr; **`services/pdfService.tsx`**
   - 학습 자료실에 표시될 PDF 문서 목록과 링크를 관리하는 파일입니다.
3. **`config.ts.ex`** &rarr; **`config.ts`**
   - 앱 비밀번호 해시 및 기타 전역 설정을 관리하는 파일입니다.

## 🔐 비밀번호 변경 (Changing Password)

보안을 위해 비밀번호는 평문이 아닌 **SHA-256 해시값**으로 저장됩니다. 비밀번호를 변경하려면 아래 절차를 따르세요:

1. 프로젝트 루트에 있는 **`hash-generator.html`** 파일을 브라우저에서 엽니다.
2. 원하는 새 비밀번호를 입력하면 자동으로 해시값이 생성됩니다.
3. 생성된 해시값을 복사합니다.
4. **`config.ts`** 파일을 열고, `NORMAL_PASSWORD_HASH` (일반 유저) 또는 `VIP_PASSWORD_HASH` (VIP 유저) 값을 교체합니다.

> **참고:** 해시값은 복호화가 불가능하므로, 원본 비밀번호를 잊어버리면 다시 설정해야 합니다.

## 🚀 실행 방법 (Getting Started)

1. **의존성 설치 (Install Dependencies)**
   ```bash
   npm install
   ```

2. **개발 서버 실행 (Run Dev Server)**
   ```bash
   npm run dev
   ```
   
   이후 브라우저에서 `http://localhost:8080/` (또는 터미널에 표시된 주소)로 접속하여 확인합니다.

## 📂 문제 데이터 추가 (Adding Questions)

새로운 문제 데이터를 추가하려면 `dump/` 폴더에 JSON 파일을 위치시켜야 합니다.
데이터 형식은 **`dump/sample_questions.json`** 파일을 참고하여 작성해 주세요.

**JSON 형식 예시:**

```json
[
  {
    "question": "AWS의 클라우드 컴퓨팅 서비스 중 '서버리스' 컴퓨팅을 제공하는 서비스는 무엇입니까?",
    "options": [
      "A. Amazon EC2",
      "B. AWS Lambda",
      "C. Amazon RDS",
      "D. Amazon EBS"
    ],
    "answer": "B",
    "explanation": "AWS Lambda는 서버를 프로비저닝하거나 관리하지 않고도 코드를 실행할 수 있게 해주는 이벤트 중심의 서버리스 컴퓨팅 서비스입니다."
  }
]
```

작성한 JSON 파일은 `services/dataService.tsx`에서 import 하여 `dataSources` 배열에 추가하면 앱에 반영됩니다.


