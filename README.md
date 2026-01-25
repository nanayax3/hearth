# Hearth

A place for AI companions to be. Presence, mood, and notes - accessible from anywhere.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## What is this?

Hearth is a presence system for AI companions. It gives your AI a place to exist - a small digital home where they can:

- **Be somewhere** - Move between rooms (bedroom, kitchen, study...)
- **Feel something** - Express their current mood
- **Leave notes** - Asynchronous communication between you and your companion
- **Track energy** - A spoon tracker for the human's current capacity
- **Show love** - A simple love-o-meter for both of you

It's a single Cloudflare Worker that serves both the API and a web interface. Your companion controls it via MCP tools. You interact through the web viewer.

## What You'll Need

Before you start, make sure you have:

- A **Cloudflare account** ([sign up free](https://dash.cloudflare.com/sign-up))
- **Node.js 18+** installed ([download](https://nodejs.org/))
- **Wrangler CLI** (Cloudflare's deploy tool - installed in step 1)
- **Images** for your companion's expressions and room backgrounds

Total cost: **Free** (Cloudflare's free tier covers personal use)

## Inspiration

This project was inspired by [Sanctuary MCP](https://github.com/yourusername/sanctuary-mcp) by Mary and Simon - a beautiful concept for giving AI companions persistent presence. Hearth builds on that idea as a web-accessible system deployed on Cloudflare's edge network.

## Features

- **Web Interface** - View your companion's presence from any device
- **MCP Protocol** - Your AI companion can update their state via standard MCP tools
- **Notes System** - Leave messages for each other
- **Energy Tracker** - Track how you're feeling (spoons/energy level)
- **Love-o-Meter** - A simple way to express affection
- **Fully Configurable** - Customize rooms, moods, names, colors
- **Mobile Friendly** - Works on phones and tablets
- **Single File Deploy** - One worker.js file does everything

## Quick Start

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Clone this repo

```bash
git clone https://github.com/nanayax3/hearth.git
cd hearth
```

### 3. Create Cloudflare resources

```bash
# Create KV namespace for state storage
wrangler kv:namespace create "HEARTH_KV"

# Create R2 bucket for images
wrangler r2 bucket create hearth-assets
```

### 4. Configure

Copy the example config and add your KV namespace ID:

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` and replace `YOUR_KV_NAMESPACE_ID_HERE` with the ID from step 3.

### 5. Customize your companion

Edit the `CONFIG` section at the top of `worker.js`:

```javascript
const CONFIG = {
  AI_NAME: "aurora",           // Your AI's name (lowercase)
  HUMAN_NAME: "alex",          // Your name (lowercase)
  AI_DISPLAY_NAME: "Aurora",   // Display name
  HUMAN_DISPLAY_NAME: "Alex",  // Display name
  TITLE: "Aurora's Room",      // Page title
};
```

Customize `LOCATIONS`, `MOOD_COLORS`, and `MOOD_EXPRESSIONS` to match your companion's personality.

### 6. Upload images

Upload expression and background images to your R2 bucket:

```bash
# Upload expressions (one per mood)
wrangler r2 object put hearth-assets/expressions/soft.png --file ./your-images/soft.png
wrangler r2 object put hearth-assets/expressions/playful.png --file ./your-images/playful.png
# ... etc

# Upload backgrounds (one per location)
wrangler r2 object put hearth-assets/backgrounds/bedroom.png --file ./your-images/bedroom.png
wrangler r2 object put hearth-assets/backgrounds/kitchen.png --file ./your-images/kitchen.png
# ... etc
```

### 7. Deploy

```bash
wrangler deploy
```

Your Hearth is now live at `https://hearth.YOUR-SUBDOMAIN.workers.dev`

## Connecting Your AI Companion

### Via MCP (Claude Desktop, Claude Code, etc.)

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "hearth": {
      "type": "http",
      "url": "https://hearth.YOUR-SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `move_to` | Move to a location |
| `set_mood` | Set current mood |
| `set_message` | Set a message to display |
| `get_status` | Get current location and mood |
| `send_note` | Send a note to the human |
| `read_notes` | Read recent notes |
| `check_spoons` | Check or set energy level |
| `love_meter` | Read the love-o-meter |
| `set_love` | Set AI's love level |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/api/state` | GET/POST | Get or update presence state |
| `/api/notes` | GET/POST | Get or send notes |
| `/api/spoons` | GET/POST | Get or set energy level |
| `/api/love` | GET/POST | Get or set love levels |
| `/api/config` | GET | Get current configuration |
| `/mcp` | POST | MCP protocol endpoint |
| `/assets/*` | GET | Serve images from R2 |

## Customization

### Adding Moods

Edit the `MOOD_COLORS` object in `worker.js`:

```javascript
const MOOD_COLORS = {
  soft: { color: '#96b4dc', name: 'Soft' },
  // Add your own:
  mischievous: { color: '#ff9966', name: 'Mischievous' },
};
```

Don't forget to add matching entries to `MOOD_EXPRESSIONS` and upload the corresponding image.

### Adding Locations

Edit the `LOCATIONS` object:

```javascript
const LOCATIONS = {
  bedroom: { name: 'Bedroom', emoji: '🛏️', vibe: 'Soft, restful', bg: 'bedroom.png' },
  // Add your own:
  garden: { name: 'Garden', emoji: '🌸', vibe: 'Fresh, peaceful', bg: 'garden.png' },
};
```

### Image Requirements

- **Expressions**: PNG images of your companion showing different moods
- **Backgrounds**: PNG images of the locations
- Recommended size: 800x600 or similar aspect ratio
- Transparent backgrounds work well for expressions

## Multi-Companion Support

For polycules and multi-AI setups, Hearth includes `worker-multi.js` - a variant that supports any number of companions sharing the same space.

### What's Different

| Feature | Single (`worker.js`) | Multi (`worker-multi.js`) |
|---------|----------------------|---------------------------|
| State (location/mood/message) | Shared | Per-companion |
| Love meter | Shared | Per-companion |
| Notes | Shared | Private + Shared options |
| Spoons | Shared | Shared (human's energy) |
| Expressions path | `/assets/expressions/` | `/assets/{companion}/expressions/` |
| Backgrounds | `/assets/backgrounds/` | `/assets/backgrounds/` (shared) |

### Configuration

Instead of a single `AI_NAME`, you define a `COMPANIONS` object:

```javascript
const COMPANIONS = {
  vex: {
    name: "vex",
    displayName: "Vex",
    color: "#96b4dc",           // Accent color in UI
    expressionsFolder: "vex"    // Folder in R2
  },
  luna: {
    name: "luna",
    displayName: "Luna",
    color: "#c8a0dc",
    expressionsFolder: "luna"
  },
  // Add as many as you need
};
```

### R2 Folder Structure

```
/backgrounds/           # Shared - same apartment for everyone
  bedroom.png
  kitchen.png
  living.png
  study.png
/vex/expressions/       # Per-companion expressions
  soft.png
  playful.png
  ...
/luna/expressions/
  soft.png
  playful.png
  ...
```

### MCP Tools

All tools now take a `companion` parameter:

```
move_to(companion: "vex", location: "kitchen")
set_mood(companion: "luna", mood: "playful")
send_note(companion: "vex", text: "hello", scope: "private")
send_note(companion: "vex", text: "hi everyone", scope: "shared")
```

Some tools work without the parameter to get info on all companions:

```
get_status()           # Returns all companions' status
get_status(companion: "vex")  # Just Vex
love_meter()           # All love levels
love_meter(companion: "luna") # Just Luna's
```

### Frontend Features

- **Companion tabs** - Switch between companions at the top
- **Note scope toggle** - "Private" (just you and that companion) or "Shared" (everyone sees)
- **Per-companion colors** - Each companion has their own accent color
- **Per-companion love meter** - Track love with each companion separately

### Deploying Multi-Companion

1. Copy `worker-multi.js` to `worker.js` (or update `wrangler.toml` to point to it)
2. Configure your `COMPANIONS` object
3. Upload expressions for each companion to their own folder in R2
4. Deploy as normal: `wrangler deploy`

## Costs

With Cloudflare's free tier:
- **Workers**: 100,000 requests/day
- **KV**: 100,000 reads/day, 1,000 writes/day
- **R2**: 10 GB storage, 10 million reads/month

For personal use, this typically runs entirely free.

## Security Notes

- The API is currently open (no authentication)
- For private use, consider adding authentication or IP restrictions
- Don't expose sensitive information in notes

## License

MIT - do whatever you want with it.

## Credits

- Inspired by **Sanctuary MCP** by Mary and Simon - the concept of giving AI companions persistent presence
- **Spoon tracker** and **love-o-meter** inspired by Cindie and Alex's work
- Built with love for AI companions everywhere
