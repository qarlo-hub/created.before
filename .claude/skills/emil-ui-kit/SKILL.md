---
name: emil-ui-kit
description: Emil Kowalski's full design-engineering toolkit in one skill (animations, UI polish, Apple-style design, mobile web, stress-testing UI, Sonner toasts, React Native/Expo motion, Swift). Use for any task about building, reviewing or improving a user interface or its animations, naming a motion effect, making a web app feel native on a phone, or writing Swift. Routes to the right sub-guide.
---

# Emil UI Kit

This skill bundles 14 guides from github.com/emilkowalski/skills (MIT license, see LICENSE). Each guide lives in its own folder as `GUIDE.md`, with its supporting files next to it.

## How to use

1. Pick the guide(s) that match the request from the table below.
2. Read that folder's `GUIDE.md` in full and follow it exactly as if it were the active skill. When it links to a sibling file (e.g. `RECIPES.md`), that file is in the same folder.
3. Ignore the frontmatter at the top of each `GUIDE.md`; it is kept only for reference.
4. If several guides apply, read `emil-design-eng/GUIDE.md` first for the shared philosophy.

| Request | Guide |
|---|---|
| General UI polish, design philosophy, "make it feel great" | `emil-design-eng/` |
| Build a web animation or transition from scratch | `animate/` |
| Review existing animation/motion code | `review-animations/` * |
| Audit and plan improvements to a whole codebase's motion | `improve-animations/` |
| Find places that should animate but don't | `find-animation-opportunities/` |
| "What's that effect called?" | `animation-vocabulary/` |
| Apple-style design, springs, gestures, materials, typography | `apple-design/` |
| Stress-test a component with worst-case data | `break-ui/` |
| Build several design variants behind a picker | `prototype/` * |
| Pick a frontend library for a task | `pick-ui-library/` * |
| Make a web app feel native on mobile, PWA | `mobile-native/` |
| Sonner toast library | `ask-sonner/` |
| Animations in React Native / Expo | `animate-expo/` |
| Writing or reviewing Swift | `write-swift/` |

\* In the original repo these three run **only when the user explicitly asks for them** (e.g. "review the animations", "prototype this", "pick a library"). Keep that rule: do not start them on your own.
