# Waveshare Calendar Builder

A Chrome extension for building and exporting weekly visual calendars as BMP images for [Waveshare 7.3" 7-color e-paper displays](https://www.waveshare.com/product/displays/e-paper.htm).

<video src="demo.mp4" controls width="100%"></video>

---

## Features

- **Weekly grid editor** — 7-day × 3-row (Morning / Midday / Evening) calendar
- **Icon library** — Search thousands of emoji-style icons (Iconify) or upload your own
- **Google Calendar sync** — Pull your events for any week directly into the grid
- **AI icon matching** — Uses Claude to automatically find the best icon for each event
- **BMP export** — Renders a pixel-perfect 800×480 BMP with Floyd-Steinberg dithering mapped to the 7-color e-paper palette
- **E-paper preview** — Simulates how the image will look on the physical display
- **Layout history** — Save and restore up to 10 named layouts

---

## Loading the Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `waveshare-calendar-builder` folder
5. The extension icon appears in your Chrome toolbar — click it to open the builder

To reload after making changes, click the refresh icon on the extension card in `chrome://extensions`.

---

## How to Use

### Building your calendar

1. **Search for icons** using the search bar on the left panel (searches the Iconify emoji sets), or upload your own images via drag-and-drop
2. **Drag icons** from the library into any calendar slot (Morning / Midday / Evening for each day)
3. Each slot holds up to **2 icons** — drop a second icon to auto-split the slot

### Syncing Google Calendar

1. Click **Google Calendar** in the toolbar
2. Pick a week using the date picker
3. Click **Sign in & Sync** — authorize Google Calendar access when prompted
4. Your events appear as text labels in the correct day/time slots

### AI Icon Matching

1. Save an [Anthropic API key](https://console.anthropic.com/) in the **AI** section of the panel
2. After syncing Google Calendar, click **Match Icons** — Claude reads each event title and finds the best matching icon automatically

### Exporting

1. Click **Export BMP** to download `waveshare_calendar.bmp` (800×480, 7-color dithered)
2. Transfer the BMP to your Waveshare display using your normal workflow
3. Use **E-Paper Preview** to see a simulated rendering before exporting

### Saving layouts

- **Save Layout** — saves the current slot arrangement with a name
- **Load Layout** — browse and restore previously saved layouts (up to 10)
- **Clear** — resets all slots

---

## E-Paper Color Palette

The exported BMP is dithered to the 7 colors supported by the Waveshare display:

| Color   | RGB            |
|---------|----------------|
| Black   | `0, 0, 0`      |
| White   | `255, 255, 255`|
| Green   | `0, 170, 0`    |
| Blue    | `0, 0, 255`    |
| Red     | `255, 0, 0`    |
| Yellow  | `255, 255, 0`  |
| Orange  | `255, 128, 0`  |

---

## Requirements

- Google Chrome (or any Chromium-based browser with extension support)
- A Google account (for Calendar sync)
- An [Anthropic API key](https://console.anthropic.com/) (for AI icon matching — optional)
