---
name: theme-factory
description: Apply professional font and color themes to artifacts including slides, docs, reports, dashboards, and HTML landing pages. Use when styling any artifact with a cohesive theme or generating custom color schemes.
---

# Theme Factory Skill

## Purpose
Apply professional, cohesive themes to any artifact - dashboards, landing pages, documents, presentations, or reports.

## Pre-Built Themes

### 1. Midnight Modern
```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --accent-primary: #6366f1;
  --accent-secondary: #818cf8;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

### 2. Ocean Breeze
```css
:root {
  --bg-primary: #0c1222;
  --bg-secondary: #1a2744;
  --bg-tertiary: #2d4a6f;
  --text-primary: #e0f2fe;
  --text-secondary: #7dd3fc;
  --accent-primary: #0ea5e9;
  --accent-secondary: #38bdf8;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
}
```

### 3. Emerald Forest
```css
:root {
  --bg-primary: #0a0f0d;
  --bg-secondary: #14231d;
  --bg-tertiary: #1e3a30;
  --text-primary: #ecfdf5;
  --text-secondary: #a7f3d0;
  --accent-primary: #10b981;
  --accent-secondary: #34d399;
  --success: #22c55e;
  --warning: #fbbf24;
  --error: #f87171;
  --font-heading: 'Sora', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
```

### 4. Rose Gold
```css
:root {
  --bg-primary: #1a1016;
  --bg-secondary: #2d1f26;
  --bg-tertiary: #4a333d;
  --text-primary: #fdf2f8;
  --text-secondary: #fbcfe8;
  --accent-primary: #ec4899;
  --accent-secondary: #f472b6;
  --success: #4ade80;
  --warning: #fbbf24;
  --error: #f87171;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Lato', sans-serif;
}
```

### 5. Arctic Light
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --accent-primary: #3b82f6;
  --accent-secondary: #60a5fa;
  --success: #16a34a;
  --warning: #ca8a04;
  --error: #dc2626;
  --font-heading: 'Manrope', sans-serif;
  --font-body: 'Source Sans Pro', sans-serif;
}
```

### 6. Sunset Vibes
```css
:root {
  --bg-primary: #1c1014;
  --bg-secondary: #2e1a1f;
  --bg-tertiary: #4a2a33;
  --text-primary: #fff7ed;
  --text-secondary: #fed7aa;
  --accent-primary: #f97316;
  --accent-secondary: #fb923c;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --font-heading: 'Poppins', sans-serif;
  --font-body: 'Nunito', sans-serif;
}
```

### 7. Corporate Blue
```css
:root {
  --bg-primary: #0f1629;
  --bg-secondary: #1a2540;
  --bg-tertiary: #273654;
  --text-primary: #f0f4f8;
  --text-secondary: #a0aec0;
  --accent-primary: #2563eb;
  --accent-secondary: #3b82f6;
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --font-body: 'Open Sans', sans-serif;
}
```

### 8. Purple Haze
```css
:root {
  --bg-primary: #0d0a1a;
  --bg-secondary: #1a1530;
  --bg-tertiary: #2a234a;
  --text-primary: #f5f3ff;
  --text-secondary: #c4b5fd;
  --accent-primary: #8b5cf6;
  --accent-secondary: #a78bfa;
  --success: #22d3ee;
  --warning: #fbbf24;
  --error: #f87171;
  --font-heading: 'Raleway', sans-serif;
  --font-body: 'Rubik', sans-serif;
}
```

### 9. Minimal Mono
```css
:root {
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #171717;
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --accent-primary: #ffffff;
  --accent-secondary: #e5e5e5;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --font-heading: 'JetBrains Mono', monospace;
  --font-body: 'IBM Plex Mono', monospace;
}
```

### 10. Warm Earth
```css
:root {
  --bg-primary: #1c1917;
  --bg-secondary: #292524;
  --bg-tertiary: #44403c;
  --text-primary: #fafaf9;
  --text-secondary: #d6d3d1;
  --accent-primary: #a16207;
  --accent-secondary: #ca8a04;
  --success: #65a30d;
  --warning: #ea580c;
  --error: #dc2626;
  --font-heading: 'Merriweather', serif;
  --font-body: 'Source Serif Pro', serif;
}
```

## Custom Theme Generator

### Input Format
Provide these parameters:
- **Industry**: (tech, finance, healthcare, restaurant, retail)
- **Mood**: (professional, playful, minimal, bold, elegant)
- **Primary Color**: (hex or color name)
- **Light/Dark**: (dark preferred for modern apps)

### Example Generation
```
Industry: Restaurant
Mood: Warm, inviting
Primary: #FF6B35 (coral)
Mode: Dark
```

**Generated Theme:**
```css
:root {
  --bg-primary: #1a0f0a;
  --bg-secondary: #2d1a12;
  --bg-tertiary: #44281c;
  --text-primary: #fff5f0;
  --text-secondary: #ffcdb8;
  --accent-primary: #ff6b35;
  --accent-secondary: #ff8f65;
  --success: #4ade80;
  --warning: #fbbf24;
  --error: #f87171;
  --font-heading: 'Josefin Sans', sans-serif;
  --font-body: 'Quicksand', sans-serif;
}
```

## Tailwind Theme Config

```js
// tailwind.config.js with theme
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7f0',
          100: '#fdede0',
          200: '#fbd8be',
          300: '#f8bb8f',
          400: '#f4935e',
          500: '#ff6b35', // accent-primary
          600: '#e85520',
          700: '#c1401a',
          800: '#99341c',
          900: '#7c2d1a',
        },
        surface: {
          DEFAULT: '#1a0f0a',
          secondary: '#2d1a12',
          tertiary: '#44281c',
        },
      },
      fontFamily: {
        heading: ['Josefin Sans', 'sans-serif'],
        body: ['Quicksand', 'sans-serif'],
      },
    },
  },
};
```

## Application Instructions

### For React/Next.js
```tsx
// globals.css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

:root {
  /* Paste theme variables here */
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

### For HTML Artifacts
```html
<style>
  :root {
    /* Theme variables */
  }
  
  body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-body);
  }
</style>
```

## Instructions

1. **Identify the artifact type**: Dashboard, landing page, report, etc.
2. **Choose or generate theme**: Use pre-built or create custom
3. **Apply CSS variables**: Add to root stylesheet
4. **Import fonts**: Add Google Fonts or local fonts
5. **Update components**: Use theme variables in components
6. **Test contrast**: Ensure readability
7. **Add transitions**: Smooth color transitions for interactivity
