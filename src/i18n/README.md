# App languages

The app follows the device language on launch: English (`en`), Japanese (`ja`), Korean (`ko`), or Traditional Chinese (`zh-Hant`). Unsupported languages fall back to Traditional Chinese. Restart the app after changing the device language. The store name and saved album remain BFCam-男友相機 / BFCam.

Translations are applied at presentation boundaries (`Text`, accessibility properties, alerts and input placeholders). Persisted pose IDs, Chinese category/filter selection values, purchase identifiers and user input are not translated. This keeps existing camera preferences and selection comparisons compatible.

- `translations.txt`: Traditional Chinese source, English, Japanese and Korean separated by `|`.
- `pose-terms.txt`: reviewed descriptive terms used to assemble compact pose labels.
- `translations.json`: generated runtime dictionary; rebuild with `node scripts/build-translations.cjs`.
- `source-strings.json`: inventory of existing Chinese string literals and JSX text used by the coverage test.
- Dynamic messages use `{0}`, `{1}`, etc. Keep their indices in each translation. Unknown text falls back to its source; known fragments inside combined captions are translated in one pass.

When adding UI text, update the inventory and dictionary, import presentation components from `src/i18n/components`, and run the localization tests. The wrappers preserve refs, callbacks, input values and accessibility state. Camera tab labels shrink to fit longer translations.

Android reminder titles and channels use localized resources. iOS permission descriptions and notification titles use localized `.strings` resources registered in the Xcode project. Scheduled notification bodies use the language at scheduling time. Public privacy/terms pages and store metadata are outside this in-app translation change.

Validation: TypeScript, existing unit tests, 17 localization checks, Android Kotlin compilation and Android resource processing passed locally. iOS compilation requires macOS/Xcode; real-device layout and native permission prompts still need device acceptance.
