# Dockerfile para Adapter HTTP-to-TCP
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    netcat-openbsd

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias de Node.js
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S adapter -u 1001

# Cambiar permisos
RUN chown -R adapter:nodejs /app
USER adapter

# Exponer puerto del adapter
EXPOSE 3001

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicio
CMD ["node", "adapter.js"]

# Health check usando el endpoint /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost 3001 || exit 1