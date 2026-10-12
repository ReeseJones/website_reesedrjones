# Generalized Settings Dialog & Site Settings Design

Design specification for the generalized, tabbed `SettingsDialog` and the centralized `SiteSettings` persistence architecture.

---

## 1. Overview & Motivation

Previously, the settings experience was represented exclusively by `GalaxySettingsDialog`, a monolithic modal tied directly to `GalaxyParameters` and `GalaxyController`. As the site adds cross-cutting features (such as toggling the WebGL FPS counter, motion reduction, or graphics quality options), bundling or nesting these into a galaxy-specific modal creates coupling and poor discovery.

This design introduces a two-tier architecture:
- **Centralized Site Settings (`useSiteSettings`):** A typed, lightweight store with `localStorage` persistence managing global preferences.
- **Extensible Settings Dialog (`SettingsDialog`):** A generalized, tabbed dialog container that renders modular category tabs (such as **General** and **Galaxy Backdrop**), open to any future feature or test section.

---

## 2. Design Goals & Principles

- **Open for Extension, Closed for Modification:** Adding a new category of settings (e.g., Audio, Accessibility, Shaders, or Scene Tours) should require only creating a new section component and registering it as a tab, without modifying existing sections or dialog internals.
- **Zero-Friction Developer Experience:** Developers can add a new site setting in two straightforward steps: define the typed field in `SiteSettings` and add a form row in the appropriate section.
- **Performance & Isolation:** Toggling site settings or tweaking continuous galaxy sliders must remain isolated. Galaxy parameter updates continue to stream to WebGL without triggering full-page DOM re-render cascades.
- **Glassmorphic Sidebar Shell:** Preserves the existing left-docked frosted sidebar UX (`backdrop-filter: blur(12px)` over transparent backdrop) so users can observe real-time visual feedback on the canvas behind the modal.
- **No Barrel Aggregators & Clean Type Separation:** All types reside in dedicated `*_types.ts` modules. Components import dependencies directly.
- **Semantic & Accessible Markup:** Uses `<dialog>` container semantics, ARIA tablist patterns (`role="tablist"`, `role="tab"`, `role="tabpanel"`), and keyboard navigation between tabs.

---

## 3. Directory & File Organization

The new generalized settings system lives across two dedicated directories:

### Site Settings Subsystem (`src/settings/`)
- [site_settings_types.ts](../../settings/site_settings_types.ts) — Type definitions for `SiteSettings`, default values, and local storage constants.
- [use_site_settings.ts](../../settings/use_site_settings.ts) — Encapsulated hook managing `localStorage` synchronization, partial updates, and reset operations.
- [site_settings_context.ts](../../settings/site_settings_context.ts) — Ambient React Context provider and `useSiteSettingsContext()` hook.

### Settings Dialog Subsystem (`src/components/settings_dialog/`)
- [design.md](./design.md) — This specification.
- [settings_dialog_types.ts](./settings_dialog_types.ts) — Prop interfaces, tab descriptors, and tab identifier types.
- [settings_dialog.scss](./settings_dialog.scss) — Sidebar shell, tab navigation bar, content panel layout, and animations.
- [settings_dialog.tsx](./settings_dialog.tsx) — Container component rendering the modal, header, tablist, and active tab content.
- [settings_tab.tsx](./settings_tab.tsx) — Declarative tab child component for composition.
- [general_settings_section.tsx](./general_settings_section.tsx) — Section for global toggles (e.g. Show FPS Counter, DPR cap).
- [galaxy_settings_tab.tsx](./galaxy_settings_tab.tsx) — Galaxy adapter tab embedding the existing galaxy toolbar and the 7 tuning sections from `src/galaxy_backdrop/galaxy_settings_dialog/`.

---

## 4. Developer Perspective & Component Usage

To make the system developer-friendly, the dialog supports two complementary usage patterns:

### Pattern A: Declarative JSX Composition (Recommended)
Allows developers to declare tabs as first-class React elements. Ideal when different tabs require distinct external controllers or props.

```tsx
<SettingsDialog
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  defaultTab="general"
>
  <SettingsTab id="general" label="General" icon={<SlidersIcon />}>
    <GeneralSettingsSection
      settings={siteSettings}
      onChange={updateSiteSettings}
      onReset={resetSiteSettings}
    />
  </SettingsTab>

  <SettingsTab id="galaxy" label="Galaxy Backdrop" icon={<GalaxyIcon />}>
    <GalaxySettingsTab controller={backdropGalaxy} />
  </SettingsTab>
</SettingsDialog>
```

### Pattern B: Programmatic Tab Configuration
Allows passing an array of tab descriptor objects. Useful when tabs are generated dynamically based on feature flags, routes, or plugin lists.

```tsx
<SettingsDialog
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  tabs={[
    {
      id: "general",
      label: "General",
      content: <GeneralSettingsSection />,
    },
    {
      id: "galaxy",
      label: "Galaxy Backdrop",
      content: <GalaxySettingsTab controller={backdropGalaxy} />,
    },
  ]}
/>
```

### How a Developer Adds a New Site Setting (e.g., "Mute Audio")
1. **Add field to `site_settings_types.ts`:**
   ```typescript
   export interface SiteSettings {
     debug: { showFps: boolean };
     audio: { muted: boolean }; // <-- New setting
   }
   ```
2. **Add default in `site_settings_types.ts`:**
   ```typescript
   export const DEFAULT_SITE_SETTINGS: SiteSettings = {
     debug: { showFps: false },
     audio: { muted: false },
   };
   ```
3. **Add toggle row in `general_settings_section.tsx`:**
   ```tsx
   <CheckboxRow
     label="Mute Audio"
     checked={settings.audio.muted}
     onChange={(muted) => onChange({ audio: { muted } })}
   />
   ```
4. **Consume in any component or canvas pass:**
   ```tsx
   const { settings } = useSiteSettingsContext();
   if (settings.audio.muted) { /* ... */ }
   ```

---

## 5. Type Interfaces & Contracts

### Site Settings Contracts (`src/settings/site_settings_types.ts`)

- `SiteSettings`:
  - `debug: { showFps: boolean }` — Controls visibility of `<FpsCounter />`.
  - `graphics: { dprCap?: number }` — Maximum device pixel ratio override for WebGL contexts.
- `DeepPartial<T>`: Recursive partial for clean partial updates.
- `SiteSettingsContextValue`:
  - `settings: SiteSettings`
  - `updateSettings: (patch: DeepPartial<SiteSettings>) => void`
  - `resetSettings: () => void`

### Dialog Contracts (`src/components/settings_dialog/settings_dialog_types.ts`)

- `SettingsTabDescriptor`:
  - `id: string` — Unique identifier for the tab.
  - `label: string` — User-facing display title.
  - `icon?: React.ReactNode` — Optional leading icon.
  - `badge?: string | number` — Optional indicator badge (e.g. "Beta" or count).
  - `content: React.ReactNode` — Tab panel body.
- `SettingsDialogProps`:
  - `isOpen: boolean` — Modal visibility flag.
  - `onClose: () => void` — Modal dismiss callback.
  - `activeTabId?: string` — Controlled active tab.
  - `defaultTabId?: string` — Initial uncontrolled active tab (defaults to `"general"`).
  - `onTabChange?: (tabId: string) => void` — Tab change listener.
  - `tabs?: SettingsTabDescriptor[]` — Programmatic tab list (optional if using children).
  - `children?: React.ReactNode` — Composed `<SettingsTab>` children.

---

## 6. Dialog Architecture & Layout Specification

```
+-------------------------------------------------------------------+
|  [GearIcon] Site Settings                                     [X] |
+-------------------------------------------------------------------+
|  [ General ]   [ Galaxy Backdrop ]   [ + Future Tab ]             |  <-- Tablist Bar
+-------------------------------------------------------------------+
|                                                                   |
|  === Active Tab Content (e.g. General) ===                       |
|                                                                   |
|  Diagnostics & Telemetry                                          |
|  [X] Show FPS Counter                                             |
|      Displays real-time frame rate, frame delta, and render time. |
|                                                                   |
|  Graphics & Display                                               |
|  Maximum DPR Cap: [ 1.5x ]                                        |
|                                                                   |
|  [ Reset General Defaults ]                                       |
|                                                                   |
+-------------------------------------------------------------------+
```

### Layout Breakdown
- **Header:** Title with gear icon, close button, and subtle bottom border.
- **Tab Navigation Bar (`.tab-bar`):**
  - Horizontal scrolling row of tab buttons (`role="tab"`) styled with subtle pills or underlined active states.
  - Accessible via Left/Right arrow keys with automatic panel switching.
- **Tab Panel (`.tab-panel`):**
  - Scrollable content area displaying only the active tab's view (`role="tabpanel"`).
  - Preserves scroll positions within each tab when switching between them.
- **Galaxy Tab Integration:**
  - When the "Galaxy Backdrop" tab is active, it renders the existing preset dropdown toolbar, "Reset Defaults", "Copy JSON", and the 7 section accordions ([render_style_section.tsx](../../galaxy_backdrop/galaxy_settings_dialog/render_style_section.tsx), camera, cloud, etc.).

---

## 7. State Synchronization & Persistence

- **Local Storage Key:** Stored under `"site_settings_v1"` in `localStorage`.
- **Merge on Load:** Merges cached JSON with `DEFAULT_SITE_SETTINGS` using a shallow/deep merge so newly added configuration properties automatically receive their default values without cache corruption.
- **Debounced / Throttled Writes:** Changes to boolean toggles write immediately; slider updates (if any) write on release or throttled at 200ms.
- **Error Resilient:** If `localStorage` is unavailable (e.g. private browsing storage quota restrictions), falls back gracefully to in-memory state.

---

## 8. Phased Implementation Plan

1. **Phase 1: Settings Store & Context**
   - Create `src/settings/site_settings_types.ts`.
   - Implement `src/settings/use_site_settings.ts` with test fixtures.
   - Implement `src/settings/site_settings_context.ts`.

2. **Phase 2: Generalized `SettingsDialog` Shell**
   - Create `src/components/settings_dialog/settings_dialog_types.ts` and `settings_dialog.scss`.
   - Implement `src/components/settings_dialog/settings_dialog.tsx` and `settings_tab.tsx`.
   - Implement `src/components/settings_dialog/general_settings_section.tsx` with the FPS toggle.
   - Implement `src/components/settings_dialog/galaxy_settings_tab.tsx` wrapping the existing galaxy sections.

3. **Phase 3: Integration into Application Layout**
   - In `src/layouts/layout.tsx`:
     - Wrap in `SiteSettingsProvider` (or consume `useSiteSettings`).
     - Conditionally render `<FpsCounter />` inside `<WebGLCanvas>` when `settings.debug.showFps` is true.
     - Replace `GalaxySettingsDialog` with `SettingsDialog`.

4. **Phase 4: Unit Testing & Verification**
   - Comprehensive unit test suite for `useSiteSettings` and `SettingsDialog`.
   - Smoke tests and production build verification.
