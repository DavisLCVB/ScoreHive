/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para producción
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Configuración de imágenes (si es necesario)
  images: {
    unoptimized: true
  },
  
  // Variables de entorno públicas
  env: {
    ADAPTER_URL: process.env.ADAPTER_URL || 'http://localhost:3001'
  }
}

module.exports = nextConfig