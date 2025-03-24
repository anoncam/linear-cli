/**
 * Layout Component
 * 
 * This component sets up the main layout for the kanban board.
 */

import blessed from 'neo-blessed';

/**
 * Layout sections for the kanban board
 */
export interface KanbanLayout {
  header: ReturnType<typeof blessed.box>;
  board: ReturnType<typeof blessed.box>;
  footer: ReturnType<typeof blessed.box>;
  detailView: ReturnType<typeof blessed.box>;
  relationshipGraph: ReturnType<typeof blessed.box>;
  loading: ReturnType<typeof blessed.box>;
}

/**
 * Set up the main layout for the kanban board
 */
export function setupLayout(screen: ReturnType<typeof blessed.screen>): KanbanLayout {
  // Create the header
  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the footer
  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the main board area
  const board = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
  });

  // Create the detail view (hidden by default)
  const detailView = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'white',
      },
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
    hidden: true,
  });

  // Create the loading overlay (hidden by default)
  const loading = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 30,
    height: 5,
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'white',
      },
    },
    content: '{center}Loading...{/center}',
    align: 'center',
    valign: 'middle',
    hidden: true,
  });

  // Create the relationship graph view (hidden by default)
  const relationshipGraph = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '90%',
    height: '90%',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan',
      },
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
    hidden: true,
  });

  return {
    header,
    board,
    footer,
    detailView,
    relationshipGraph,
    loading,
  };
}