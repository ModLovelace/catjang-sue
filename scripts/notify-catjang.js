#!/usr/bin/env node
"use strict";

const http = require("http");

const DEFAULT_PORT = 23456;

function sendPost(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data || {});
    const req = http.request({
      hostname: "127.0.0.1",
      port: DEFAULT_PORT,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 2000,
    }, (res) => {
      let resData = "";
      res.on("data", (chunk) => { resData += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(resData || "{}"));
        } catch {
          resolve({ ok: res.statusCode === 200, raw: resData });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout conectando con Catjang (¿está Catjang ejecutándose?)"));
    });

    req.end(body);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "--help";

  if (command === "--help" || command === "-h") {
    console.log(`
Uso de notify-catjang:
  node scripts/notify-catjang.js --start [mensaje]
      Informa que el agente empezó a trabajar o pensar (muestra puntos suspensivos).
      
  node scripts/notify-catjang.js --complete [mensaje]
      Informa que el agente terminó (hace que el gato salte, maúlle y diga el mensaje).
      
  node scripts/notify-catjang.js --alert [mensaje]
      Informa una alerta o petición de atención (sonido de atención y bocadillo).
      
  node scripts/notify-catjang.js --remind-now "Mensaje"
      Dispara un recordatorio de inmediato con sonido y salto.
      
  node scripts/notify-catjang.js --schedule "HH:mm" "Mensaje" [repeat]
      Guarda un recordatorio programado en Catjang (repeat: none | daily | weekdays | weekends).
    `);
    return;
  }

  try {
    let agentName = "Agente IA";
    let agentId = "agent";
    let task = "";
    let conversationName = "";

    // Parse options --agent, --task, and --conversation if provided
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--agent" && args[i + 1]) {
        agentName = args[i + 1];
        agentId = args[i + 1].toLowerCase().replace(/\s+/g, "-");
        args.splice(i, 2);
        i--;
      } else if (args[i] === "--task" && args[i + 1]) {
        task = args[i + 1];
        args.splice(i, 2);
        i--;
      } else if ((args[i] === "--conversation" || args[i] === "-c" || args[i] === "--topic") && args[i + 1]) {
        conversationName = args[i + 1];
        args.splice(i, 2);
        i--;
      }
    }

    if (command === "--start") {
      const text = args.slice(1).join(" ") || (task ? `Pensando en: ${task}` : "Pensando...");
      const res = await sendPost("/agent-state", {
        agentId,
        agentName,
        state: "working",
        task,
        conversationName,
        text,
      });
      console.log("Catjang: agente en estado de trabajo.", res);
    } else if (command === "--complete") {
      const text = args.slice(1).join(" ");
      const res = await sendPost("/agent-state", {
        agentId,
        agentName,
        state: "complete",
        task,
        conversationName,
        text: text || "",
      });
      console.log("Catjang: tarea completada enviada.", res);
    } else if (command === "--alert") {
      const text = args.slice(1).join(" ") || "¡Atención requerida!";
      const res = await sendPost("/agent-state", {
        agentId,
        agentName,
        state: "notification",
        task,
        conversationName,
        text,
      });
      console.log("Catjang: alerta enviada.", res);
    } else if (command === "--remind-now") {
      const text = args.slice(1).join(" ") || "¡Recordatorio!";
      const res = await sendPost("/agent-reminder", {
        triggerNow: true,
        text,
      });
      console.log("Catjang: recordatorio inmediato disparado.", res);
    } else if (command === "--schedule") {
      const time = args[1];
      const message = args[2] || "Recordatorio";
      const repeat = args[3] || "none";
      if (!time) {
        console.error("Error: Debes especificar la hora en formato HH:mm (ej: 17:30)");
        process.exit(1);
      }
      const res = await sendPost("/agent-reminder", {
        time,
        message,
        repeat,
      });
      console.log("Catjang: recordatorio programado guardado.", res);
    } else {
      console.error(`Comando desconocido: ${command}. Usa --help para ver las opciones.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Error al comunicar con Catjang:", err.message);
    process.exit(1);
  }
}

main();
