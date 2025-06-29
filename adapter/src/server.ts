import { AdapterApp } from "./app";

async function main(): Promise<void> {
  const adapter = new AdapterApp(10000);

  await adapter.start(3001);

  // Manejo graceful de cierre
  process.on("SIGINT", async () => {
    console.warn("\nCerrando servidor...");
    await adapter.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.warn("Cerrando servidor...");
    await adapter.stop();
    process.exit(0);
  });
}

// Iniciar si se ejecuta directamente
if (require.main === module) {
  main().catch(console.error);
}

export { AdapterApp };
