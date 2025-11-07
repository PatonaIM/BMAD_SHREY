# 14. Migration from Material-UI (If Applicable)

If your project previously used Material-UI and is migrating to Tailwind for Epic 4:

## Component Mapping

| Material-UI                    | Tailwind Equivalent                                 |
| ------------------------------ | --------------------------------------------------- |
| `<Box>`                        | `<div className="...">`                             |
| `<Stack>`                      | `<div className="flex flex-col gap-4">`             |
| `<Grid>`                       | `<div className="grid grid-cols-12 gap-4">`         |
| `<Card>`                       | `<div className="card">` (custom utility)           |
| `<Button variant="contained">` | `<button className="btn-primary">`                  |
| `<Button variant="outlined">`  | `<button className="btn-outline">`                  |
| `<Typography variant="h3">`    | `<h3 className="text-2xl font-bold">`               |
| `<Chip>`                       | `<span className="px-2 py-1 rounded-full text-xs">` |

## Theme Migration

```typescript
// Before (Material-UI)
const theme = {
  palette: {
    primary: { main: '#A16AE8' },
    secondary: { main: '#8096FD' },
  },
};

// After (Tailwind)
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#A16AE8',
        secondary: '#8096FD',
      },
    },
  },
}

// Usage
<div className="bg-brand-primary text-white">...</div>
```

---
