'use client'
import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

export default function Home() {
  const [inputJson, setInputJson] = useState<string>("");
  const [responseJson, setResponseJson] = useState<string>("");
  const [method, setMethod] = useState<string>("");

  const handleExecuteMethod = async () => {
    try {
      console.log("Ejecutando método:", method);
      const parsedJson = JSON.parse(inputJson); // Parsear el JSON ingresado
      const res = await axios.post(`${BASE_URL}/command`, {
        host: 'localhost',
        port: 8080,
        command: JSON.stringify(parsedJson),
        options: {
          timeout: 5000,
          delimiter: '\n',
          encoding: 'utf8'
        }
      });
      console.log('✅ Servidor:', JSON.parse(res.data.response));
      console.log();

      // Verificar si la respuesta fue exitosa
      if (!res || res.status !== 200) {
        console.error("Error al ejecutar el método:", res);
        throw new Error("Error al ejecutar el método");
      }

      const data = await res.data.response; // Obtener los datos de la respuesta
      console.log('✅ Respuesta del servidor:', data);
      // Mostrar la respuesta en el segundo textarea
      setResponseJson(JSON.stringify(JSON.parse(data), null, 2));
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
      setResponseJson("Error al procesar la solicitud.");
    }
  };
  return (
    <>
      <div style={{ padding: "20px" }} className="flex flex-col items-center justify-center min-h-screen ">
        <div className="flex flex-col items-center bg-gray-200 p-6 rounded-lg shadow-md w-full max-w-3xl">

          <h1 className="text-2xl font-bold mb-4 text-center text-[#257085]">
          Subir respuestas</h1>

          <div className='flex flex-col items-center mb-4'>
            <label htmlFor="inputJson">Ingresar JSON:</label>
            <textarea className="text-black border-2 border-gray-300"
              id="inputJson"
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={10}
              cols={50}
              placeholder='Ejemplo de JSON: {"courseName": "Matemáticas", "name": "Tema 1"}'
            />
          </div>

          <div>
            <button className="bg-[#257085] shadow-md  hover:shadow-lg
            focus:shadow-lg active:shadow-lg  focus:outline-none
             text-white px-4 py-2 rounded hover:bg-[#262A21] transition-colors duration-300" 
            onClick={handleExecuteMethod}>Ejecutar Método</button>
          </div>

          <div className='flex flex-col items-center mt-4'>
            <label htmlFor="responseJson">Respuesta JSON:</label>
            <textarea className="text-black border-2 border-gray-300"
              id="responseJson"
              value={responseJson}
              readOnly
              rows={10}
              cols={50}
            />
          </div>
        </div>
      </div>
    </>
  );
}
