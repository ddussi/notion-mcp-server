# 빠른 시작 가이드

## 1. 서버 설정 (5분)

### Step 1: 노션 API 키 발급

```
https://www.notion.so/my-integrations
→ "New integration" 클릭
→ API 키 복사
```

### Step 2: 서버 설치 및 실행

```bash
# 프로젝트 디렉토리로 이동
cd notion-mcp-server

cp .env.example .env
# .env 파일에 NOTION_API_KEY 입력

npm install
npm run build
npm start
```

서버 시작 확인:

```bash
curl http://localhost:3000/health
# 출력: {"status":"ok","message":"Notion MCP Server is running"}
```

### Step 3: 사용자 추가

```bash
npm run manage-users add "홍길동"
```

**API 키 저장!** 출력된 `mcp_xxxxx` 키를 복사해두세요.

---

## 2. Claude Code 연결 (3분)

### Step 1: 설정 파일 열기

```bash
open ~/.config/claude/claude_desktop_config.json
```

### Step 2: 내용 추가

```json
{
  "mcpServers": {
    "notion-mcp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse",
        "headers": {
          "x-api-key": "mcp_xxxxx"
        }
      }
    }
  }
}
```

**주의:** `mcp_xxxxx`를 실제 API 키로 변경!

### Step 3: Claude Code 재시작

완전히 종료 후 다시 시작.

---

## 3. 테스트 (1분)

Claude Code에서:

```
노션에서 "프로젝트" 검색해줘
```

작동하면 성공! 🎉

---

## 문제 해결

### "Unauthorized" 에러

- API 키가 정확한지 확인
- `npm run manage-users list`로 키 확인

### 연결 안 됨

- 서버가 실행 중인지 확인: `curl http://localhost:3000/health`
- URL이 정확한지 확인 (localhost:3000)

### 노션 페이지 안 보임

노션에서 페이지 공유:

```
페이지 우측 상단 "..."
→ "Add connections"
→ Integration 선택
```

---

## 다음 단계

- [ ] 다른 사용자에게 API 키 발급
- [ ] 원격 서버에 배포 (필요 시)
- [ ] HTTPS 설정
- [ ] 권한 세분화
