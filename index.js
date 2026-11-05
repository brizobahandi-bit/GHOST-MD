const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");

async function startGhost() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["GHOST MD V2", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scanne le QR code avec WhatsApp :");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("👻 GHOST MD V2 CONNECTÉ !");
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;

      if (status !== DisconnectReason.loggedOut) {
        console.log("Reconnexion en cours...");
        setTimeout(startGhost, 3000);
      } else {
        console.log("Session déconnectée. Reconnexion manuelle nécessaire.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.trim().toLowerCase() === "!ping") {
      await sock.sendMessage(from, {
        text: "👻 GHOST MD V2 est en ligne !"
      });
    }
  });
}

startGhost().catch(console.error);
