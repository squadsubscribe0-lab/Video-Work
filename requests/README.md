# Video requests

Add or edit a `.json` file in this folder and push it. GitHub Actions makes the
video and attaches it to the workflow run (Actions tab → the run → **Artifacts**).

```json
{
  "prompt": "Why is the sky blue?",
  "minutes": 2,
  "language": "en-US",
  "tts": "edge"
}
```

| Field | Default | Notes |
|---|---|---|
| `prompt` | | Topic or brief. Needs the `ANTHROPIC_API_KEY` repository secret. |
| `plan` | | Path to an existing plan.json instead of a prompt (no API key needed). |
| `minutes` | 2 | Target length. |
| `language` | en-US | e.g. `hi-IN`, `ur-PK`. |
| `tts` | edge | `edge` (free), `elevenlabs` (needs `ELEVENLABS_API_KEY` secret), `mock` (silent). |
| `voice` | | Voice name/id for the TTS provider. |
| `captions` | true | `false` hides captions. |

You can also run the **Make video** workflow by hand from the Actions tab and type the prompt there.
