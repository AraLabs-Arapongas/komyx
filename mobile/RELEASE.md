# Komyx 1.1.0: release steps

The commands below run from `mobile/`, logged in as the project owner (`npx eas-cli@latest login`).
Use npm here, never pnpm.

## What changed in the config for this release

- `expo.version` went from 1.0.0 to **1.1.0**. EAS manages the build number: `eas.json` has `appVersionSource: "remote"` and `production.autoIncrement: true`, so every production build gets the next buildNumber/versionCode automatically. Don't edit `buildNumber` by hand.
- **EAS Update (OTA)** is on: `expo-updates` is installed, `updates.url` points to the project, and `runtimeVersion` uses the `appVersion` policy, so the runtime is `1.1.0`. Each build profile has a channel: production → `production`, preview → `preview`, development → `development`.
- **Language pt-BR**: `ios.infoPlist` sets `CFBundleDevelopmentRegion = pt-BR` and `CFBundleLocalizations = [pt-BR]`. `locales["pt-BR"]` (in `locales/pt-BR.json`) creates `pt-BR.lproj/InfoPlist.strings` with the app name and the permission texts. The App Store reads the language from that folder.

## 1. Build and submit (iOS)

```bash
cd mobile
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production --latest
```

Android, if you are publishing it too:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production --latest
```

The first build with expo-updates may ask to link the channels. If it does, accept, or run
`npx eas-cli@latest channel:create production` once beforehand.

## 2. App Store Connect

1. Create version **1.1.0** and choose the build that came from the submit.
2. Check that the store listing's primary language is **Português (Brasil)**
   (App Information → Primary Language). It's set in App Store Connect, not in the binary.
3. **App Review Information → Sign-in required**
   - Owner account: `apple@komyx.com.br` with the password the owner holds (it's not written here).
   - Client account: phone `11900000010`, SMS code `123456` (valid until 2027-10-17).
4. **What's New in This Version** (pt-BR):

```
- Pedidos agora mostram "Aprovado" ou "Recusado" junto com a resposta do buffet.
- Ao pedir mais pessoas, você vê a prévia do novo valor antes de enviar.
- A aprovação do dono do buffet agora é feita pelo servidor, com mais segurança.
- A idade do aniversariante é calculada pela data de nascimento.
- Validação do número de WhatsApp nos cadastros.
- Novos textos nas mensagens de confirmação.
- Os botões ficam travados enquanto as informações são salvas, evitando envios duplicados.
- Avisos da Komyx direto no app.
- Pagamento com outro valor.
```

5. Send it for review.

## 3. JS-only fixes later (OTA)

If a fix touches only JavaScript/TypeScript or assets (no new native library, no change to
plugins or native fields in `app.json`), publish it without a new build:

```bash
cd mobile
npx eas-cli@latest update --channel production --message "short description of the fix"
```

The update only reaches binaries with runtime `1.1.0`, because the runtime follows `version`. Users get it
the next time they open the app (it downloads in the background and applies on the following launch).

Ship a new store build, with the version bumped (for example 1.1.1 or 1.2.0), when:
- you add or update a package with native code (`npx expo install ...` of a native module, an SDK update);
- you change plugins, permissions, `ios`/`android` in `app.json`, the icon or the splash screen.

When you bump `version`, the runtime changes and older OTA updates no longer reach the new binary,
which is intended.

To test an update before production, use a preview build (`--profile preview`) and
`npx eas-cli@latest update --channel preview`.

## Local development

`expo-updates` is a native module. After pulling this change, regenerate the local native project
(`npx expo run:ios`, or `npx expo prebuild --platform ios` and then a build) before you use the simulator.
In the dev client and Expo Go, updates stay off and the app loads from Metro as before.
