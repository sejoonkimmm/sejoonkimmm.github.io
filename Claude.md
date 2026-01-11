# Claude.md - Development Guidelines

## Project Overview

This is a VS Code-themed DevOps Engineer portfolio website built with Next.js 15, React 19, and TypeScript. The site showcases projects, technical articles, certifications, and professional experiences in a familiar IDE interface.

**Technology Stack:**
- Next.js 15.2.3 (App Router)
- React 19.0.0
- TypeScript 5.8.2
- CSS Modules
- react-markdown + remark-gfm for content rendering
- Deployed on Vercel

## Content Writing Guidelines (CRITICAL)

### 1. Language Requirements

**All content must be written in English:**
- Articles (`/articles/*.md`)
- Project descriptions (`/projects/*.md`)
- About section content
- Experience descriptions (`/experiences/*.md`)
- Certification descriptions (`/certifications/*.md`)

**English Level: B2 Maximum (Upper-Intermediate)**
- Use clear, direct language
- Avoid complex vocabulary or academic jargon
- Write naturally, not formally
- Keep sentences straightforward

### 2. Technical Writing Style

**Target Audience: First-year university students**

When writing technical blog posts:
- Explain concepts from the ground up
- Define technical terms when first used
- Use concrete examples
- Break down complex topics into simple steps
- Avoid assuming prior knowledge

**Good Example:**
```markdown
Kubernetes is a tool that helps you run many containers at once. Think of
it like a manager that makes sure your applications keep running even if
something breaks.
```

**Bad Example:**
```markdown
Kubernetes orchestrates containerized workloads with declarative configuration
paradigms, leveraging control plane components to maintain desired state
reconciliation across distributed infrastructure.
```

### 3. Tone and Style Requirements

**ABSOLUTELY FORBIDDEN:**
- LinkedIn-style motivational posts
- Excessive emojis or emoji spam
- Over-enthusiastic language ("Amazing!", "Incredible!", "Mind-blowing!")
- Generic AI-generated phrases
- Fake humility or humble-bragging
- Call-to-action spam ("Like and share!", "Comment below!")
- Unnecessary hashtags or keyword stuffing
- Formulaic transitions ("Here's how I did it:", "Let me show you how:", "Here's what I learned:")
- Clickbait phrases ("You won't believe...", "This changed everything...", "The one thing that...")

**Preferred Style:**
- Professional but approachable
- Direct and honest
- Focus on technical details
- Use natural conversational tone
- Let the work speak for itself

**Good Example:**
```markdown
I built a Kubernetes cluster that reduced deployment time by 40%. The cluster
uses horizontal pod autoscaling and optimized readiness probes.
```

**Bad Example:**
```markdown
🚀 Excited to share that I built an AMAZING Kubernetes cluster! 🎉
So proud of this journey! 💪 Reduced deployment time by 40%! 🔥
What an incredible learning experience! 🌟 Here's how I did it:
#Kubernetes #DevOps #Cloud
```

### 4. Image Requirements

**All images must be responsive:**

```tsx
// Always use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/example.png"
  alt="Descriptive alt text"
  width={800}
  height={600}
  layout="responsive"
  priority={false}
/>
```

**In Markdown files:**
```markdown
![Descriptive alt text](/images/example.png)
```

**CSS for markdown-rendered images:**
```css
.markdownContent img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 2rem auto;
}
```

**Never:**
- Use fixed pixel widths without responsive rules
- Forget alt text
- Use images wider than their container
- Skip testing on mobile devices

## Project Structure

```
/articles/          - Technical blog posts (Markdown)
/projects/          - Project case studies (Markdown)
/experiences/       - Career history (Markdown)
/certifications/    - Professional certifications (Markdown)
/pages/             - Next.js route pages
/components/        - React components
/lib/               - Utility functions (markdown parsing, etc.)
/styles/            - CSS modules
/public/            - Static assets (images, logos, resume)
/data/              - Content metadata
```

## Content File Structure

### Articles (`/articles/*.md`)

```markdown
---
title: "Your Article Title"
date: "YYYY-MM-DD"
excerpt: "Brief description for previews"
coverImage: "/images/article-cover.png"
tags: ["tag1", "tag2"]
---

Your article content here...
```

### Projects (`/projects/*.md`)

```markdown
---
title: "Project Name"
description: "Short description"
image: "/images/project-image.png"
tags: ["tech1", "tech2"]
live: "https://live-url.com"
source: "https://github.com/user/repo"
---

Detailed project description...
```

### Experiences (`/experiences/*.md`)

```markdown
---
title: "Job Title"
company: "Company Name"
period: "Start - End"
location: "Location"
logo: "/logos/company.png"
---

Job description and achievements...
```

## Development Workflow

### Adding New Content

**New Article:**
1. Create `/articles/article-slug.md`
2. Add frontmatter with required fields
3. Write content following guidelines above
4. Add cover image to `/public/images/`
5. Test rendering on `/articles/article-slug`

**New Project:**
1. Create `/projects/project-slug.md`
2. Add frontmatter and content
3. Add project card data to `/data/projects.ts` if needed
4. Add images to `/public/images/`

### Code Style

**TypeScript:**
```typescript
// Use type annotations
export interface ArticleMetadata {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
}

// Prefer functional components
export default function ArticlePage({ article }: Props) {
  return <div>{article.title}</div>;
}
```

**CSS Modules:**
```css
/* Component-specific styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Mobile-first approach */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
```

### Common Tasks

**Run Development Server:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
npm start
```

**Type Check:**
```bash
npx tsc --noEmit
```

**Lint Code:**
```bash
npm run lint
```

## Component Guidelines

### Layout Components

**Layout.tsx** - Main VS Code-themed wrapper
- Includes Titlebar, Sidebar, Tabsbar, Bottombar
- Wraps all page content

**Sidebar.tsx** - Navigation icons
- Use react-icons/vsc for VS Code icons
- Active state shows current page

### Content Components

**ArticleCard.tsx** - Article preview cards
**ProjectCard.tsx** - Project showcase cards
**ExperienceCard.tsx** - Timeline experience cards
**CertificationCard.tsx** - Certification badges

### Code Display Components

**TerraformCode.tsx** - Syntax-highlighted Terraform
**ContactCode.tsx** - Contact info as code
**ContactYaml.tsx** - Contact info as YAML

## Deployment

**Vercel (Primary):**
- Automatic deployments from main branch
- Preview deployments for pull requests
- Environment variables in Vercel dashboard

**Docker (Self-hosted):**
```bash
docker build -t portfolio .
docker run -p 3000:3000 portfolio
```

## Content Quality Checklist

Before committing any content changes:

- [ ] Written in English (B2 level maximum)
- [ ] Technical explanations understandable by first-year students
- [ ] NO emojis, exclamation marks spam, or LinkedIn-style hype
- [ ] Images use responsive sizing
- [ ] All images have descriptive alt text
- [ ] Markdown frontmatter is complete
- [ ] Content tested in browser
- [ ] Mobile responsive check passed
- [ ] No grammar/spelling errors

## Markdown Parsing

Articles and projects use:
- **gray-matter** - Parse YAML frontmatter
- **react-markdown** - Render markdown to React
- **remark-gfm** - GitHub-flavored markdown (tables, strikethrough, etc.)

**Supported Markdown:**
- Headers (h1-h6)
- Code blocks with syntax highlighting
- Lists (ordered, unordered)
- Links and images
- Tables
- Blockquotes
- Bold, italic, strikethrough

## VS Code Theme

The site mimics VS Code interface:
- **Default Theme:** GitHub Dark
- **Alternative Themes:** Dracula, Ayu, Nord, Monokai
- Theme switching via `/settings` page
- Stored in localStorage

## Performance Considerations

- Use Next.js Image component for automatic optimization
- Static generation (SSG) for all markdown content
- Minimize client-side JavaScript
- CSS Modules for scoped, efficient styling
- Lazy load images below the fold

## Common Pitfalls to Avoid

1. **Writing in Korean** - All content must be in English
2. **Over-enthusiastic tone** - Keep it professional and factual
3. **Fixed-width images** - Always use responsive images
4. **Complex language** - Write for first-year students
5. **Emoji spam** - No emojis in professional content
6. **AI-sounding phrases** - Write naturally and directly
7. **Missing alt text** - Required for accessibility
8. **Broken markdown frontmatter** - Will cause build errors

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_GITHUB_TOKEN=your_token_here
```

Optional:
```
NEXT_PUBLIC_DEV_TO_API_KEY=your_dev_to_key
```

## Git Workflow

```bash
# Make changes and commit directly to main
git add .
git commit -m "Add article: article name"
git push origin main
```

## Summary

This portfolio site requires:
- **Clear English** (B2 level)
- **Simple technical explanations** (first-year student level)
- **Professional tone** (no hype, no emojis)
- **Responsive images** (all platforms)
- **Natural writing** (not AI-generated style)

Focus on substance over style. Let the technical work and projects speak for themselves without artificial enthusiasm or marketing language.
