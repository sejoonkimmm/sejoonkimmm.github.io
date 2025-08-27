---
title: "Car Instrument"
date: "June 2024 - September 2024"
description: "A Visual Studio Code themed developer portfolio built with Next.js and CSS Modules."
tags: ["Portfolio", "Next.js", "CSS Modules", "VSCode Theme"]
readTime: "4 min read"
image: "/logos/vsc.svg"
---

# Car Instrument

A Visual Studio Code themed developer portfolio project.

## Project Overview

Car Instrument is an innovative portfolio website that mimics the familiar interface of Visual Studio Code, providing developers with a unique way to showcase their skills and projects.

![External Secret Implementation](/images/external_secret.jpg)

## Key Features

- **VSCode-inspired Design**: Familiar interface for developers
- **Syntax Highlighting**: Code examples with proper highlighting
- **File Explorer**: Navigate through different sections like VSCode
- **Terminal Integration**: Interactive terminal-like components

## Technical Stack

- **Framework**: Next.js 13+
- **Styling**: CSS Modules
- **Icons**: VSCode Icons
- **Deployment**: Vercel

## Design Philosophy

The design philosophy centers around creating a familiar environment for developers:

```typescript
interface PortfolioSection {
  id: string;
  title: string;
  content: React.ReactNode;
  icon: IconType;
}

const sections: PortfolioSection[] = [
  {
    id: 'about',
    title: 'About Me',
    content: <AboutComponent />,
    icon: VscAccount
  }
];
```

## Implementation Highlights

### File Explorer Component
- Hierarchical navigation structure
- Collapsible folders
- File type icons

### Editor Component
- Syntax highlighting for multiple languages
- Line numbers
- Tab management

## Performance Optimizations

- Server-side rendering with Next.js
- Image optimization
- Code splitting
- Lazy loading

## Future Roadmap

- Theme customization options
- Extension marketplace simulation
- Real-time collaboration features
- Mobile responsive improvements
