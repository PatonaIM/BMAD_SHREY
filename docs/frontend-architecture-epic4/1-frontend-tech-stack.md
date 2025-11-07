# 1. Frontend Tech Stack

## Core Technologies

| Category             | Technology               | Version     | Purpose                         | Rationale                                                                     |
| -------------------- | ------------------------ | ----------- | ------------------------------- | ----------------------------------------------------------------------------- |
| **Framework**        | Next.js                  | 15.0.0      | React framework with App Router | SSR, file-based routing, API routes, optimal performance                      |
| **Language**         | TypeScript               | 5.3.3       | Type-safe development           | Catch errors early, better IDE support, self-documenting code                 |
| **Styling**          | Tailwind CSS             | 3.4+        | Utility-first CSS framework     | Rapid development, consistent design, mobile-first, dark mode support         |
| **UI Primitives**    | Headless UI              | 1.7+        | Unstyled accessible components  | Accessibility built-in, full styling control with Tailwind                    |
| **State Management** | TanStack Query           | 4.36+       | Server state management         | Optimistic updates, automatic refetching, caching, perfect for inline actions |
| **Form Handling**    | React Hook Form          | 7.48+       | Performant form management      | Minimal re-renders, validation, works well with inline forms                  |
| **Validation**       | Zod                      | 3.22+       | Schema validation               | Type-safe, reuse tRPC schemas, client-side validation                         |
| **Animation**        | Framer Motion            | 10.16+      | React animation library         | Smooth transitions for inline expansions, bottom sheets, micro-interactions   |
| **Icons**            | Lucide React             | 0.292+      | Icon library                    | Tree-shakeable, consistent design, extensive collection                       |
| **Testing**          | Vitest + Testing Library | 1.0+, 14.0+ | Unit/integration testing        | Fast, compatible with Next.js, React-focused testing utilities                |
| **E2E Testing**      | Playwright               | 1.40+       | End-to-end testing              | Cross-browser, reliable, network mocking                                      |

## Tailwind Plugins

```javascript
// tailwind.config.js (extensions for Epic 4)
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'), // NEW - for inline card responsive breakpoints
  ],
};
```

---
