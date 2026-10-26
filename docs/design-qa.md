**Comparison target**

- Source visual truth: `/var/folders/hh/01zpzdzd1095w_nwn4043rg80000gn/T/TemporaryItems/NSIRD_screencaptureui_3t2Tgr/Screenshot 2569-09-20 at 10.23.47.png`.
- Final direction: use a full-viewport 50/50 split, retaining the application's original login-card UI at the right and adding only a photographic collage at the left.
- Review state: unauthenticated `/login` and `/admin/login` in light theme at approximately 920 × 800 CSS px.

**Result**

- The original card, typography, field sizes, button styling, links, and theme control are retained.
- A single campus-learning collage is the only new visual surface and is placed in the left column.
- Decorative square outlines are removed from Login pages. The 50/50 layout and collage are constrained to the viewport height, so the desktop login view does not scroll.
- The desktop form no longer sits inside a second visible card: the entire right half is the surface, while the original fields and actions retain their familiar styling.
- `/register` reuses the same split-auth shell as `/login`, so navigation changes only the right-side form while the classroom collage remains in place.
- The photo pane now has a concise, localized learning-space message over a bottom contrast gradient, preserving image legibility without adding a separate information card.
- The form remains functional and has dedicated User and Admin variants; narrow screens hide the image and keep the original card-focused layout.
- No browser error UI was visible during the rendered review.

final result: passed
