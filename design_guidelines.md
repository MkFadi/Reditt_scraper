# Reddit Data Scraper - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Material Design 3 inspired)
**Rationale:** This is a utility-focused data collection tool requiring clarity, efficiency, and trust. Users need to quickly understand inputs, monitor progress, and export data without confusion.

**Core Principles:**
- Clarity over decoration
- Progressive disclosure of information
- Clear visual hierarchy for form → action → results flow
- Professional polish without visual clutter

## Typography

**Font Family:** Inter (via Google Fonts)
- Primary interface font with excellent readability at all sizes

**Type Scale:**
- Headings: 2xl (24px, semibold) for page title
- Section labels: base (16px, medium) for input labels
- Input text: base (16px, regular)
- Helper text: sm (14px, regular)
- Progress indicators: lg (18px, medium)
- Button text: base (16px, medium)

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, and 16
- Form element spacing: gap-6 between input groups
- Section padding: p-8 for cards, p-12 for main container
- Button padding: px-6 py-3

**Page Structure:**
- Centered single-column layout, max-w-2xl
- Vertical spacing: space-y-8 between major sections
- Card-based component grouping with subtle elevation

## Component Library

### Form Components

**Input Fields:**
- Full-width text inputs with floating labels
- Clear placeholder text (e.g., "Enter subreddit name (e.g., 'de')")
- Helper text below each input explaining purpose
- Number inputs with inline min/max indicators
- All inputs grouped in a cohesive form card

**Dropdown Selects:**
- Custom-styled select elements matching input aesthetic
- Clear option labels (e.g., "Top Posts", "New Posts", "Hot Posts")
- Export mode dropdown with descriptive options

**Buttons:**
- Primary action button (Start Scraping): Large, full-width, prominent
- Secondary action button (Download JSON): Full-width, appears when data ready
- Clear disabled states with opacity changes
- No hover effects on blurred backgrounds (if applicable)

### Progress Display

**Progress Tracking Card:**
- Dedicated card appearing below form when scraping starts
- Three-column grid layout for metrics:
  - Posts Found: X/200
  - Posts Processed: Y
  - Comments Collected: Z
- Linear progress bar spanning full width showing overall completion
- Status messages (e.g., "Scraping in progress...", "Complete!")

### Data Display

**Results Summary:**
- Compact stats card showing final counts
- Clear success/warning messages if fewer than target posts found
- Export format indicator

## Navigation & Flow

**Single Page Layout:**
1. Header: App title and brief description
2. Configuration Form: All inputs in single card
3. Progress Section: Appears dynamically during scraping
4. Export Section: Download button and format selection

**Visual States:**
- Initial: Form ready, progress hidden
- Active: Form locked, progress visible and updating
- Complete: Form unlocked, download button enabled, progress shows final state

## Animations

**Minimal Motion:**
- Smooth transitions only for appearing/disappearing progress section (fade in/out, 200ms)
- Progress bar fill animation (smooth, not stepped)
- No decorative animations
- Focus states use subtle scaling (1.02x)

## Accessibility

- All inputs have associated labels and ARIA attributes
- Clear focus indicators on all interactive elements
- Progress updates announced to screen readers
- Error states clearly communicated visually and programmatically
- Keyboard navigation fully supported (tab order: inputs → start → download)

## Images

**No Hero Image:** This utility app requires immediate access to functionality. No hero section needed.

**Optional Icon:** Small Reddit-themed icon (16x16 or 24x24) next to app title for branding, use placeholder comment if needed.

## Responsive Behavior

**Desktop (default):**
- Centered layout with generous margins
- Comfortable input sizes

**Mobile:**
- Full-width with minimal horizontal padding (px-4)
- Stacked layout maintained
- Slightly reduced vertical spacing (space-y-6)
- Touch-friendly tap targets (min 44px height)