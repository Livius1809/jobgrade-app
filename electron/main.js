/**
 * JobGrade Desktop — Electron wrapper
 *
 * Încarcă portalul web într-o fereastră desktop nativă.
 * Avantaje: notificări native, fullscreen, menu bar, auto-update.
 */

const { app, BrowserWindow, Notification, Menu, shell } = require("electron")
const path = require("path")

const BASE_URL = "https://jobgrade.ro"

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "JobGrade",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: false,
    show: false,
  })

  // Menu
  const menu = Menu.buildFromTemplate([
    {
      label: "JobGrade",
      submenu: [
        { label: "Portal", click: () => mainWindow.loadURL(`${BASE_URL}/portal`) },
        { label: "Dashboard Owner", click: () => mainWindow.loadURL(`${BASE_URL}/owner`) },
        { type: "separator" },
        { label: "Evaluare posturi", click: () => mainWindow.loadURL(`${BASE_URL}/sessions`) },
        { label: "Pay Gap", click: () => mainWindow.loadURL(`${BASE_URL}/pay-gap`) },
        { label: "Rapoarte", click: () => mainWindow.loadURL(`${BASE_URL}/reports`) },
        { type: "separator" },
        { label: "Ieșire", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "Servicii",
      submenu: [
        { label: "C1 — Organizare", click: () => mainWindow.loadURL(`${BASE_URL}/portal`) },
        { label: "C2 — Conformitate", click: () => mainWindow.loadURL(`${BASE_URL}/pay-gap`) },
        { label: "C3 — Competitivitate", click: () => mainWindow.loadURL(`${BASE_URL}/benchmark`) },
        { label: "C4 — Dezvoltare", click: () => mainWindow.loadURL(`${BASE_URL}/portal`) },
        { type: "separator" },
        { label: "Simulări (WIF)", click: () => mainWindow.loadURL(`${BASE_URL}/portal`) },
        { label: "Media Books", click: () => mainWindow.loadURL(`${BASE_URL}/media-books`) },
      ],
    },
    {
      label: "Instrumente",
      submenu: [
        { label: "Fișe de post", click: () => mainWindow.loadURL(`${BASE_URL}/jobs`) },
        { label: "KPI-uri", click: () => mainWindow.loadURL(`${BASE_URL}/compensation/kpis`) },
        { label: "Clase salariale", click: () => mainWindow.loadURL(`${BASE_URL}/compensation`) },
        { label: "Benchmark", click: () => mainWindow.loadURL(`${BASE_URL}/benchmark`) },
      ],
    },
    {
      label: "Ajutor",
      submenu: [
        { label: "Despre JobGrade", click: () => {
          const { dialog } = require("electron")
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "JobGrade Desktop",
            message: "JobGrade — Evaluare și ierarhizare posturi",
            detail: "Platformă AI de evaluare posturi, structurare salarială și dezvoltare organizațională.\n\nConformitate Directiva EU 2023/970.\n\n© Psihobusiness Consulting SRL",
          })
        }},
        { label: "Deschide în browser", click: () => shell.openExternal(BASE_URL) },
      ],
    },
  ])
  Menu.setApplicationMenu(menu)

  // Load portal
  mainWindow.loadURL(`${BASE_URL}/portal`)

  // Show when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(BASE_URL)) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Notificări native
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, "icon.ico") }).show()
  }
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
