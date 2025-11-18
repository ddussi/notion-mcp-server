# Notion MCP Server (Self-Hosted)

Self-hosted Notion MCP 서버 - 폐쇄망 환경 및 엔터프라이즈용

> **주의: 대부분의 사용자에게는 [공식 Notion MCP](https://mcp.notion.com)를 권장합니다.**

## 공식 vs Self-Hosted

### 대부분의 경우: [공식 Notion MCP](https://mcp.notion.com) 사용 권장

**장점:**

- Notion이 직접 호스팅 및 관리
- OAuth 인증으로 각자 자기 권한으로 안전하게 접근
- 서버 관리 불필요, 무료
- 자동 업데이트 및 최신 기능 지원

**사용법:**

```json
{
  "mcpServers": {
    "Notion": {
      "url": "https://mcp.notion.com/mcp"
    }
  }
}
```

### 이 프로젝트가 필요한 경우 (10%)

다음과 같은 **특수한 상황**에서만 Self-Hosted 서버가 필요합니다:

1. **폐쇄망/내부망 환경**

   - 외부 서버(mcp.notion.com) 접근 불가
   - VPN/내부망에서만 운영

2. **중앙 집중식 권한 관리**

   - 관리자가 직접 사용자별 권한 세밀 제어
   - 팀원 퇴사 시 즉시 권한 차단

3. **감사 로그 필요**

   - 컴플라이언스를 위한 접근 기록
   - 누가 언제 무엇을 조회했는지 추적

4. **커스텀 로직 추가**
   - 민감 정보 자동 필터링
   - 회사 특화 비즈니스 규칙

---

## 특징

- **Self-Hosted**: 자체 서버에서 실행
- **API 키 인증**: 사용자별 API 키로 인증
- **세밀한 권한 관리**: 사용자별 노션 페이지/DB 접근 제어
- **보안 기능**: Rate limiting, CORS, 환경 변수 검증
- **Read-only**: 안전한 조회 전용 (생성/수정 없음)

## 제공 기능 (도구)

1. **notion_search** - 노션 워크스페이스 페이지 검색
2. **notion_get_page** - 특정 페이지 상세 조회 (권한 확인)
3. **notion_query_database** - 노션 데이터베이스 쿼리 (권한 확인)

## 아키텍처

```
사용자 (Claude Code/Cursor/VSCode)
    ↓ (HTTP + SSE)
Self-Hosted MCP 서버
    ├── API 키 인증
    ├── Rate Limiting
    ├── 권한 검증
    └── Notion API 호출
```

**기술 스택:**

- Node.js + TypeScript
- Express.js (HTTP 서버)
- MCP SDK (Server-Sent Events)
- Notion SDK

---

## 서버 설정 (관리자용)

### 1. 노션 API 키 발급

1. https://www.notion.so/my-integrations 접속
2. "New integration" 클릭
3. Integration 이름 입력 (예: "My MCP Server")
4. Capabilities 선택:
   - Read content (체크)
   - Update content (사용 안 함)
   - Insert content (사용 안 함)
5. API 키 복사

### 2. 노션 페이지 연결

Integration이 접근할 페이지/데이터베이스에 연결:

1. 노션에서 공유하고 싶은 페이지 열기
2. 우측 상단 "..." → "Add connections"
3. 생성한 Integration 선택

### 3. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

편집:

```env
PORT=3000
NOTION_API_KEY=secret_your_api_key_here
```

### 4. 서버 실행

#### 로컬 개발

```bash
npm install
npm run build
npm start
```

#### Docker로 실행

```bash
docker-compose up -d
```

또는:

```bash
docker build -t notion-mcp-server .
docker run -d -p 3000:3000 \
  -e NOTION_API_KEY=your_key \
  --name mcp-server \
  notion-mcp-server
```

### 5. 사용자 관리

#### 사용자 추가

```bash
npm run manage-users add "홍길동"
```

출력:

```
User created successfully!

Name: 홍길동
API Key: mcp_a1b2c3d4...
Permissions: Full access (no restrictions)

Save this API key securely. It won't be shown again.
```

#### 사용자 목록 조회

```bash
npm run manage-users list
```

#### 권한 설정 (특정 DB만 접근)

```bash
npm run manage-users set-db-permissions mcp_a1b2c3d4... db-id-1 db-id-2
```

#### 권한 설정 (특정 페이지만 접근)

```bash
npm run manage-users set-page-permissions mcp_a1b2c3d4... page-id-1 page-id-2
```

#### 사용자 삭제

```bash
npm run manage-users remove mcp_a1b2c3d4...
```

---

## 클라이언트 설정 (사용자용)

### Claude Code

설정 파일 (`~/.config/claude/claude_desktop_config.json`) 수정:

```json
{
  "mcpServers": {
    "notion-mcp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse",
        "headers": {
          "x-api-key": "mcp_your_api_key_here"
        }
      }
    }
  }
}
```

### Cursor

설정 파일 (`~/.cursor/mcp_config.json`)에 추가:

```json
{
  "mcpServers": {
    "notion-mcp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse",
        "headers": {
          "x-api-key": "mcp_your_api_key_here"
        }
      }
    }
  }
}
```

### VSCode (Continue 확장)

`.continue/config.json`에 추가:

```json
{
  "mcpServers": [
    {
      "name": "notion-mcp",
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse",
        "headers": {
          "x-api-key": "mcp_your_api_key_here"
        }
      }
    }
  ]
}
```

**주의:**

- `http://localhost:3000`을 실제 서버 주소로 변경 (원격 서버인 경우)
- `mcp_your_api_key_here`를 발급받은 API 키로 변경
- 설정 후 클라이언트 재시작 필요

---

## 사용 예시

Claude Code나 Cursor에서:

```
노션에서 "프로젝트 가이드" 검색해줘
```

```
데이터베이스 abc123의 모든 항목을 보여줘
```

```
페이지 xyz789의 내용을 요약해줘
```

---

## 보안

### 기본 보안 기능

- **환경 변수 검증**: `NOTION_API_KEY` 누락 시 서버 시작 불가
- **Rate Limiting**: IP당 15분에 100 요청으로 제한 (DDoS 방지)
- **CORS 설정**: 프로덕션에서 허용된 origin만 접근 가능 (`.env`에 `ALLOWED_ORIGINS` 설정)
- **API 키 인증**: 모든 MCP 요청에 `x-api-key` 헤더 필수

### API 키 관리

- API 키는 `users.json`에 저장됨 (절대 커밋하지 말 것!)
- `.gitignore`에 `users.json` 포함됨
- HTTPS 사용 권장 (프로덕션 환경)

### 권한 제어

- 권한이 없는 페이지/DB 접근 시 에러 반환
- 사용자별로 접근 가능한 리소스 제한 가능
- Read-only로 제한되어 있어 데이터 변경 불가

### 프로덕션 배포 시

1. **환경 변수 설정**:

   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
   ```

2. **HTTPS 설정**: Nginx/Caddy로 리버스 프록시

3. **방화벽**: 내부 네트워크에서만 접근 허용

4. **Rate Limiting 조정**: 필요시 `src/index.ts`에서 제한값 변경

5. **로깅**: 접근 로그 기록 (별도 구현 필요)

---

## 개발

### 디렉토리 구조

```
notion-mcp-server/
├── src/
│   ├── index.ts          # 메인 서버
│   └── manage-users.ts   # 사용자 관리 CLI
├── build/                # 컴파일된 코드
├── users.json            # 사용자 DB (자동 생성)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### 개발 모드

```bash
npm run watch   # TypeScript 자동 컴파일
npm run dev     # 빌드 + 실행
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## TODO

- [ ] HTTPS 지원
- [x] Rate limiting
- [x] 환경 변수 검증
- [x] CORS 설정
- [ ] 접근 로그 기록
- [ ] 사용자 DB를 PostgreSQL로 마이그레이션
- [ ] Web UI로 사용자 관리

---

## 문제 해결

### 서버가 시작되지 않음

- `.env` 파일에 `NOTION_API_KEY`가 설정되어 있는지 확인
- `npm install` 및 `npm run build` 실행 확인

### 클라이언트에서 연결 안 됨

- 서버 URL이 올바른지 확인
- API 키가 유효한지 확인: `npm run manage-users list`
- 방화벽/포트가 열려 있는지 확인

### "Unauthorized" 에러

- API 키가 정확한지 확인
- `x-api-key` 헤더가 올바르게 설정되었는지 확인

### 페이지를 찾을 수 없음

- 노션 Integration이 해당 페이지에 연결되어 있는지 확인
- 사용자 권한 설정 확인: `npm run manage-users list`

---

## 라이선스

MIT
