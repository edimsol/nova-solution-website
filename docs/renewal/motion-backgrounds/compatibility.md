# Motion background compatibility review

Reviewed 2026-10-09. This is a source and documentation review, not a claim that every browser or physical device has been tested. The implementation and its separate validation report determine the final delivered behavior.

## Media delivery

Use a local, silent H.264/AVC MP4 as the primary delivery format, with the existing JPG beneath it. AVC in MP4 is supported by Chrome, Edge, Safari and Firefox; Firefox can depend on installed operating-system codecs. Runtime decoding failure must therefore leave the JPG visible. An optional WebM rendition is an additional fallback, not a prerequisite for the page. [MDN codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs), [MDN containers](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers).

Encoding recommendations for these decorative, slow-moving scenes: 8-bit `yuv420p`, no audio track, constant 24 fps or lower after visual review, a practical 1280px desktop/640px mobile delivery size, and MP4 `faststart`. Do not upscale the supplied 1672 × 941 originals and label them native 4K. Use the actual codec/profile/level, dimensions, frame rate, duration and bytes in the asset manifest. The first/last frame seam must be reviewed visually; `loop` alone does not make mismatched frames seamless.

Set `muted`, `defaultMuted`, `playsInline` and `loop` before selecting a source or calling `play()`. Use `preload="none"` until a scene is eligible; `preload` alone is a hint and is not sufficient to prevent downloads if a source/autoplay has already been attached. Catch the Promise returned by `play()`. Do not repeatedly retry rejected autoplay; keep the still image and let an explicit motion control trigger a new attempt. [MDN video element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video), [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

| Browser family | Documentation-backed expectation | Required fallback or check |
| --- | --- | --- |
| Chrome / Android Chrome | Muted autoplay is supported under the documented policy. | Catch failure; check first-frame playback rather than merely the presence of a video node. |
| Edge | Chromium media support is available; organization/site autoplay settings may intervene. | Test the same MP4 and rejection behavior, without overriding the user's policy. |
| Safari / iOS Safari | Silent or muted playback may autoplay; `playsinline` prevents forced full-screen video on iPhone. | Catch rejection; verify on real Safari/iOS before claiming device verification. |
| Firefox | H.264 playback depends partly on OS media support, and autoplay preferences can be stricter. | Check `canPlayType`, handle load/play failure, retain JPG. |

Sources: [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay), [Microsoft Edge autoplay policy](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/AutoplayAllowed), [WebKit iOS video policy](https://webkit.org/blog/6784/new-video-policies-for-ios/), [WebKit macOS autoplay guidance](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).

## Resource use and accessibility

- Decode only the selected scene. Pause the previous video before switching, and keep still-image layers responsible for visual continuity. Do not keep six looping decoders active behind invisible layers.
- Pause videos and cancel decorative animation work when `document.hidden` is true; re-check eligibility on `visibilitychange` and `pageshow`. CSS opacity alone does not express page visibility. [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- With `prefers-reduced-motion: reduce`, show the existing static JPG and static logo, with no video source download or scheduled decorative animation. Listen for changes while the page is open. [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
- Honor `navigator.connection?.saveData` where exposed. Its absence does not prove an unrestricted connection. This API has limited browser availability. [MDN saveData](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData).
- `navigator.mediaCapabilities?.decodingInfo()` can help choose a supported, smooth configuration, but `powerEfficient` is an estimate and may initially be optimistic before device statistics exist. It is not a measurement of battery savings. Catch unsupported/configuration errors and retain a conservative rendition or JPG. [MDN decodingInfo](https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo).
- Do not require the Battery Status API. It is limited to some browsers/secure contexts and reports battery level/charging, not a portable OS low-power-mode signal. Optional low-battery handling must not replace visibility, reduced-motion and manual-pause controls. [MDN Battery Status](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API).
- Make the video decorative (`aria-hidden`, no focusable controls, no pointer interception). Provide a separate accessible control to pause/resume background motion without affecting navigation or product interactions.

These measures reduce avoidable downloads, decoding and animation work. No percentage of energy saved or universal hardware-decoding guarantee has been measured in this environment.

## Logo effect

Keep `nova-symbol-light.svg` as the stable #FEFEFE brand mark. Surround it with a small inline decorative SVG whose paths/particles express engineering-to-data flow. Run a short, finite sequence after an idle interval; stop its timer and active animations when hidden or reduced motion is enabled. Prefer opacity/transform and a small number of stroke effects. Keep shadows static and avoid continuously animating large blur filters or an always-running JavaScript frame loop.

CSS keyframes or the basic Web Animations `Element.animate()` interface can drive this timeline. Feature-detect animation support and leave the static logo if unavailable; newer scroll-timeline features are unnecessary for this timed effect. SVG SMIL is another SVG-native option, but explicit scheduling/cancellation is easier with the same controller used for the rest of the site. [MDN Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [MDN SVG animation](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_animation_with_SMIL).

## Local environment and deployment audit

The Windows QA environment has Chrome and Edge installed. Firefox/WebKit test runtimes are absent. Browser presence alone is not evidence of completed playback tests; see verification.json for actual results. Safari/iOS and battery consumption require physical-device testing.

Encoding uses the full FFmpeg 7.1 binary bundled with imageio-ffmpeg 0.6.0, installed in a temporary local tools directory. The repository does not include that executable. The pre-existing Playwright FFmpeg is a restricted build unsuitable for H.264 MP4 transcoding.

`scripts/build-pages.mjs` now recognizes MP4/WebM alongside image/font/GLB assets embedded in JS/CSS. Keep video source paths literal or explicitly represented in the build manifest. If new root JS/CSS files are introduced, include them in the root allowlist and fixture. The 11-root-HTML condition and path/symlink safety checks remain in force. Regression fixtures use non-text MP4/WebM bytes and verify unchanged SHA-256 copies; missing referenced video must fail before deleting an existing build. Actual asset validation must also check MIME `video/mp4`, local 200/206 behavior as appropriate, no missing files, and JPG fallback with video blocked.

Suggested validation cases: desktop/mobile first-frame playback; all six scene changes in both directions; rapid scroll and direct anchors; only one active decoder; hidden-tab pause/resume; rejected autoplay; failed media load; reduced motion before and after load; saved manual pause; mobile network-saving preference; logo idle recurrence/cancellation; transparent header readability over every scene; unchanged menu/accordion/3D inputs.
