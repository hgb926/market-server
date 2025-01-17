# 1. FROM - OS 명시
FROM node:20-slim

# 2. WORKDIR 설정
WORKDIR /app

# 3. 의존성 설치
COPY package*.json ./
RUN npm ci

# 4. 소스 코드 복사
COPY . .

# 5. EXPOSE - 포트 명시
EXPOSE 8080

# 6. 유저 설정 (보안 강화)
USER node

# 7. CMD - 애플리케이션 실행
CMD ["node", "server.js"]