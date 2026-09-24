# 1. Official Node.js 18 Base Image
FROM node:18-alpine

# 2. Working Directory App ke andar set karein
WORKDIR /app

# 3. Dependencies files copy karein
COPY package*.json ./

# 4. Production dependencies install karein
RUN npm ci --only=production

# 5. Baaki saara backend code copy karein
COPY . .

# 6. Port 5000 expose karein (ya jo bhi aapka PORT hai)
EXPOSE 5000

# 7. Server start karne ki command
CMD ["node", "index.js"]