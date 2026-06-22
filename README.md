# Yeosu19 Contract Signing Page

간단한 전자 서명용 Cloudflare Pages 프로젝트입니다.

## 링크 예시

- 발주자 서명: `/index.html?role=client`
- 개발자 서명: `/index.html?role=developer`
- 선택 보안 토큰 사용 시: `/index.html?role=client&token=원하는토큰`

## Cloudflare D1 설정

1. Cloudflare에서 D1 데이터베이스 `contract-db` 생성
2. `wrangler.toml`의 `database_id`를 실제 D1 ID로 변경
3. D1 콘솔에서 `schema.sql` 내용 실행
4. Pages 프로젝트의 D1 binding 이름을 `DB`로 연결

선택 사항으로 Pages 환경변수 `SIGNING_TOKEN`을 지정하면, 같은 토큰이 URL에 포함된 경우에만 서명 저장이 됩니다.

## 사용 방법

1. 각자 서명 링크로 접속
2. 서명란에 손가락, 펜, 마우스로 서명
3. 서명 저장
4. 양측 서명 확인 후 `인쇄 / PDF 저장`
