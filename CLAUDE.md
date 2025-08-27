# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.6 project called "KPulse" - a K-Pop artist dashboard web app using the App Router architecture with TypeScript and Tailwind CSS. The project follows a modular, scalable setup for tracking K-Pop artists with real-time statistics and insights.

## Key Technologies & Architecture

- **Next.js 15** with App Router (`src/app/` directory structure)
- **TypeScript** with strict mode enabled
- **Tailwind CSS 4** for styling with PostCSS integration
- **React 19** as the UI library
- **ESLint** with Next.js recommended configurations

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

## Project Structure

```
src/app/
├── layout.tsx          # Root layout component
├── page.tsx            # Home page component
├── globals.css         # Global styles (currently empty)
└── favicon.ico         # Site favicon
```

## Configuration Files

- **TypeScript**: Uses path aliases (`@/*` maps to `./src/*`)
- **Next.js**: Minimal configuration with default settings
- **ESLint**: Extends `next/core-web-vitals` and `next/typescript`
- **Tailwind**: Configured via PostCSS plugin system

## Development Notes

- The project uses the modern App Router pattern (not Pages Router)
- TypeScript is configured with strict mode and incremental compilation
- Global styles file exists but is currently empty
- No testing framework is currently configured