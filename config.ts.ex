
// 비밀번호 및 앱 설정을 관리하는 파일입니다.
// .env 파일은 변경 시 서버 재시작이 필요할 수 있으므로, 이곳에서 설정하면 바로 적용됩니다.

export const APP_CONFIG = {
  // 비밀번호 해시 설정 (Base64 인코딩)
  // 브라우저 콘솔에서 btoa('원하는비밀번호') 를 입력하여 나온 값을 아래 문자열에 넣으세요.
  // 기본값 (janggiraffe): "amFuZ2dpcmFmZmU="
  PASSWORD_HASH: "amFuZ2dpcmFmZmU=" 
};
