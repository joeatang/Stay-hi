# Stay Hi Development Setup

## Gold Standard Server Configuration

This project uses a **single, consistent server setup** to avoid conflicts and confusion.

### Primary Development Server: VSCode Live Server
- **Port**: 3000 (consistent across all tools)
- **Root**: `/public` directory (where HTML files live)
- **Auto-starts**: When you open HTML files in VSCode
- **No manual setup needed**

### URLs:
- Home: `http://127.0.0.1:3000/index.html`
- Profile: `http://127.0.0.1:3000/profile.html`  
- Hi Muscle: `http://127.0.0.1:3000/hi-muscle.html`
- Hi Island: `http://127.0.0.1:3000/hi-island-NEW.html`

### What This Eliminates:
- ❌ Manual Python server commands
- ❌ Directory confusion (wrong serving folder)
- ❌ Port conflicts (multiple servers)
- ❌ Zombie processes
- ❌ Server restart loops

### How It Works:
1. Open any `.html` file in VSCode
2. Click "Go Live" button (bottom right) OR right-click file → "Open with Live Server"
3. Browser auto-opens to correct URL
4. Changes auto-reload (live reload)
5. Server auto-stops when VSCode closes

This is the **Tesla-grade solution** - one tool, one configuration, zero manual intervention.