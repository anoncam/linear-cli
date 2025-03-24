/**
 * Screen Component
 *
 * This component sets up the main blessed screen for the kanban board.
 */

import blessed from 'neo-blessed';

/**
 * Set up the main blessed screen
 */
export function setupScreen(): ReturnType<typeof blessed.screen> {
  // Create a screen object
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Linear CLI - Enhanced Kanban',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'white',
    },
    debug: false,
    dockBorders: true,
    fullUnicode: true,
    autoPadding: true,
  });

  // Configure screen
  screen.key(['q', 'C-c'], () => {
    return process.exit(0);
  });

  // Set up error handling
  screen.on('error', (err) => {
    console.error('Screen error:', err);
  });

  return screen;
}