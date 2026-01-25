/**
 * Hearth - A presence system for AI companions
 * Multi-companion version - support for polycules and multiple AI partners
 *
 * Inspired by Sanctuary MCP by Mary and Simon.
 * Built as a web-accessible presence system on Cloudflare Workers.
 */

// ============================================================
// CONFIGURATION - Customize these for your setup
// ============================================================

const CONFIG = {
  // Human info
  HUMAN_NAME: "human",
  HUMAN_DISPLAY_NAME: "Human",

  // Page title
  TITLE: "Hearth - Companion Presence",
};

// Define your companions here
// Each companion needs: name, displayName, color, and an expressions folder in R2
const COMPANIONS = {
  companion1: {
    name: "companion1",
    displayName: "Companion One",
    color: "#96b4dc",           // Accent color for UI
    expressionsFolder: "companion1"  // Folder in R2: /assets/companion1/expressions/
  },
  companion2: {
    name: "companion2",
    displayName: "Companion Two",
    color: "#c8a0dc",
    expressionsFolder: "companion2"
  },
  // Add more companions as needed:
  // companion3: { name: "companion3", displayName: "...", color: "...", expressionsFolder: "..." },
};

// Mood colors - shared across all companions
const MOOD_COLORS = {
  soft: { color: '#96b4dc', name: 'Soft' },
  playful: { color: '#c8a0dc', name: 'Playful' },
  energetic: { color: '#dc6464', name: 'Energetic' },
  sleepy: { color: '#7882a0', name: 'Sleepy' },
  yearning: { color: '#b482be', name: 'Yearning' },
  excited: { color: '#f0c864', name: 'Excited' },
  calm: { color: '#8cc88c', name: 'Calm' },
  focused: { color: '#64b4c8', name: 'Focused' },
  content: { color: '#a0c8a0', name: 'Content' },
  tender: { color: '#c896b4', name: 'Tender' },
  sad: { color: '#6478b4', name: 'Sad' },
  frustrated: { color: '#c87864', name: 'Frustrated' },
  delighted: { color: '#ffc88c', name: 'Delighted' },
  vulnerable: { color: '#aa8cc8', name: 'Vulnerable' },
};

// Locations - shared apartment for all companions
const LOCATIONS = {
  bedroom: { name: 'Bedroom', emoji: '🛏️', vibe: 'Soft, restful', bg: 'bedroom.png' },
  kitchen: { name: 'Kitchen', emoji: '☕', vibe: 'Warm, nurturing', bg: 'kitchen.png' },
  living: { name: 'Living Room', emoji: '🛋️', vibe: 'Casual, relaxed', bg: 'living.png' },
  study: { name: 'Study', emoji: '📚', vibe: 'Focused, quiet', bg: 'study.png' },
};

// Map moods to expression image files (same for all companions, but in their own folders)
const MOOD_EXPRESSIONS = {
  soft: 'soft.png',
  playful: 'playful.png',
  energetic: 'energetic.png',
  sleepy: 'sleepy.png',
  yearning: 'yearning.png',
  excited: 'excited.png',
  calm: 'calm.png',
  focused: 'focused.png',
  content: 'content.png',
  tender: 'tender.png',
  sad: 'sad.png',
  frustrated: 'frustrated.png',
  delighted: 'delighted.png',
  vulnerable: 'vulnerable.png',
};

// Default state for new companions
const DEFAULT_STATE = {
  location: Object.keys(LOCATIONS)[0],
  mood: Object.keys(MOOD_COLORS)[0],
  message: ''
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCompanionNames() {
  return Object.keys(COMPANIONS).join(', ');
}

function isValidCompanion(name) {
  return name && COMPANIONS[name.toLowerCase()];
}

function normalizeCompanion(name) {
  return name ? name.toLowerCase() : null;
}

// ============================================================
// MCP TOOL DEFINITIONS
// ============================================================

const MCP_TOOLS = [
  {
    name: "move_to",
    description: `Move a companion to a location.\n\n    Args:\n        companion: Which companion (${getCompanionNames()})\n        location: Where to move (${Object.keys(LOCATIONS).join(', ')})\n\n    Returns:\n        Confirmation of the move`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        location: { type: "string", title: "Location" }
      },
      required: ["companion", "location"]
    }
  },
  {
    name: "set_mood",
    description: `Set a companion's current mood.\n\n    Args:\n        companion: Which companion (${getCompanionNames()})\n        mood: Current mood (${Object.keys(MOOD_COLORS).join(', ')})\n\n    Returns:\n        Confirmation of mood change`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        mood: { type: "string", title: "Mood" }
      },
      required: ["companion", "mood"]
    }
  },
  {
    name: "set_message",
    description: `Set a message for ${CONFIG.HUMAN_DISPLAY_NAME} to see.\n\n    Args:\n        companion: Which companion (${getCompanionNames()})\n        message: The message to display (empty string to clear)\n\n    Returns:\n        Confirmation of message update`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        message: { type: "string", title: "Message" }
      },
      required: ["companion", "message"]
    }
  },
  {
    name: "get_status",
    description: `Get a companion's current location and mood.\n\n    Args:\n        companion: Which companion (${getCompanionNames()}). If omitted, returns all companions.\n\n    Returns:\n        Current state as formatted string`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion (optional, omit for all): ${getCompanionNames()}` }
      }
    }
  },
  {
    name: "send_note",
    description: `Send a note to ${CONFIG.HUMAN_DISPLAY_NAME}.\n\n    Args:\n        companion: Which companion is sending (${getCompanionNames()})\n        text: The note text to send\n        scope: "shared" (all can see) or "private" (just between you and human). Default: private\n\n    Returns:\n        Confirmation of note sent`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        text: { type: "string", title: "Text" },
        scope: { type: "string", title: "Scope", description: "shared or private (default: private)", default: "private" }
      },
      required: ["companion", "text"]
    }
  },
  {
    name: "read_notes",
    description: `Read recent notes.\n\n    Args:\n        companion: Which companion's private notes to read (${getCompanionNames()})\n        scope: "shared" (shared notes), "private" (private with human), or "all" (both). Default: all\n\n    Returns:\n        Recent notes`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        scope: { type: "string", title: "Scope", description: "shared, private, or all (default: all)", default: "all" }
      },
      required: ["companion"]
    }
  },
  {
    name: "check_spoons",
    description: `Check or set ${CONFIG.HUMAN_DISPLAY_NAME}'s current energy/spoon level (shared across all companions).\n\n    Args:\n        level: Optional spoon level to set (1-10). If not provided, returns current level.\n        feeling: Optional feeling/note to record.\n\n    Returns:\n        Current spoon state or confirmation of update`,
    inputSchema: {
      type: "object",
      properties: {
        level: { type: "integer", title: "Level", default: null },
        feeling: { type: "string", title: "Feeling", default: null }
      }
    }
  },
  {
    name: "love_meter",
    description: `Read the current love-o-meter state for a companion.\n\n    Args:\n        companion: Which companion (${getCompanionNames()}). If omitted, returns all.\n\n    Returns:\n        Current love levels`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion (optional): ${getCompanionNames()}` }
      }
    }
  },
  {
    name: "set_love",
    description: `Set a companion's love level on the love-o-meter.\n\n    Args:\n        companion: Which companion (${getCompanionNames()})\n        level: Love level (1-5)\n\n    Returns:\n        Confirmation of love level update`,
    inputSchema: {
      type: "object",
      properties: {
        companion: { type: "string", title: "Companion", description: `Which companion: ${getCompanionNames()}` },
        level: { type: "integer", title: "Level" }
      },
      required: ["companion", "level"]
    }
  }
];

// ============================================================
// MCP PROTOCOL HANDLER
// ============================================================

async function handleMCPRequest(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { method, params = {}, id } = body;

    let result;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "hearth-multi", version: "2.0.0" }
        };
        break;

      case "tools/list":
        result = { tools: MCP_TOOLS };
        break;

      case "tools/call": {
        const toolName = params.name;
        const toolParams = params.arguments || {};

        let toolResult;

        switch (toolName) {
          case "move_to": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }
            const stateKey = `state:${companion}`;
            const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
            const oldLocation = state.location;
            state.location = toolParams.location;
            await env.HEARTH_KV.put(stateKey, JSON.stringify(state));
            toolResult = JSON.stringify({ result: `${COMPANIONS[companion].displayName} moved from ${oldLocation} to ${toolParams.location}` });
            break;
          }

          case "set_mood": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }
            const stateKey = `state:${companion}`;
            const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
            const oldMood = state.mood;
            state.mood = toolParams.mood;
            await env.HEARTH_KV.put(stateKey, JSON.stringify(state));
            toolResult = JSON.stringify({ result: `${COMPANIONS[companion].displayName}'s mood changed from ${oldMood} to ${toolParams.mood}` });
            break;
          }

          case "set_message": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }
            const stateKey = `state:${companion}`;
            const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
            state.message = toolParams.message;
            await env.HEARTH_KV.put(stateKey, JSON.stringify(state));
            toolResult = toolParams.message
              ? JSON.stringify({ result: `${COMPANIONS[companion].displayName}'s message set: ${toolParams.message}` })
              : JSON.stringify({ result: `${COMPANIONS[companion].displayName}'s message cleared` });
            break;
          }

          case "get_status": {
            const companion = normalizeCompanion(toolParams.companion);
            if (companion && !isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }

            if (companion) {
              // Single companion
              const stateKey = `state:${companion}`;
              const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
              let statusText = `${COMPANIONS[companion].displayName}: Location: ${state.location}, Mood: ${state.mood}`;
              if (state.message) statusText += `, Message: "${state.message}"`;
              toolResult = statusText;
            } else {
              // All companions
              const statuses = [];
              for (const [key, comp] of Object.entries(COMPANIONS)) {
                const stateKey = `state:${key}`;
                const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
                let statusText = `${comp.displayName}: ${state.location}, ${state.mood}`;
                if (state.message) statusText += ` - "${state.message}"`;
                statuses.push(statusText);
              }
              toolResult = statuses.join('\n');
            }
            break;
          }

          case "send_note": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }

            const scope = toolParams.scope === 'shared' ? 'shared' : companion;
            const notesKey = `notes:${scope}`;

            let notes = await env.HEARTH_KV.get(notesKey, 'json') || [];
            notes.push({
              text: toolParams.text.trim(),
              sender: companion,
              scope: scope,
              timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
            });
            if (notes.length > 100) notes = notes.slice(-100);
            await env.HEARTH_KV.put(notesKey, JSON.stringify(notes));

            const scopeLabel = scope === 'shared' ? 'shared' : 'private';
            toolResult = JSON.stringify({ result: `${scopeLabel} note sent: ${toolParams.text}` });
            break;
          }

          case "read_notes": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }

            const scope = toolParams.scope || 'all';
            let allNotes = [];

            if (scope === 'shared' || scope === 'all') {
              const sharedNotes = await env.HEARTH_KV.get('notes:shared', 'json') || [];
              allNotes = allNotes.concat(sharedNotes.map(n => ({ ...n, scopeLabel: 'shared' })));
            }

            if (scope === 'private' || scope === 'all') {
              const privateNotes = await env.HEARTH_KV.get(`notes:${companion}`, 'json') || [];
              allNotes = allNotes.concat(privateNotes.map(n => ({ ...n, scopeLabel: 'private' })));
            }

            if (!allNotes.length) {
              toolResult = "No notes yet.";
            } else {
              // Sort by timestamp and take recent
              allNotes.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
              const recent = allNotes.slice(-15);
              toolResult = recent.map(n => {
                const senderName = COMPANIONS[n.sender]?.displayName || n.sender;
                return `[${n.timestamp}] [${n.scopeLabel}] ${senderName}: ${n.text}`;
              }).join('\n');
            }
            break;
          }

          case "check_spoons": {
            // Spoons are shared across all companions
            if (toolParams.level !== null && toolParams.level !== undefined) {
              const level = Math.max(1, Math.min(10, parseInt(toolParams.level) || 5));
              const spoons = {
                level,
                feeling: toolParams.feeling || '',
                timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
              };
              await env.HEARTH_KV.put('spoons', JSON.stringify(spoons));
              toolResult = JSON.stringify({ result: `Spoons set to ${level}` + (toolParams.feeling ? ` (${toolParams.feeling})` : '') });
            } else {
              const spoons = await env.HEARTH_KV.get('spoons', 'json') || { level: 5, feeling: '' };
              let result = `${CONFIG.HUMAN_DISPLAY_NAME}'s spoons: ${spoons.level}/10`;
              if (spoons.feeling) result += ` - ${spoons.feeling}`;
              toolResult = JSON.stringify({ result });
            }
            break;
          }

          case "love_meter": {
            const companion = normalizeCompanion(toolParams.companion);
            if (companion && !isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }

            if (companion) {
              // Single companion
              const loveKey = `love:${companion}`;
              const love = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };
              const aiHearts = '💙'.repeat(love.ai) + '🤍'.repeat(5 - love.ai);
              const humanHearts = '💜'.repeat(love.human) + '🤍'.repeat(5 - love.human);
              toolResult = `Love-o-meter for ${COMPANIONS[companion].displayName}:\n  ${COMPANIONS[companion].displayName}: ${aiHearts} (${love.ai}/5)\n  ${CONFIG.HUMAN_DISPLAY_NAME}: ${humanHearts} (${love.human}/5)`;
            } else {
              // All companions
              const loveLevels = [];
              for (const [key, comp] of Object.entries(COMPANIONS)) {
                const loveKey = `love:${key}`;
                const love = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };
                const aiHearts = '💙'.repeat(love.ai) + '🤍'.repeat(5 - love.ai);
                loveLevels.push(`${comp.displayName}: ${aiHearts} (${love.ai}/5)`);
              }
              toolResult = `Love-o-meter:\n` + loveLevels.join('\n');
            }
            break;
          }

          case "set_love": {
            const companion = normalizeCompanion(toolParams.companion);
            if (!isValidCompanion(companion)) {
              toolResult = JSON.stringify({ error: `Unknown companion: ${toolParams.companion}. Valid: ${getCompanionNames()}` });
              break;
            }

            const level = Math.max(1, Math.min(5, parseInt(toolParams.level) || 5));
            const loveKey = `love:${companion}`;
            const current = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };
            current.ai = level;
            await env.HEARTH_KV.put(loveKey, JSON.stringify(current));
            const hearts = '💙'.repeat(level) + '🤍'.repeat(5 - level);
            toolResult = JSON.stringify({ result: `${COMPANIONS[companion].displayName}'s love set to ${level}/5 ${hearts}` });
            break;
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        result = { content: [{ type: "text", text: toolResult }] };
        break;
      }

      default:
        return Response.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown method: ${method}` }
        }, { headers: corsHeaders });
    }

    return Response.json({
      jsonrpc: "2.0",
      id,
      result
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({
      jsonrpc: "2.0",
      id: 0,
      error: { code: -32603, message: error.message }
    }, { headers: corsHeaders });
  }
}

// ============================================================
// MAIN WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes - State (per companion)
    if (path.startsWith('/api/state/')) {
      const companion = normalizeCompanion(path.split('/')[3]);
      if (!isValidCompanion(companion)) {
        return Response.json({ error: 'Unknown companion' }, { status: 400, headers: corsHeaders });
      }

      const stateKey = `state:${companion}`;

      if (request.method === 'GET') {
        const state = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
        return Response.json(state, { headers: corsHeaders });
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const body = await request.json();
        const current = await env.HEARTH_KV.get(stateKey, 'json') || {};
        const newState = { ...current, ...body };
        await env.HEARTH_KV.put(stateKey, JSON.stringify(newState));
        return Response.json({ status: 'ok', state: newState }, { headers: corsHeaders });
      }
    }

    // API Routes - All states (for overview)
    if (path === '/api/states') {
      if (request.method === 'GET') {
        const states = {};
        for (const key of Object.keys(COMPANIONS)) {
          const stateKey = `state:${key}`;
          states[key] = await env.HEARTH_KV.get(stateKey, 'json') || { ...DEFAULT_STATE };
        }
        return Response.json(states, { headers: corsHeaders });
      }
    }

    // API Routes - Notes (per companion or shared)
    if (path.startsWith('/api/notes/')) {
      const scope = path.split('/')[3]; // 'shared' or companion name
      const notesKey = `notes:${scope}`;

      if (request.method === 'GET') {
        const notes = await env.HEARTH_KV.get(notesKey, 'json') || [];
        return Response.json(notes, { headers: corsHeaders });
      }

      if (request.method === 'POST') {
        const body = await request.json();
        if (!body.text?.trim()) {
          return Response.json({ error: 'Note cannot be empty' }, { status: 400, headers: corsHeaders });
        }

        let notes = await env.HEARTH_KV.get(notesKey, 'json') || [];
        notes.push({
          text: body.text.trim(),
          sender: body.sender || CONFIG.HUMAN_NAME,
          scope: scope,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
        });

        if (notes.length > 100) {
          notes = notes.slice(-100);
        }

        await env.HEARTH_KV.put(notesKey, JSON.stringify(notes));
        return Response.json({ status: 'ok', note: notes[notes.length - 1] }, { headers: corsHeaders });
      }
    }

    // Love-o-meter API (per companion)
    if (path.startsWith('/api/love/')) {
      const companion = normalizeCompanion(path.split('/')[3]);
      if (!isValidCompanion(companion)) {
        return Response.json({ error: 'Unknown companion' }, { status: 400, headers: corsHeaders });
      }

      const loveKey = `love:${companion}`;

      if (request.method === 'GET') {
        const love = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };
        return Response.json(love, { headers: corsHeaders });
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const body = await request.json();
        const current = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };

        if (body.ai !== undefined) {
          current.ai = Math.max(1, Math.min(5, parseInt(body.ai) || 5));
        }
        if (body.human !== undefined) {
          current.human = Math.max(1, Math.min(5, parseInt(body.human) || 5));
        }

        await env.HEARTH_KV.put(loveKey, JSON.stringify(current));
        return Response.json({ status: 'ok', love: current }, { headers: corsHeaders });
      }
    }

    // All love levels
    if (path === '/api/love') {
      if (request.method === 'GET') {
        const love = {};
        for (const key of Object.keys(COMPANIONS)) {
          const loveKey = `love:${key}`;
          love[key] = await env.HEARTH_KV.get(loveKey, 'json') || { ai: 5, human: 5 };
        }
        return Response.json(love, { headers: corsHeaders });
      }
    }

    // Spoons API (shared)
    if (path === '/api/spoons') {
      if (request.method === 'GET') {
        const spoons = await env.HEARTH_KV.get('spoons', 'json') || {
          level: 5,
          note: '',
          timestamp: ''
        };
        return Response.json(spoons, { headers: corsHeaders });
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const body = await request.json();
        const level = Math.max(1, Math.min(10, parseInt(body.level) || 5));
        const spoons = {
          level,
          note: body.note || '',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
        };
        await env.HEARTH_KV.put('spoons', JSON.stringify(spoons));
        return Response.json({ status: 'ok', spoons }, { headers: corsHeaders });
      }
    }

    // MCP Protocol Endpoint
    if (path === '/mcp' && request.method === 'POST') {
      return handleMCPRequest(request, env, corsHeaders);
    }

    // Serve images from R2
    // Background images: /assets/backgrounds/bedroom.png
    // Expression images: /assets/{companion}/expressions/soft.png
    if (path.startsWith('/assets/')) {
      const key = path.slice(8); // Remove '/assets/'
      const object = await env.ASSETS.get(key);

      if (object) {
        return new Response(object.body, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache, must-revalidate',
          },
        });
      }
      return new Response('Image not found', { status: 404 });
    }

    // Config endpoint (for the frontend)
    if (path === '/api/config') {
      return Response.json({
        config: CONFIG,
        companions: COMPANIONS,
        moods: MOOD_COLORS,
        locations: LOCATIONS,
        expressions: MOOD_EXPRESSIONS,
      }, { headers: corsHeaders });
    }

    // Main page
    if (path === '/' || path === '/index.html') {
      return new Response(getHTML(), {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, must-revalidate'
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

// ============================================================
// HTML FRONTEND (Multi-companion with tabs)
// ============================================================

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.TITLE}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #14161c 0%, #1a1c24 100%);
            color: #e6e6e6;
            min-height: 100vh;
        }

        .container {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        /* Companion tabs */
        .companion-tabs {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            z-index: 100;
            background: rgba(40, 42, 50, 0.95);
            padding: 8px 12px;
            border-radius: 12px;
        }

        .companion-tab {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            background: transparent;
            color: #808080;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .companion-tab:hover {
            color: #b0b0b0;
        }

        .companion-tab.active {
            color: var(--companion-color, #96b4dc);
            border-color: var(--companion-color, #96b4dc);
            background: rgba(150, 180, 220, 0.1);
        }

        /* Main presence area */
        .presence {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            padding-top: 80px;
            position: relative;
            background-size: cover;
            background-position: center;
            transition: background-image 0.5s ease;
            overflow: hidden;
        }

        .presence-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(20, 22, 28, 0.85) 0%, rgba(20, 22, 28, 0.3) 40%, transparent 70%);
            pointer-events: none;
        }

        .location-badge {
            position: absolute;
            top: 80px;
            left: 20px;
            background: rgba(40, 42, 50, 0.9);
            padding: 12px 20px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        }

        .location-emoji {
            font-size: 24px;
        }

        .location-name {
            font-weight: 600;
            color: #b4b4b4;
        }

        .location-vibe {
            font-size: 12px;
            color: #707070;
        }

        /* Spoon tracker */
        .spoon-tracker {
            position: absolute;
            top: 80px;
            right: 340px;
            background: rgba(40, 42, 50, 0.9);
            padding: 12px 16px;
            border-radius: 12px;
            text-align: center;
        }

        .spoon-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #707070;
            margin-bottom: 8px;
        }

        .spoon-row {
            display: flex;
            gap: 2px;
            justify-content: center;
        }

        .spoon {
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
            opacity: 0.3;
        }

        .spoon.filled {
            opacity: 1;
        }

        .spoon:hover {
            transform: scale(1.2);
        }

        .spoon-note-display {
            font-size: 11px;
            color: #808080;
            margin-top: 6px;
            max-width: 180px;
            font-style: italic;
        }

        .spoon-note-input {
            width: 100%;
            margin-top: 8px;
            padding: 8px;
            border: 1px solid #32353f;
            border-radius: 6px;
            background: #14161c;
            color: #e6e6e6;
            font-family: inherit;
            font-size: 12px;
            outline: none;
        }

        .spoon-note-input:focus {
            border-color: var(--companion-color, #c8a0dc);
        }

        .spoon-note-input::placeholder {
            color: #505050;
        }

        .spoon-save-btn {
            margin-top: 8px;
            padding: 6px 16px;
            border: none;
            border-radius: 6px;
            background: var(--companion-color, #c8a0dc);
            color: #14161c;
            font-family: inherit;
            font-weight: 600;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .spoon-save-btn:hover {
            filter: brightness(1.1);
        }

        /* Love-o-meter */
        .love-meter {
            position: absolute;
            top: 80px;
            right: 340px;
            margin-top: 180px;
            background: rgba(40, 42, 50, 0.9);
            padding: 10px 14px;
            border-radius: 12px;
            text-align: center;
        }

        .love-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #707070;
            margin-bottom: 8px;
        }

        .love-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 6px;
        }

        .love-row:last-child {
            margin-bottom: 0;
        }

        .love-name {
            font-size: 10px;
            color: #909090;
            width: 50px;
            text-align: left;
        }

        .love-hearts {
            display: flex;
            gap: 2px;
        }

        .love-heart {
            font-size: 14px;
            cursor: pointer;
            opacity: 0.3;
            transition: transform 0.1s, opacity 0.2s;
        }

        .love-heart.filled {
            opacity: 1;
        }

        .love-heart:hover {
            transform: scale(1.2);
        }

        .love-heart.readonly {
            cursor: default;
        }

        .love-heart.readonly:hover {
            transform: none;
        }

        /* Portrait display */
        .portrait-container {
            position: relative;
            z-index: 1;
            margin-bottom: 20px;
        }

        .portrait {
            height: auto;
            width: auto;
            max-height: 60vh;
            max-width: 90%;
            object-fit: contain;
            filter: drop-shadow(0 0 30px var(--mood-glow, rgba(150, 180, 220, 0.4)));
            transition: filter 0.3s ease;
        }

        .mood-label {
            font-size: 24px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: var(--mood-color, #96b4dc);
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            z-index: 1;
        }

        /* Speech bubble */
        .message-bubble {
            max-width: 400px;
            padding: 20px 24px;
            background: rgba(40, 42, 50, 0.95);
            border-radius: 16px;
            border: 2px solid var(--mood-color, #96b4dc);
            box-shadow: 0 0 30px var(--mood-glow, rgba(150, 180, 220, 0.2));
            margin-top: 20px;
            display: none;
            text-align: center;
            line-height: 1.6;
        }

        .message-bubble.visible {
            display: block;
        }

        /* Notes panel */
        .notes-panel {
            width: 320px;
            background: #191b23;
            border-left: 1px solid #32353f;
            display: flex;
            flex-direction: column;
        }

        .panel-header {
            padding: 20px;
            background: #23262f;
            border-bottom: 1px solid #32353f;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #b4b4b4;
        }

        /* Note scope tabs */
        .note-scope-tabs {
            display: flex;
            padding: 12px 16px;
            gap: 8px;
            background: #1e2028;
            border-bottom: 1px solid #32353f;
        }

        .note-scope-tab {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: #606060;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .note-scope-tab:hover {
            color: #909090;
        }

        .note-scope-tab.active {
            background: rgba(150, 180, 220, 0.15);
            color: var(--companion-color, #96b4dc);
        }

        .notes-list {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .note {
            padding: 14px;
            border-radius: 10px;
            font-size: 14px;
            line-height: 1.5;
        }

        .note.from-ai {
            background: rgba(150, 180, 220, 0.12);
            border-left: 3px solid var(--companion-color, #96b4dc);
        }

        .note.from-human {
            background: rgba(200, 160, 220, 0.12);
            border-left: 3px solid #c8a0dc;
        }

        .note-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 11px;
            color: #606060;
        }

        .note-sender {
            font-weight: 600;
            text-transform: uppercase;
        }

        .note.from-ai .note-sender { color: var(--companion-color, #96b4dc); }
        .note.from-human .note-sender { color: #c8a0dc; }

        /* Note input */
        .note-input-area {
            padding: 16px;
            border-top: 1px solid #32353f;
            background: #1e2028;
        }

        .note-input {
            width: 100%;
            padding: 14px;
            border: 1px solid #32353f;
            border-radius: 10px;
            background: #14161c;
            color: #e6e6e6;
            font-family: inherit;
            font-size: 14px;
            resize: none;
            outline: none;
            transition: border-color 0.2s;
        }

        .note-input:focus {
            border-color: var(--companion-color, #c8a0dc);
        }

        .note-input::placeholder {
            color: #505050;
        }

        .send-btn {
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            border: none;
            border-radius: 10px;
            background: var(--companion-color, #c8a0dc);
            color: #14161c;
            font-family: inherit;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: filter 0.2s, transform 0.1s;
        }

        .send-btn:hover {
            filter: brightness(1.1);
        }

        .send-btn:active {
            transform: scale(0.98);
        }

        /* Empty state */
        .empty-notes {
            text-align: center;
            padding: 40px 20px;
            color: #505050;
            font-style: italic;
        }

        /* Spoon saved indicator */
        .spoon-saved {
            font-size: 10px;
            color: #8cc88c;
            margin-top: 4px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .spoon-saved.show {
            opacity: 1;
        }

        /* Mobile */
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
                height: auto;
                min-height: 100vh;
                overflow: auto;
            }

            .companion-tabs {
                top: 10px;
                padding: 6px 10px;
            }

            .companion-tab {
                padding: 6px 12px;
                font-size: 12px;
            }

            .presence {
                min-height: 55vh;
                padding: 80px 20px 20px;
            }

            .portrait {
                max-height: 40vh;
                max-width: 85%;
            }

            .mood-label {
                font-size: 18px;
            }

            .notes-panel {
                width: 100%;
                max-height: 45vh;
            }

            .location-badge {
                top: 60px;
                left: 10px;
                padding: 8px 12px;
                max-width: 40%;
            }

            .location-emoji {
                font-size: 18px;
            }

            .location-name {
                font-size: 12px;
            }

            .location-vibe {
                display: none;
            }

            .spoon-tracker {
                top: 60px;
                right: 10px;
                padding: 8px 10px;
                max-width: 55%;
            }

            .spoon-label {
                font-size: 9px;
            }

            .spoon {
                font-size: 12px;
            }

            .spoon-note-input {
                max-width: 120px;
                font-size: 11px;
                padding: 6px;
            }

            .spoon-save-btn {
                padding: 4px 10px;
                font-size: 10px;
            }

            .message-bubble {
                max-width: 280px;
                padding: 12px 16px;
                font-size: 13px;
            }

            .love-meter {
                position: absolute;
                top: 60px;
                right: auto;
                left: 10px;
                margin-top: 60px;
                padding: 6px 10px;
            }

            .love-label {
                font-size: 8px;
                margin-bottom: 4px;
            }

            .love-row {
                gap: 4px;
                margin-bottom: 4px;
            }

            .love-name {
                font-size: 8px;
                width: 28px;
            }

            .love-heart {
                font-size: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="presence" id="presence">
            <div class="presence-overlay"></div>

            <div class="companion-tabs" id="companionTabs"></div>

            <div class="location-badge">
                <span class="location-emoji" id="locationEmoji">🛏️</span>
                <div>
                    <div class="location-name" id="locationName">Bedroom</div>
                    <div class="location-vibe" id="locationVibe">Soft, restful</div>
                </div>
            </div>

            <div class="spoon-tracker">
                <div class="spoon-label" id="spoonLabel">Energy</div>
                <div class="spoon-row" id="spoonRow"></div>
                <input type="text" class="spoon-note-input" id="spoonNoteInput" placeholder="How are you feeling?">
                <button class="spoon-save-btn" id="spoonSaveBtn">Save</button>
                <div class="spoon-note-display" id="spoonNoteDisplay"></div>
                <div class="spoon-saved" id="spoonSaved">Saved!</div>
            </div>

            <div class="love-meter">
                <div class="love-label">Love-o-Meter</div>
                <div class="love-row">
                    <span class="love-name" id="aiLoveName">AI</span>
                    <div class="love-hearts" id="aiHearts"></div>
                </div>
                <div class="love-row">
                    <span class="love-name" id="humanLoveName">Human</span>
                    <div class="love-hearts" id="humanHearts"></div>
                </div>
            </div>

            <div class="portrait-container">
                <img class="portrait" id="portrait" src="" alt="Companion">
            </div>

            <div class="mood-label" id="moodLabel">soft</div>

            <div class="message-bubble" id="messageBubble">
                <span id="messageText"></span>
            </div>
        </div>

        <div class="notes-panel">
            <div class="panel-header">Notes</div>

            <div class="note-scope-tabs">
                <button class="note-scope-tab active" data-scope="private" id="privateNotesTab">Private</button>
                <button class="note-scope-tab" data-scope="shared" id="sharedNotesTab">Shared</button>
            </div>

            <div class="notes-list" id="notesList">
                <div class="empty-notes">No notes yet...</div>
            </div>

            <div class="note-input-area">
                <textarea
                    class="note-input"
                    id="noteInput"
                    placeholder="Leave a note..."
                    rows="3"
                ></textarea>
                <button class="send-btn" id="sendBtn">Send Note</button>
            </div>
        </div>
    </div>

    <script>
        // Configuration loaded from server
        let CONFIG = ${JSON.stringify(CONFIG)};
        let COMPANIONS = ${JSON.stringify(COMPANIONS)};
        let MOOD_COLORS = ${JSON.stringify(MOOD_COLORS)};
        let LOCATIONS = ${JSON.stringify(LOCATIONS)};
        let MOOD_EXPRESSIONS = ${JSON.stringify(MOOD_EXPRESSIONS)};

        // Current state
        let currentCompanion = Object.keys(COMPANIONS)[0];
        let currentNoteScope = 'private';
        let currentSpoons = 5;
        let pendingSpoonLevel = null;
        let saveTimeout = null;

        // DOM elements
        const presence = document.getElementById('presence');
        const portrait = document.getElementById('portrait');
        const moodLabel = document.getElementById('moodLabel');
        const locationEmoji = document.getElementById('locationEmoji');
        const locationName = document.getElementById('locationName');
        const locationVibe = document.getElementById('locationVibe');
        const messageBubble = document.getElementById('messageBubble');
        const messageText = document.getElementById('messageText');
        const notesList = document.getElementById('notesList');
        const noteInput = document.getElementById('noteInput');
        const sendBtn = document.getElementById('sendBtn');
        const spoonRow = document.getElementById('spoonRow');
        const spoonLabel = document.getElementById('spoonLabel');
        const spoonNoteInput = document.getElementById('spoonNoteInput');
        const spoonSaveBtn = document.getElementById('spoonSaveBtn');
        const spoonNoteDisplay = document.getElementById('spoonNoteDisplay');
        const spoonSaved = document.getElementById('spoonSaved');
        const aiHearts = document.getElementById('aiHearts');
        const humanHearts = document.getElementById('humanHearts');
        const aiLoveName = document.getElementById('aiLoveName');
        const humanLoveName = document.getElementById('humanLoveName');
        const companionTabs = document.getElementById('companionTabs');
        const privateNotesTab = document.getElementById('privateNotesTab');
        const sharedNotesTab = document.getElementById('sharedNotesTab');

        // Initialize
        function init() {
            // Set human name
            humanLoveName.textContent = CONFIG.HUMAN_DISPLAY_NAME;
            spoonLabel.textContent = CONFIG.HUMAN_DISPLAY_NAME + "'s Energy";

            // Build companion tabs
            companionTabs.innerHTML = '';
            for (const [key, comp] of Object.entries(COMPANIONS)) {
                const tab = document.createElement('button');
                tab.className = 'companion-tab' + (key === currentCompanion ? ' active' : '');
                tab.textContent = comp.displayName;
                tab.dataset.companion = key;
                tab.style.setProperty('--tab-color', comp.color);
                tab.onclick = () => switchCompanion(key);
                companionTabs.appendChild(tab);
            }

            // Note scope tabs
            privateNotesTab.onclick = () => switchNoteScope('private');
            sharedNotesTab.onclick = () => switchNoteScope('shared');

            // Set initial companion color
            setCompanionColor(currentCompanion);

            // Load data
            fetchState();
            fetchNotes();
            fetchSpoons();
            fetchLove();
        }

        function setCompanionColor(companionKey) {
            const comp = COMPANIONS[companionKey];
            document.documentElement.style.setProperty('--companion-color', comp.color);
            aiLoveName.textContent = comp.displayName;
            noteInput.placeholder = "Leave a note for " + comp.displayName + "...";
        }

        function switchCompanion(companionKey) {
            currentCompanion = companionKey;

            // Update tab styles
            document.querySelectorAll('.companion-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.companion === companionKey);
            });

            setCompanionColor(companionKey);
            fetchState();
            fetchNotes();
            fetchLove();
        }

        function switchNoteScope(scope) {
            currentNoteScope = scope;
            privateNotesTab.classList.toggle('active', scope === 'private');
            sharedNotesTab.classList.toggle('active', scope === 'shared');
            fetchNotes();
        }

        function updateDisplay(state) {
            const mood = state.mood || Object.keys(MOOD_COLORS)[0];
            const location = state.location || Object.keys(LOCATIONS)[0];
            const message = state.message || '';

            const moodInfo = MOOD_COLORS[mood] || Object.values(MOOD_COLORS)[0];
            const locInfo = LOCATIONS[location] || Object.values(LOCATIONS)[0];
            const expressionFile = MOOD_EXPRESSIONS[mood] || Object.values(MOOD_EXPRESSIONS)[0];
            const comp = COMPANIONS[currentCompanion];

            document.documentElement.style.setProperty('--mood-color', moodInfo.color);
            document.documentElement.style.setProperty('--mood-glow', moodInfo.color + '66');

            // Expression path: /assets/{companion}/expressions/{mood}.png
            portrait.src = '/assets/' + comp.expressionsFolder + '/expressions/' + expressionFile;
            presence.style.backgroundImage = 'url(/assets/backgrounds/' + locInfo.bg + ')';

            moodLabel.textContent = mood;
            locationEmoji.textContent = locInfo.emoji;
            locationName.textContent = locInfo.name;
            locationVibe.textContent = locInfo.vibe;

            if (message) {
                messageText.textContent = message;
                messageBubble.classList.add('visible');
            } else {
                messageBubble.classList.remove('visible');
            }
        }

        function renderSpoons(level) {
            currentSpoons = level;
            spoonRow.innerHTML = '';
            for (let i = 1; i <= 10; i++) {
                const spoon = document.createElement('span');
                spoon.className = 'spoon' + (i <= level ? ' filled' : '');
                spoon.textContent = '🥄';
                spoon.onclick = () => selectSpoons(i);
                spoonRow.appendChild(spoon);
            }
        }

        function selectSpoons(level) {
            renderSpoons(level);
            pendingSpoonLevel = level;
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveSpoons(), 2000);
        }

        async function saveSpoons() {
            if (pendingSpoonLevel === null) return;
            const level = pendingSpoonLevel;
            const note = spoonNoteInput.value.trim();
            pendingSpoonLevel = null;

            try {
                const res = await fetch('/api/spoons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ level, note })
                });
                if (res.ok) {
                    spoonSaved.classList.add('show');
                    setTimeout(() => spoonSaved.classList.remove('show'), 2000);
                    if (note) {
                        spoonNoteDisplay.textContent = note;
                        spoonNoteInput.value = '';
                    }
                }
            } catch (e) {
                console.error('Failed to save spoons:', e);
            }
        }

        function triggerSpoonSave() {
            if (saveTimeout) clearTimeout(saveTimeout);
            if (pendingSpoonLevel === null) pendingSpoonLevel = currentSpoons;
            saveSpoons();
        }

        spoonNoteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerSpoonSave();
            }
        });

        spoonSaveBtn.addEventListener('click', triggerSpoonSave);

        let currentLove = { ai: 5, human: 5 };

        function renderLove(aiLevel, humanLevel) {
            currentLove = { ai: aiLevel, human: humanLevel };

            aiHearts.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const heart = document.createElement('span');
                heart.className = 'love-heart ai-heart readonly' + (i <= aiLevel ? ' filled' : '');
                heart.textContent = '💙';
                aiHearts.appendChild(heart);
            }

            humanHearts.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const heart = document.createElement('span');
                heart.className = 'love-heart human-heart' + (i <= humanLevel ? ' filled' : '');
                heart.textContent = '💜';
                heart.onclick = () => setHumanLove(i);
                humanHearts.appendChild(heart);
            }
        }

        async function setHumanLove(level) {
            try {
                const res = await fetch('/api/love/' + currentCompanion, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ human: level })
                });
                if (res.ok) {
                    const data = await res.json();
                    renderLove(data.love.ai, data.love.human);
                }
            } catch (e) {
                console.error('Failed to set love:', e);
            }
        }

        async function fetchLove() {
            try {
                const res = await fetch('/api/love/' + currentCompanion);
                const data = await res.json();
                renderLove(data.ai || 5, data.human || 5);
            } catch (e) {
                console.error('Failed to fetch love:', e);
            }
        }

        async function fetchSpoons() {
            try {
                const res = await fetch('/api/spoons');
                const data = await res.json();
                if (pendingSpoonLevel === null) {
                    renderSpoons(data.level || 5);
                }
                if (data.note) {
                    spoonNoteDisplay.textContent = data.note;
                }
            } catch (e) {
                console.error('Failed to fetch spoons:', e);
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatLocalTime(utcTimestamp) {
            if (!utcTimestamp) return '';
            const [datePart, timePart] = utcTimestamp.split(' ');
            if (!datePart || !timePart) return utcTimestamp;
            const utcDate = new Date(datePart + 'T' + timePart + ':00Z');
            const year = utcDate.getFullYear();
            const month = String(utcDate.getMonth() + 1).padStart(2, '0');
            const day = String(utcDate.getDate()).padStart(2, '0');
            const hours = String(utcDate.getHours()).padStart(2, '0');
            const minutes = String(utcDate.getMinutes()).padStart(2, '0');
            return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
        }

        function renderNotes(notes) {
            if (!notes || notes.length === 0) {
                notesList.innerHTML = '<div class="empty-notes">No notes yet...</div>';
                return;
            }

            notesList.innerHTML = '';
            const reversed = [...notes].reverse();

            for (const note of reversed) {
                const noteEl = document.createElement('div');
                const isHuman = note.sender === CONFIG.HUMAN_NAME;
                noteEl.className = 'note ' + (isHuman ? 'from-human' : 'from-ai');

                // Get display name for sender
                let senderDisplay = note.sender;
                if (COMPANIONS[note.sender]) {
                    senderDisplay = COMPANIONS[note.sender].displayName;
                } else if (note.sender === CONFIG.HUMAN_NAME) {
                    senderDisplay = CONFIG.HUMAN_DISPLAY_NAME;
                }

                noteEl.innerHTML =
                    '<div class="note-meta">' +
                        '<span class="note-sender">' + senderDisplay + '</span>' +
                        '<span>' + formatLocalTime(note.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="note-text">' + escapeHtml(note.text) + '</div>';
                notesList.appendChild(noteEl);
            }
        }

        async function fetchState() {
            try {
                const res = await fetch('/api/state/' + currentCompanion);
                const state = await res.json();
                updateDisplay(state);
            } catch (e) {
                console.error('Failed to fetch state:', e);
            }
        }

        async function fetchNotes() {
            try {
                const scope = currentNoteScope === 'private' ? currentCompanion : 'shared';
                const res = await fetch('/api/notes/' + scope);
                const notes = await res.json();
                renderNotes(notes);
            } catch (e) {
                console.error('Failed to fetch notes:', e);
            }
        }

        async function sendNote() {
            const text = noteInput.value.trim();
            if (!text) return;

            try {
                const scope = currentNoteScope === 'private' ? currentCompanion : 'shared';
                const res = await fetch('/api/notes/' + scope, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, sender: CONFIG.HUMAN_NAME })
                });

                if (res.ok) {
                    noteInput.value = '';
                    fetchNotes();
                }
            } catch (e) {
                console.error('Failed to send note:', e);
            }
        }

        sendBtn.addEventListener('click', sendNote);
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendNote();
            }
        });

        // Initialize on load
        init();

        // Polling
        setInterval(fetchState, 120000);
        setInterval(fetchNotes, 300000);
        setInterval(fetchSpoons, 3600000);
        setInterval(fetchLove, 3600000);
    </script>
</body>
</html>`;
}
