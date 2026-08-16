// electron-builder config — desktop packaging (see docs/electron_pivot_plan.md).
// Icons are auto-generated from build/icon.png (1024x1024).
//
// Ported from electron-builder.yml to JS so Windows signing can be gated at
// build time. Azure Artifact Signing (`win.azureSignOptions`) is emitted ONLY
// when CXMA_SIGN_WIN=1. Otherwise it's omitted entirely, so local
// `electron:pack` / `electron:dist` builds stay unsigned and never reach out to
// Azure (which would fail without the AZURE_* service-principal credentials).
// The desktop CI workflow sets CXMA_SIGN_WIN=1 only on the Windows leg when the
// signing secrets are present. See docs/desktop_signing.md.
//
// macOS signing is unaffected: it's still driven by CSC_LINK / CSC_KEY_PASSWORD
// (+ APPLE_* for notarization). When no cert is configured the electron:* scripts
// set CSC_IDENTITY_AUTO_DISCOVERY=false so the build stays unsigned.

const signWindows = process.env.CXMA_SIGN_WIN === '1'

// Single line so it's easy to scan in CI logs.
console.error(
  signWindows
    ? '[electron-builder.config] Windows Azure signing ENABLED (CXMA_SIGN_WIN=1)'
    : '[electron-builder.config] unsigned build (set CXMA_SIGN_WIN=1 to sign Windows)'
)

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'io.cxma.desktop',
  productName: 'CxMA',
  // Legal owner (matches the code-signing certificate subject). CxMA is a product
  // of Energy Management Consulting, LLC (EMCx). See docs/desktop_signing.md §4.
  copyright: '© Energy Management Consulting, LLC',

  directories: {
    output: 'release',
    buildResources: 'build',
  },

  // Only the built renderer + the main process are needed at runtime (the renderer
  // is bundled by Vite; the main process uses only Electron/Node built-ins).
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  asar: true,

  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
  },

  win: {
    target: ['nsis'],
    // Azure Artifact Signing. publisherName must match the certificate CN exactly.
    // Endpoint is the West US 3 region (matches the App Service / storage region).
    ...(signWindows && {
      azureSignOptions: {
        publisherName: 'Energy Management Consulting, LLC',
        endpoint: 'https://wus3.codesigning.azure.net/',
        codeSigningAccountName: 'emcxsigning',
        certificateProfileName: 'emcx-public-trust',
      },
    }),
  },

  linux: {
    target: ['AppImage'],
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },
}

module.exports = config
