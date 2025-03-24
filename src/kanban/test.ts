#!/usr/bin/env ts-node
/**
 * Simple test script to demonstrate the enhanced kanban with relationship graph
 */

import blessed from 'neo-blessed';

// Main function
async function main() {
  console.log('Starting demo of enhanced kanban with relationship graphs...');
  
  // Create the screen for our terminal UI
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Linear CLI - Enhanced Kanban with Relationships',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'white',
    },
  });
  
  // Create header
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: ' {bold}Linear CLI - Enhanced Kanban with Relationships{/bold} | Demo Mode',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });
  
  // Create footer
  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: ' {bold}q{/bold}: Quit | {bold}g{/bold}: Relationship Graph | {bold}d{/bold}: Detail View | {bold}r{/bold}: Reset View',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });
  
  // Create main board
  const board = blessed.box({
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'white',
      },
    },
  });
  
  // Create columns (representing workflow states)
  const state1 = blessed.box({
    top: 0,
    left: 0,
    width: '25%',
    bottom: 0,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'cyan',
      },
    },
    label: ' Backlog ',
    scrollable: true,
  });
  
  const state2 = blessed.box({
    top: 0,
    left: '25%',
    width: '25%',
    bottom: 0,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'yellow',
      },
    },
    label: ' In Progress ',
    scrollable: true,
  });
  
  const state3 = blessed.box({
    top: 0,
    left: '50%',
    width: '25%',
    bottom: 0,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'magenta',
      },
    },
    label: ' In Review ',
    scrollable: true,
  });
  
  const state4 = blessed.box({
    top: 0,
    left: '75%',
    width: '25%',
    bottom: 0,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'green',
      },
    },
    label: ' Done ',
    scrollable: true,
  });
  
  // Create sample cards
  const card1 = blessed.box({
    top: 0,
    left: 1,
    width: '90%',
    height: 5,
    content: '{bold}DEMO-123{/bold}: Add relationship graph',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'red',
      },
    },
  });
  
  const card2 = blessed.box({
    top: 0,
    left: 1,
    width: '90%',
    height: 5,
    content: '{bold}DEMO-124{/bold}: Implement parent/child relations',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'yellow',
      },
    },
  });
  
  const card3 = blessed.box({
    top: 0,
    left: 1,
    width: '90%',
    height: 5,
    content: '{bold}DEMO-125{/bold}: Add blocking relationship support',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      bg: 'blue',
      fg: 'white',
      border: {
        fg: 'white',
      },
    },
  });
  
  // Issue relationship graph visualization (hidden by default)
  const relationshipGraph = blessed.box({
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'cyan',
      },
    },
    label: ' Relationship Graph - DEMO-123 ',
    hidden: true,
  });
  
  // Create graph nodes and connections
  const graphNode1 = blessed.box({
    top: 10,
    left: 'center',
    width: 20,
    height: 3,
    content: '{center}DEMO-123{/center}',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      bg: 'blue',
      fg: 'white',
      border: {
        fg: 'white',
      },
    },
  });
  
  const graphNode2 = blessed.box({
    top: 3,
    left: '30%',
    width: 20,
    height: 3,
    content: '{center}DEMO-100{/center}',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'green',
      },
    },
  });
  
  const graphNode3 = blessed.box({
    top: 17,
    left: '30%',
    width: 20,
    height: 3,
    content: '{center}DEMO-124{/center}',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'yellow',
      },
    },
  });
  
  const graphNode4 = blessed.box({
    top: 10,
    left: '60%',
    width: 20,
    height: 3,
    content: '{center}DEMO-125{/center}',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'red',
      },
    },
  });
  
  // Add connection labels
  const connectionLabel1 = blessed.text({
    top: 7,
    left: '35%',
    content: 'parent ↑',
    style: {
      fg: 'green',
    },
  });
  
  const connectionLabel2 = blessed.text({
    top: 14,
    left: '35%',
    content: 'child ↓',
    style: {
      fg: 'yellow',
    },
  });
  
  const connectionLabel3 = blessed.text({
    top: 10,
    left: '43%',
    content: 'blocks →',
    style: {
      fg: 'red',
    },
  });
  
  // Add the issue detail view (hidden by default)
  const detailView = blessed.box({
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'white',
      },
    },
    label: ' Issue Details ',
    hidden: true,
  });
  
  // Add content to detail view
  const detailContent = blessed.box({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 1,
    content: `{bold}DEMO-123:{/bold} Add relationship graph
    
{bold}Status:{/bold} In Progress
{bold}Assignee:{/bold} User
{bold}Priority:{/bold} High
{bold}Created:{/bold} March 24, 2025
    
{bold}Description:{/bold}
Implement a relationship graph visualization for issues in the kanban board.
    
{bold}Relationships:{/bold}
• {green-fg}Parent:{/green-fg} DEMO-100 - Enhance kanban visualization
• {yellow-fg}Child:{/yellow-fg} DEMO-124 - Implement parent/child relations
• {red-fg}Blocks:{/red-fg} DEMO-125 - Add blocking relationship support
    
{bold}Comments:{/bold}
User (March 24, 2025): Started implementation of the graph visualization.
`,
    tags: true,
    scrollable: true,
  });
  
  // Relationship management button
  const buttonAdd = blessed.box({
    bottom: 3,
    left: 'center',
    width: 20,
    height: 3,
    content: '{center}Add Relation{/center}',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      bg: 'blue',
      fg: 'white',
      border: {
        fg: 'white',
      },
      hover: {
        bg: 'green',
      },
    },
  });
  
  // Add everything to screen
  screen.append(header);
  screen.append(footer);
  screen.append(board);
  
  board.append(state1);
  board.append(state2);
  board.append(state3);
  board.append(state4);
  
  state1.append(card1);
  state2.append(card2);
  state3.append(card3);
  
  // Add graph visualization elements
  relationshipGraph.append(graphNode1);
  relationshipGraph.append(graphNode2);
  relationshipGraph.append(graphNode3);
  relationshipGraph.append(graphNode4);
  relationshipGraph.append(connectionLabel1);
  relationshipGraph.append(connectionLabel2);
  relationshipGraph.append(connectionLabel3);
  
  // Add detail view elements
  detailView.append(detailContent);
  detailView.append(buttonAdd);
  
  // Key handling
  screen.key(['escape', 'q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  // Handle 'g' to show relationship graph
  screen.key(['g', 'G'], () => {
    detailView.hide();
    relationshipGraph.show();
    screen.render();
  });
  
  // Handle 'd' to show detail view
  screen.key(['d', 'D'], () => {
    relationshipGraph.hide();
    detailView.show();
    screen.render();
  });
  
  // Handle 'r' to reset views
  screen.key(['r', 'R'], () => {
    relationshipGraph.hide();
    detailView.hide();
    screen.render();
  });
  
  // Card click events
  card1.on('click', () => {
    detailView.show();
    relationshipGraph.hide();
    screen.render();
  });
  
  graphNode1.on('click', () => {
    detailView.show();
    relationshipGraph.hide();
    screen.render();
  });
  
  // Button click event
  buttonAdd.on('click', () => {
    const message = blessed.message({
      border: 'line',
      style: {
        fg: 'white',
        bg: 'magenta',
        border: {
          fg: 'white'
        },
      },
      width: 'half',
      height: 'shrink',
      top: 'center',
      left: 'center',
    });
    
    message.display('Relationship added successfully! (Demo mode)', 3);
  });
  
  // Render the screen
  screen.render();
  
  console.log('Demo mode started. Press q to exit.');
}

// Run the main function
main().catch(error => {
  console.error('Error in demo:', error);
});