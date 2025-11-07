# 15. Next Steps

## Week 1: Setup & Foundation

1. **Install Dependencies**

   ```bash
   npm install @headlessui/react framer-motion lucide-react clsx tailwind-merge
   npm install -D @tailwindcss/container-queries
   ```

2. **Create Utility Functions**
   - `lib/utils/cn.ts` - Class name merger
   - `lib/utils/formatting.ts` - Date/number formatters
   - `hooks/useMediaQuery.ts` - Responsive hooks

3. **Build UI Primitives**
   - `components/ui/BottomSheet.tsx`
   - `components/ui/InlineExpander.tsx`
   - `components/ui/OptimisticLoader.tsx`

4. **Manual Test**: Utilities work, UI primitives render correctly in light/dark mode

## Week 2-3: Core Components

- `ApplicationCard` with inline expansion
- `InlineActions` toolbar with optimistic updates
- `TimelineView` with role-based filtering
- `SchedulingPanel` with availability grid
- **Manual Test**: Use browser DevTools to verify each component (see Section 9 checklist)

## Week 4: Responsive & Polish

- Mobile bottom sheet implementations
- Cross-browser testing (Chrome, Safari, Firefox, Edge)
- Accessibility audit with browser DevTools (ARIA, keyboard nav)
- Performance check: Lighthouse score >90
- **Manual Test**: Test on real devices (iPhone, Android, iPad)

## Week 5: Deployment

- Production build testing (`npm run build`)
- Deploy to Vercel staging
- Full manual test pass (see Section 9 checklist)
- Monitor with Sentry
- **Post-MVP**: Begin automated test implementation (Phase 1: unit tests)

---

**Document Status**: Ready for implementation. Frontend architecture aligned with Epic 4 inline-first UX specifications and Tailwind CSS design system.

_Prepared by Winston (Architect) | 2025-11-07_
