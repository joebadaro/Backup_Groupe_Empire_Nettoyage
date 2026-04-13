# Floating Cinematic Header Implementation

## Objective
The goal is to seamlessly inject a refined, premium header into the established dark-glassmorphism YouTube Modal, preserving absolute layout density while securely hooking the user back into the `Groupe Nettoyage Empire` brand continuity matrix.

## Phase 1: CSS Framework Modification
Inside `src/components/YouTubeFacade.astro`, the following classes will be generated or heavily rewritten:

1. `:global(#yt-modal-header)`
   - Anchored `absolute top-0 left-0 w-100 flex justify-between`.
   - Generous padding to create an airy, premium breathing space on X and Y axes.

2. `:global(.yt-modal-brand)`
   - Serves as the wrapping structure for the natively mounted corporate logo.
   - For maximum visibility against the dark backdrop, the logo will optionally sit within a subtle semi-transparent `rgba(255,255,255,0.85)` pill container to ensure dark text contrasts correctly, providing a highly premium frosted aesthetic that prevents bulkiness.
   - Constrained to `height: 48px` to maintain subtlety.

3. Rewrite `:global(.yt-modal-close)` 
   - Position transitions from absolute free-floating into the flexing header element to visually tether it evenly onto the grid opposite the logo.

## Phase 2: Javascript DOM Injection
Modify `spawnYoutubeModal()`:
1. Generate `<header id="yt-modal-header">`.
2. Generate `<div class="yt-modal-brand">` and `<img src="/images/logo-last-update-1.webp" />`.
3. Map the `<button class="yt-modal-close">` directly as a sibling inside the strict header structure.
4. Finalize the hierarchical tree mapping securely to `overlay.appendChild(header)`.
