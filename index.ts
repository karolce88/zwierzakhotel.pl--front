// Import SASS do bundla Bun
// import "../scss/style.scss";

// -------------------------------------------------
// Podstawowa inicjalizacja i log
// -------------------------------------------------
console.log("🟢 Bun frontend działa!");

// -------------------------------------------------
// Funkcja do aktualizacji czasu w #app
// -------------------------------------------------
function updateTime() {
  const timeElement = document.getElementById("time");
  if (timeElement) {
    timeElement.textContent = new Date().toLocaleTimeString();
  }
}

// -------------------------------------------------
// DOMContentLoaded
// -------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  if (!app) return;

  // Wstawienie początkowego HTML do #app
  app.innerHTML = `
    <h1>Witaj w projekcie Bun!</h1>
    <p>Aktualny czas: <span id="time">${new Date().toLocaleTimeString()}</span></p>
    <button id="updateBtn">Odśwież czas</button>
    <div id="message"></div>
  `;

  // Obsługa kliknięcia przycisku
  const btn = document.getElementById("updateBtn");
  btn?.addEventListener("click", () => {
    updateTime();
    showMessage("Czas odświeżony!");
  });
});

// -------------------------------------------------
// Funkcja wyświetlania wiadomości
// -------------------------------------------------
function showMessage(text: string, duration = 2000) {
  const msgContainer = document.getElementById("message");
  if (!msgContainer) return;

  msgContainer.textContent = text;
  msgContainer.style.opacity = "1";

  setTimeout(() => {
    msgContainer.style.opacity = "0";
  }, duration);
}

// -------------------------------------------------
// Przykładowa funkcja dynamiczna
// -------------------------------------------------
export function addElement(tag: string, parentId: string, text?: string) {
  const parent = document.getElementById(parentId);
  if (!parent) return;
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  parent.appendChild(el);
}
