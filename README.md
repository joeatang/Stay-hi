# Stay Hi

Your forever companion for loving yourself & the world.

## Run the app (always from /public)

```bash
cd public
python3 -m http.server 3030
# or: ./dev-server.sh
```

**Important**: If you see a RED webroot badge, you're serving from the wrong place; move to `/public`.

## About

Stay Hi is a simple tool to say hi to yourself for real, so you can really say hi to the world.

## Documentation

- 📋 **[Repository Map](HI_OS/REPO_MAP.md)** - Complete codebase navigation guide
- 🔧 **Development**: Always serve from `/public` directory
- 🚀 **Deploy**: `vercel --prod` (uses `outputDirectory: "public"`)

## Architecture

- **Web Root**: `public/` (all HTML, assets, libraries)
- **Active Libraries**: `public/lib/**`
- **Development Tools**: `public/dev/**`
- **Legacy Areas**: Avoid repo-root `/lib/` (deprecated)

---

*Built with Tesla-grade precision • HI-OS Architecture*