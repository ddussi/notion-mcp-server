# Notion MCP Server

노션 워크스페이스와 연동되는 **원격 MCP(Model Context Protocol) 서버**입니다.

## 특징

- ✅ **원격 서버**: 중앙 서버에서 실행, 사용자들은 URL만 설정
- ✅ **API 키 인증**: 사용자별 API 키로 인증
- ✅ **권한 관리**: 사용자별 노션 페이지/DB 접근 제어
- ✅ **Read-only**: 안전한 조회 전용 (생성/수정 없음)
- ✅ **다중 클라이언트 지원**: Claude Code, Cursor, VSCode 등

## 제공 기능 (도구)

1. **notion_search** - 노션 워크스페이스 페이지 검색
2. **notion_get_page** - 특정 페이지 상세 조회 (권한 확인)
3. **notion_query_database** - 노션 데이터베이스 쿼리 (권한 확인)

## 아키텍처

```
사용자 (Claude Code/Cursor/VSCode)
    ↓ (HTTP + SSE)
MCP 서버
    ├── API 키 인증
    ├── 권한 검증
    └── Notion API 호출
```

---

## 🚀 서버 설정 (관리자용)

### 1. 노션 API 키 발급

1. https://www.notion.so/my-integrations 접속
2. "New integration" 클릭
3. Integration 이름 입력 (예: "My MCP Server")
4. Capabilities 선택:
   - ✅ Read content
   - ❌ Update content (사용 안 함)
   - ❌ Insert content (사용 안 함)
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
✅ User created successfully!

Name: 홍길동
API Key: mcp_a1b2c3d4...
Permissions: Full access (no restrictions)

⚠️  Save this API key securely. It won't be shown again.
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

## 👥 클라이언트 설정 (사용자용)

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

## 📖 사용 예시

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

## 🔒 보안

### API 키 관리

- ✅ API 키는 `users.json`에 저장됨 (절대 커밋하지 말 것!)
- ✅ `.gitignore`에 `users.json` 포함됨
- ✅ HTTPS 사용 권장 (프로덕션 환경)

### 권한 제어

- 권한이 없는 페이지/DB 접근 시 에러 반환
- 사용자별로 접근 가능한 리소스 제한 가능
- Read-only로 제한되어 있어 데이터 변경 불가

### 프로덕션 배포 시

1. **HTTPS 설정**: Nginx/Caddy로 리버스 프록시
2. **방화벽**: 내부 네트워크에서만 접근 허용
3. **Rate Limiting**: 요청 제한 추가
4. **로깅**: 접근 로그 기록

---

## 🛠 개발

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

## 📝 TODO

- [ ] HTTPS 지원
- [ ] Rate limiting
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
