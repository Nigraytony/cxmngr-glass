# Desktop code signing — procurement + wiring

**Status:** Phase 3 of `electron_pivot_plan.md`.

- **Windows: LIVE.** Azure Artifact Signing is fully wired and verified green in CI
  (run `desktop-v0.1.0-test.2`, 2026-07-14): electron-builder signs via the `cxma-desktop-ci`
  service principal and the installer passes a `Get-AuthenticodeSignature` = Valid check.
  Ship a signed build by tagging `desktop-v<version>` (no `-test` suffix).
- **macOS: unsigned.** Builds and uploads fine, but no Apple cert yet — see §2 to enable
  signing + notarization. Optional; only needed when distributing Mac builds.

`.github/workflows/electron-build.yml` builds on both platforms and uploads installers as
artifacts. Because it passes `--publish never`, tagging does NOT create a GitHub Release —
downloads come from the run's artifacts.

---

## 1. What already works (don't redo these)

| Concern | State |
|---|---|
| macOS entitlements | electron-builder ships a default `entitlements.mac.plist` with `com.apple.security.cs.allow-jit`. Only add `build/entitlements.mac.plist` if you need something beyond it. |
| `hardenedRuntime` | Defaults to `true`. Required for notarization. Leave it. |
| `notarize:` config | Opt-**out**, not opt-in. It fires automatically once the Apple env vars are present. Do not set `notarize: true`. |
| Signing failure detection | CI passes `forceCodeSigning` when a cert is expected, then independently verifies the artifact (`codesign`/`spctl` on macOS, `Get-AuthenticodeSignature` on Windows). |
| Accidental releases | CI passes `--publish never`. Cutting a `desktop-v*` tag will **not** create a GitHub Release. |

---

## 2. macOS track

**Cost:** $99/yr (Apple Developer Program). **Lead time:** hours to a few days.

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/). Individual
   enrollment works, but the certificate subject — and therefore the name Gatekeeper shows
   users — will be your personal name, not a company name. See §4.
2. In the Apple Developer portal, create a **Developer ID Application** certificate.
   (Not "Mac App Distribution" — that's for the Mac App Store, which we're not using.)
3. Export it from Keychain Access as a `.p12` with a password.
4. Base64-encode it: `base64 -i cert.p12 | pbcopy`
5. Create an **App Store Connect API key** (Users and Access → Integrations → Keys) with the
   *Developer* role. Apple and electron-builder both recommend this over `APPLE_ID` +
   app-specific password, because the API key can be scoped and revoked independently.

### Secrets to add

Using the API key (recommended):

| Secret | Value |
|---|---|
| `MAC_CSC_LINK` | base64 of the `.p12` |
| `MAC_CSC_KEY_PASSWORD` | the `.p12` export password |
| `APPLE_API_KEY` | contents of the `.p8` key file |
| `APPLE_API_KEY_ID` | the 10-char key ID |
| `APPLE_API_ISSUER` | the issuer UUID |

The workflow currently passes `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`
instead. Both work; if you go the API-key route, swap those three `env:` entries in the
"Build + package" step and update the `stapler validate` guard in the verify step, which
keys off `APPLE_ID`.

---

## 3. Windows track

> **The `WIN_CSC_LINK` path in the workflow is a dead end for a newly purchased cert.**
> Since June 2023 the CA/Browser Forum requires OV code-signing private keys to live on
> FIPS 140-2 Level 2 hardware. Public CAs no longer issue exportable `.pfx` files. That
> env var only works if you already hold a pre-2023 certificate.

**Use [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)**
(renamed from "Trusted Signing"). It fits this project unusually well: we're already on Azure,
and it has a **West US 3** endpoint — the region the backend App Service actually runs in,
despite `rg-cxmngr-eastus` being the resource group's name.

**Cost:** $9.99/mo Basic (5,000 signatures). **Lead time:** identity validation takes
**1–20 business days**, so start this first.

### Setup

1. Register the resource provider: `az provider register --namespace Microsoft.CodeSigning`
2. Create an Artifact Signing account in **West US 3**.
3. Complete **identity validation** (portal only — not scriptable). Requires the
   *Artifact Signing Identity Verifier* role. Public trust is available to organizations in
   the US/Canada/EU/UK and to individual developers in the US/Canada. See §4 before filling
   in the org name — it lands on the certificate.
4. Create a **Public Trust** certificate profile.
5. Create an Entra app registration (service principal) for CI, and grant it the
   **Artifact Signing Certificate Profile Signer** role, scoped to the certificate profile:

   ```
   az role assignment create \
     --assignee <sp-object-id> \
     --role "Artifact Signing Certificate Profile Signer" \
     --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.CodeSigning/codeSigningAccounts/<account>/certificateProfiles/<profile>"
   ```

### Config — IMPLEMENTED

Done. The electron-builder config was ported from `electron-builder.yml` to `electron-builder.cjs`
so the signing block can be gated at build time (a static YAML `azureSignOptions` would make every
*local* build try to reach Azure and fail without the service-principal creds). The `win.azureSignOptions`
object is emitted **only when `CXMA_SIGN_WIN=1`**:

```js
// electron-builder.cjs (excerpt)
const signWindows = process.env.CXMA_SIGN_WIN === '1'
win: {
  target: ['nsis'],
  ...(signWindows && {
    azureSignOptions: {
      publisherName: 'Energy Management Consulting, LLC', // must match cert CN exactly (§4)
      endpoint: 'https://wus3.codesigning.azure.net/',    // West US 3
      codeSigningAccountName: 'emcxsigning',
      certificateProfileName: 'emcx-public-trust',
    },
  }),
}
```

`azureSignOptions` and `signtoolOptions` are mutually exclusive. `publisherName` must match the
certificate's CN **exactly**, or NSIS validation fails. Local `electron:pack` / `electron:dist`
(no `CXMA_SIGN_WIN`) build unsigned and never contact Azure.

### Secrets — DONE

Set on the repo (2026-07-14), sourced from the `cxma-desktop-ci` service principal:

| Secret | Value |
|---|---|
| `AZURE_TENANT_ID` | Entra tenant GUID |
| `AZURE_CLIENT_ID` | service principal app ID (`cxma-desktop-ci`) |
| `AZURE_CLIENT_SECRET` | service principal secret |

electron-builder authenticates via Azure's `EnvironmentCredential` and shells out to the
`TrustedSigning` PowerShell module (installed from PSGallery at build time — so this runs on a
Windows runner). The SP holds the **Artifact Signing Certificate Profile Signer** role scoped
to the `emcx-public-trust` profile (nothing broader). To rotate the secret:
`az ad sp credential reset --id <appId>`, then update `AZURE_CLIENT_SECRET`.

The workflow (`.github/workflows/electron-build.yml`) keys the Windows leg's signing off
`AZURE_CLIENT_ID`, sets `CXMA_SIGN_WIN=1`, and passes the three `AZURE_*` creds when signing.

---

## 4. Certificate subject — DECIDED

**The certificate is issued to `Energy Management Consulting, LLC`.** CxMA ships as a product
of EMCx; the existing LLC is the legal owner. No new entity is being formed for this (this
supersedes the "form a CxMA entity first" option and unblocks TODO.txt #38 for signing
purposes).

Consequences, already applied where possible:
- Windows `azureSignOptions.publisherName` and the macOS certificate CN must both read
  **`Energy Management Consulting, LLC`** exactly.
- `electron-builder.yml` `copyright` is set to `© Energy Management Consulting, LLC`.
- Users installing "CxMA" will see "Energy Management Consulting, LLC" on the macOS Gatekeeper
  and Windows UAC trust prompts. That's expected — the product name and the legal signer differ
  by design. If you want the EMCx relationship surfaced to users, put it in the app's About /
  footer, not the certificate.

Because this name is now fixed, identity validation can start. Do **not** change it afterward —
that means a new validation request and invalidates any certificates already issued against it.

---

## 5. Renewal cadence

Since **March 1, 2026**, publicly trusted code-signing certificates are capped at **458 days**
(down from 39 months). Both tracks are now recurring operational work, not set-and-forget:

- Apple Developer Program: annual renewal, or the Developer ID cert stops being issued.
- Azure Artifact Signing: certificates rotate automatically within the profile, but the
  identity validation itself must be renewed. The service principal secret also expires —
  set a calendar reminder, or switch CI to OIDC federated credentials to remove the secret
  entirely.

Add both to the pre-launch checklist in `RUNBOOK.md` §9.

---

## Sources

- [CA/Browser Forum private key storage requirement](https://knowledge.digicert.com/general-information/new-private-key-storage-requirement-for-standard-code-signing-certificates-november-2022)
- [Azure Artifact Signing quickstart](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)
- [Azure Artifact Signing pricing](https://azure.microsoft.com/en-us/pricing/details/artifact-signing/)
- [Assign roles in Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/tutorial-assign-roles)
- [electron-builder — Windows code signing](https://www.electron.build/code-signing-win)
- [Code signing options for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
