'use client'
import React from 'react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div style={{ padding: "20px" }} className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        
        <h1 className="text-5xl font-bold mb-4 text-center text-[#257085]">
          📝 ScoreHive
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 text-center">
          Sistema distribuido de calificación de exámenes con protocolo ScoreHive
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          
          {/* Tarjeta para Gestión de Respuestas */}
          <Link href="/answers" className="group">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 cursor-pointer">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🔑</div>
                <h2 className="text-2xl font-bold mb-3">Gestionar Claves</h2>
                <p className="text-purple-100 mb-4">
                  Configurar y obtener claves de respuesta del cluster MPI
                </p>
                <div className="text-sm text-purple-200">
                  • Establecer claves de respuesta<br/>
                  • Obtener claves almacenadas<br/>
                  • Verificar configuración del cluster
                </div>
              </div>
            </div>
          </Link>

          {/* Tarjeta para Calificación de Exámenes */}
          <Link href="/exams" className="group">
            <div className="bg-gradient-to-br from-[#257085] to-[#1a5a6b] p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 cursor-pointer">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold mb-3">Calificar Exámenes</h2>
                <p className="text-blue-100 mb-4">
                  Subir y calificar exámenes con procesamiento distribuido
                </p>
                <div className="text-sm text-blue-200">
                  • Cargar archivos JSON de exámenes<br/>
                  • Generar exámenes aleatorios<br/>
                  • Ver resultados en tarjetas visuales
                </div>
              </div>
            </div>
          </Link>

        </div>

        {/* Información del sistema */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg w-full">
          <h3 className="font-semibold text-blue-800 mb-4 text-center">
            ℹ️ Información del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700 text-sm">
            <div>
              <p><strong>Protocolo:</strong> ScoreHive (SH) TCP</p>
              <p><strong>Distribución:</strong> MPI Master + Workers</p>
              <p><strong>Arquitectura:</strong> Frontend → Adapter → Cluster</p>
            </div>
            <div>
              <p><strong>Capacidad:</strong> Miles de exámenes simultáneos</p>
              <p><strong>Análisis:</strong> Estadísticas completas</p>
              <p><strong>Exportación:</strong> Resultados en JSON</p>
            </div>
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="mt-6 flex gap-4 text-sm">
          <div className="flex items-center text-green-600">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            Frontend Active
          </div>
          <div className="flex items-center text-gray-600">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            Adapter: localhost:3001
          </div>
          <div className="flex items-center text-gray-600">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            Cluster: localhost:8080
          </div>
        </div>

      </div>
    </div>
  );
}