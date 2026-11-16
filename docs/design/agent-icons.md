# Agent icon sources and pixel treatment

The product marks identify integrations. They are not the application's own logo. The pixel interpretations are project artwork, not officially approved brand variants or evidence of endorsement.

## Sources

| Agent | Reference | Local source | Treatment |
| --- | --- | --- | --- |
| Antigravity | [Official press kit](https://antigravity.google/press), [full-color SVG](https://antigravity.google/assets/image/brand/antigravity-icon__full-color.svg) | `src/assets/agents/sources/antigravity-original.svg` | Hand-tuned arch on a native 16-pixel grid; source color arrangement retained as discrete regions |
| OpenCode | [Official brand guide](https://opencode.ai/brand), [dark-background SVG](https://opencode.ai/brand/files/opencode-logo-dark.svg) | `src/assets/agents/sources/opencode-original.svg` | Compact project rendition at 12 x 15 with 3-pixel strokes; original 4:5 proportion and source inks retained |
| Codex | [Official product page](https://openai.com/codex/), [official icon identification](https://cdn.openai.com/pdf/5386d3f8-5342-4aae-a390-b9bff026a487/board-directors-guide-to-cybersecurity-in-the-age-of-ai.pdf), [Lobe Icons reference](https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/codex-color.svg) | `src/assets/agents/sources/codex-reference.svg` | Hand-tuned cloud and white terminal prompt; original lavender/blue palette retained as discrete bands |

Sources retrieved November 15, 2026. The two first-party SVG files and the community reference file are stored unchanged. A dedicated official standalone Codex SVG download was not established. The community SVG is labeled as such and was checked against the distinct Codex product symbol shown by OpenAI; it is not the OpenAI Blossom or a verified CLI-specific mark.

The community Codex SVG's MIT notice is retained in `src/assets/agents/sources/codex-reference-license.txt`. That software license does not establish permission to claim ownership of a product trademark. The downloaded provider assets are not relicensed under the repository's license. See the providers' own brand guidance, including [OpenAI's guidelines](https://openai.com/brand/). No provider approval of a pixel interpretation is claimed.

## Approved design decisions

- Base each image on its product symbol. Do not add eyes, hands, horns, faces, or invented mascot anatomy.
- Preserve the brand palette through working, approval, question, sending, completed, failed, and offline states.
- Preserve the cloud prompt, the Antigravity arch's open center, and OpenCode's 4:5 proportions.
- Show the native 16-pixel logo beside an independent 8-pixel companion in a 28 x 24 slot. Header/settings versions show only the 16-pixel mark. The compact OpenCode interpretation is smaller than the brand guide's official display minimum; the original full-size asset remains unchanged in the sources directory.
- Animate companion frames only. Provider-specific timing and activity shapes distinguish terminal progression, lift progression, and rectangular steps.
- Product marks remain static. Idle state companions have occasional motion with long rest periods as of 0.7.0. Completion/failure sequences settle once. Hidden/offscreen animations pause, and the motion control stops nonessential loops.
- Reduced motion keeps the identical brand mark and one final companion symbol.

The purpose of pixel treatment is to make the product identity fit the island's established visual language. Source-derived colors are identification, not decoration. State belongs to the companion so a user can recognize the provider before reading its task.

## Implementation

`src/avatars.js` owns the hand-tuned pixel geometry. `src/island.css` owns only sizing and companion timing. Generate the standalone SVG fallbacks from that geometry with:

```powershell
node scripts/assets/export-agent-icons.cjs
```

The source references are used only by the local [icon comparison](../../src/preview/agent-icons.html). The island does not fetch logo artwork from external services at runtime.
