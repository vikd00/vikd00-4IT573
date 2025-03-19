import { createServer } from "http";
import { promises as fs } from "fs";
import { parse } from "url";

// Cesta k súboru s počítadlom
const COUNTER_FILE = "./counter.txt";

// Funkcia na načítanie hodnoty počítadla zo súboru
async function readCounter() {
  try {
    const data = await fs.readFile(COUNTER_FILE, "utf8");
    return parseInt(data.trim(), 10);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Súbor neexistuje, vytvoríme ho s počiatočnou hodnotou 0
      await fs.writeFile(COUNTER_FILE, "0");
      return 0;
    }
    throw error;
  }
}

// Funkcia na zápis hodnoty počítadla do súboru
async function writeCounter(value) {
  await fs.writeFile(COUNTER_FILE, value.toString());
  return value;
}

// Higher order funkcia pre operácie s počítadlom
async function updateCounter(operation) {
  const currentValue = await readCounter();
  let newValue;

  switch (operation) {
    case "increase":
      newValue = currentValue + 1;
      break;
    case "decrease":
      newValue = currentValue - 1;
      break;
    default:
      newValue = currentValue;
  }

  return writeCounter(newValue);
}

// Funkcia na vrátenie odpovede prehliadaču
function sendResponse(res, statusCode, content) {
  res.writeHead(statusCode, { "Content-Type": "text/plain" });
  res.end(content);
}

// Vytvorenie HTTP servera
const server = createServer(async (req, res) => {
  // Parsovanie URL pre získanie cesty
  const { pathname } = parse(req.url, true);

  try {
    // Spracovanie požiadaviek podľa cesty
    switch (pathname) {
      case "/increase":
        await updateCounter("increase");
        sendResponse(res, 200, "OK - Counter increased");
        break;

      case "/decrease":
        await updateCounter("decrease");
        sendResponse(res, 200, "OK - Counter decreased");
        break;

      case "/read":
        const value = await readCounter();
        sendResponse(res, 200, value.toString());
        break;

      default:
        sendResponse(res, 404, "Not Found");
    }
  } catch (error) {
    console.error("Error:", error);
    sendResponse(res, 500, "Internal Server Error");
  }
});

// Spustenie servera na porte 3000
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server beží na http://localhost:${PORT}`);
});
