# Rabbi teachings preview (not production)

- New `/rebbe-teachings.html` preview page: metadata search for Sichos/Maamarim, source links and shared-study room using the existing `/api/session/[id]` presence endpoint.
- New `/api/rebbe-teachings?q=...` server-side search proxy to ChassidusHub `/v1/search`.
- Rights: only bibliographic metadata and links are displayed. **No copyrighted text, audio, PDF, scans or automatic translation of those texts is copied or cached.** ChassidusHub states `open` and `credit` may be served, but `link` and `preserved` may not; even for `credit`, verify source-specific terms before full text integration.
- Machine output: mark unchecked machine-generated content; do not present it as verified.
- Translation: deferred until a rights-cleared passage and a configured server-side Azure Translator endpoint are verified. Do not expose credentials in browser code. The preview interface is in Hebrew.
- Havruta: uses the existing anonymous D1 presence endpoint. Only selected source id and presence metadata are shared; no text. No changes to production's existing Havruta implementation.
- Manual test: search a parasha, inspect source URL, select a result, share session link between two browsers, check peers. Test invalid queries and upstream outage.
- Deployment warning: GitHub branch previews may be public if Cloudflare Pages preview builds are enabled. Restrict preview access in Cloudflare Access before testing with private information.
- No homepage navigation or production configuration changed. Do not merge until API response schema, attribution, translation rights, mobile and Havruta tests pass.
