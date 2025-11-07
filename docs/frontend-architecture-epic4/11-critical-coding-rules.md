# 11. Critical Coding Rules

## Epic 4 Frontend Standards

1. **Always Use Optimistic Updates for Inline Actions**
   - Never show loading spinners for quick actions (feedback, ratings, status changes)
   - Implement rollback on error with toast notification
   - Example: `useInlineAction` hook mandatory for all mutation actions

2. **Mobile-First Responsive Design**
   - Test every component at 375px width (iPhone SE)
   - Use bottom sheets for mobile, inline expansion for desktop
   - Leverage `useBreakpoints` hook for conditional rendering

3. **Avoid Modals Unless Absolutely Necessary**
   - Per UX specs: 70% modal reduction goal
   - Use inline expansion (`InlineExpander`) by default
   - Modals only for: confirmations, critical errors, multi-step wizards

4. **Dark Mode Support Mandatory**
   - Every component must work in both light/dark modes
   - Use `dark:` prefix for dark mode variants
   - Test with system preference toggle

5. **Accessibility is Non-Negotiable**
   - All interactive elements need `aria-label` or `aria-labelledby`
   - Keyboard navigation must work (Tab, Enter, Escape)
   - Screen reader test with VoiceOver (Mac) or NVDA (Windows)

6. **TypeScript Strict Mode**
   - No `any` types allowed (use `unknown` if truly unknown)
   - Props interfaces required for all components
   - API responses must have typed interfaces

7. **Framer Motion for All Animations**
   - Consistent animation timing: `duration: 0.3, ease: 'easeInOut'`
   - Use `AnimatePresence` for enter/exit animations
   - Respect `prefers-reduced-motion` setting

8. **Tailwind Class Organization**
   - Use `cn()` utility for conditional classes (never raw template strings)
   - Order: layout → spacing → colors → typography → effects
   - Extract repeated patterns to `@layer components` in globals.css

9. **Error Boundaries for Resilience**

   ```typescript
   // Wrap all main sections
   <ErrorBoundary fallback={<ErrorFallback />}>
     <RecruiterDashboard />
   </ErrorBoundary>
   ```

10. **Performance Budget**
    - First Contentful Paint < 1.5s
    - Time to Interactive < 3s
    - Lighthouse Performance score > 90
    - Use `next/dynamic` for components > 50KB

---
