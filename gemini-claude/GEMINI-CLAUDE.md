# GEMINI.md - project-3.com

## Project Overview
**project-3.com** is an interactive narrative and meta-game experience disguised as a chaotic, poorly designed website from the early 2000s. The project is a "mythological" exploration of old web technologies (HTML, PHP, SQL, Java) where the primary gameplay mechanic is navigation and discovery.

### Core Narrative
The player takes on the role of an internet traveler who stumbles upon a seemingly broken archive. As they explore, they realize the site's ugliness and technical debt are intentional camouflages. The ultimate goal is to identify the singular, obsessive creator (known as "user4" or "Randy Render") hidden behind layers of intentional CSS disasters, broken links, and fake error messages.

### Main Technologies
- **Frontend:** HTML5 (styled to look like HTML 4.0/Netscape era), Vanilla CSS (with intentional "degradation" and chaotic layouts).
- **Logic:** Vanilla JavaScript (`game.js`) managing game state, "fake" loading sequences, pop-up windows, and environmental storytelling.
- **State Management:** Persistence via `localStorage` (key: `project3_state`).
- **Assets:** MIDI-style background music simulation, animated GIFs, and stylized images.

## Directory Structure
- `/index.html`: The main entry point and "Home" zone.
- `/sql.html`: "SQL Storage Room" - A labyrinth of data and tables.
- `/php.html`: "PHP Caves" - Organic, "wet" design with fake PHP errors.
- `/java.html`: "Java Thing/Enterprise Sector" - Over-engineered interfaces and logs.
- `/forum.html`: "Hidden Forum" - Inaccessible until certain conditions are met.
- `/server-root.html`: "Server Root" - The deepest layer of the site infrastructure.
- `/game.js`: The "engine" handling state, UI popups, and game logic.
- `/style.css`: The "chaos" stylesheet with intentional layout breaking.
- `/AI-CLI/`: Contains narrative background (`storyline.md`) and development tasks.
- `/img/`: Local image assets.

## Development Conventions

### Intentional "Bad" Code
This project follows a "Chaotic-Good" architectural pattern. Many "anti-patterns" are intentional:
- **Global Variables:** `game.js` uses many short, global variable names (e.g., `sv`, `f7`, `ctr`) to mimic amateurish code.
- **Redundant Logic:** Code often contains nested `if(true)` or `var x = x + 0` to enhance the "obsessive amateur" aesthetic.
- **Inline Styles & Scripts:** Heavily used in HTML files to reflect early web development habits.

### Game State (`localStorage`)
The state is managed in `game.js` via the `b` blueprint object.
- **Key:** `project3_state`
- **Fields:** `visitedZones`, `cluesFound`, `sqlDeepAccess`, `phpArchitectSearched`, `gameCompleted`, etc.
- **Access:** Always use `getDataX()` to retrieve and `putDataY(a)` to save.

### UI Components
- **Popups:** Use `windowMaker6000(content, options)` or the legacy `popup(a, b)` wrapper.
- **Windows:** Draggable via the `.win-bar` handle.
- **Visual Feedback:** Use `sparkle()` for clue discovery.

## Building and Running
The project is a static web application.
- **Running:** Open `index.html` in any modern web browser.
- **Testing:** Manually verify "hidden" triggers and state transitions. Use `nukeIt()` in the console to reset progress.
- **Dependencies:** None. Pure Vanilla JS/CSS/HTML.

## Narrative Clues (SPOILERS)
- **The Architect:** Randy Render (base64 encoded in `game.js` as `cmFuZHkgcmVuZGVy`).
- **Initials:** "S.W." (Steve Pixel - Red Herring) vs "D.M." (Dave Markup - Red Herring) vs "user4".
- **The Goal:** Find the hidden report form and submit the name "Randy Render".
