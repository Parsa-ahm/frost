# Frost ❄️

Cold call tracker Chrome extension — built for Google Maps outreach.

See `SPEC.md` for the full implementation spec.

## Quick Start

```bash
pnpm install
pnpm build
# Load dist/ in chrome://extensions → Developer mode → Load unpacked
```

## How it works

1. Search businesses on Google Maps (e.g. "plumbers toronto")
2. Frost overlays a status dot on every card
3. Click a dot → mark No Answer / Called / Rejected / Qualified
4. Side panel tracks live session stats and full call history
5. Qualified leads push to Twenty CRM with one click
6. Retry tab shows all no-answer leads for callback sessions
