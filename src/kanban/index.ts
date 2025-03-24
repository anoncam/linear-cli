/**
 * Enhanced Kanban Mode for Linear CLI
 * 
 * This module provides a full-featured terminal GUI for viewing and managing Linear issues
 * in a kanban board layout using the neo-blessed library.
 */

import blessed from 'neo-blessed';
import chalk from 'chalk';
import { GraphQLClient } from 'graphql-request';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

// GraphQL query for fetching issues - corrected types to match Linear API schema
const ISSUES_QUERY = `
  query GetTeamIssues($teamId: String!) {
    team(id: $teamId) {
      id
      name
      states {
        nodes {
          id
          name
          color
          type
        }
      }
      issues(first: 50) {
        nodes {
          id
          identifier
          title
          description
          state {
            id
            name
            color
            type
          }
          assignee {
            id
            name
            displayName
          }
          priority
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    }
  }
`;

// GraphQL mutation to update issue state
const UPDATE_ISSUE_STATE = `
  mutation UpdateIssueState($issueId: String!, $stateId: String!) {
    issueUpdate(id: $issueId, input: { stateId: $stateId }) {
      success
      issue {
        id
        identifier
        state {
          id
          name
          color
          type
        }
      }
    }
  }
`;

// GraphQL query for fetching teams
const TEAMS_QUERY = `
  query {
    teams {
      nodes {
        id
        name
        key
      }
    }
  }
`;

// Simple test query to verify authentication
const TEST_QUERY = `
  query {
    viewer {
      id
      name
      email
    }
  }
`;

// Priority mapping
const PRIORITIES = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low'
};

// Gogh Color Scheme inspired colors
// https://github.com/Gogh-Co/Gogh
const GOGH_COLORS = {
  background: '#282a36',
  foreground: '#f8f8f2',
  black: '#000000',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#bbbbbb',
  brightBlack: '#555555',
  brightRed: '#ff5555',
  brightGreen: '#50fa7b',
  brightYellow: '#f1fa8c',
  brightBlue: '#bd93f9',
  brightMagenta: '#ff79c6',
  brightCyan: '#8be9fd',
  brightWhite: '#ffffff'
};

// Priority colors - updated with Gogh color scheme
const PRIORITY_COLORS = {
  0: GOGH_COLORS.brightBlack,
  1: GOGH_COLORS.red,
  2: GOGH_COLORS.yellow,
  3: GOGH_COLORS.blue,
  4: GOGH_COLORS.green
};

// State type colors - updated with Gogh color scheme
const STATE_TYPE_COLORS = {
  'backlog': GOGH_COLORS.brightBlack,
  'unstarted': GOGH_COLORS.yellow,
  'started': GOGH_COLORS.blue,
  'completed': GOGH_COLORS.green,
  'canceled': GOGH_COLORS.red
};

/**
 * Main entry point for the enhanced kanban mode
 * 
 * @param options Configuration options for the kanban view
 * @returns Promise that resolves when the kanban view is closed
 */
async function showEnhancedKanban(options: {
  apiKey: string;
  teamId?: string;
  teamName?: string;
  assigneeId?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  console.log(chalk.blue.bold('Enhanced Kanban Mode'));
  console.log(chalk.blue('-------------------'));
  console.log('Options:', JSON.stringify(options, null, 2));
  console.log('\nLoading data from Linear API...');
  
  try {
    // Initialize GraphQL client - proper way to authenticate with Linear API
    const client = new GraphQLClient(LINEAR_API_URL, {
      headers: {
        Authorization: options.apiKey  // No "Bearer" prefix!
      }
    });

    // First, run a simple test query to verify authentication
    try {
      const testData = await client.request(TEST_QUERY);
      console.log('Authentication successful:', testData.viewer.name);
    } catch (authError) {
      console.error('Authentication failed:', authError);
      throw new Error('Failed to authenticate with Linear API. Check your API key.');
    }

    // Fetch available teams
    const teamsData = await client.request(TEAMS_QUERY);
    const teams = teamsData.teams.nodes;
    console.log(`Found ${teams.length} teams`);

    // Create a screen with Gogh color theme
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Linear CLI - Enhanced Kanban Mode',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: GOGH_COLORS.cyan
      },
      // Set Gogh-inspired terminal colors
      forceUnicode: true,
      fullUnicode: true
    });

    // Create a box for the header
    const header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: ' Linear CLI - Enhanced Kanban Mode ',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: GOGH_COLORS.foreground,
        bg: GOGH_COLORS.blue,
        border: {
          fg: GOGH_COLORS.cyan
        }
      }
    });

    // Create a box for the footer
    const footer = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: ' {bold}q{/bold}: Quit | {bold}r{/bold}: Refresh | {bold}t{/bold}: Switch Team | {bold}↑/↓/←/→{/bold}: Navigate | {bold}Enter{/bold}: View Details | {bold}s{/bold}: Change State ',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: GOGH_COLORS.foreground,
        bg: GOGH_COLORS.blue,
        border: {
          fg: GOGH_COLORS.cyan
        }
      }
    });

    // Create a loading box
    const loadingBox = blessed.box({
      top: 'center',
      left: 'center',
      width: 50,
      height: 5,
      content: '{center}Loading data from Linear API...{/center}',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: GOGH_COLORS.foreground,
        bg: GOGH_COLORS.blue,
        border: {
          fg: GOGH_COLORS.cyan
        }
      }
    });

    // Add the boxes to the screen
    screen.append(header);
    screen.append(footer);
    screen.append(loadingBox);
    screen.render();

    // Initial state
    let currentTeamIndex = teams.findIndex(team => team.id === options.teamId);
    if (currentTeamIndex < 0) currentTeamIndex = 0;
    
    // Navigation state
    let currentColumnIndex = 0;
    let currentCardIndices = {}; // Tracks selected card for each column
    let columnRefs = []; // Holds references to column containers
    let cardRefs = []; // Holds references to card elements
    let states = []; // Holds workflow states
    let stateIssues = []; // Holds issues for each state
    let allIssues = []; // Holds all issues

    // Function to update the visual selection - Using arrow function to avoid strict mode issues
    const updateSelection = () => {
      // Unhighlight all cards
      cardRefs.forEach((column, colIndex) => {
        column.forEach((card, cardIndex) => {
          const issue = stateIssues[colIndex][cardIndex];
          const priorityColor = PRIORITY_COLORS[issue.priority] || GOGH_COLORS.white;
          
          card.style.bg = undefined; // Changed from null to undefined
          card.style.fg = undefined; // Changed from null to undefined
          card.style.border.fg = priorityColor;
        });
      });
      
      // Highlight selected card if exists
      const selectedColIndex = currentColumnIndex;
      const selectedCardIndex = currentCardIndices[selectedColIndex];
      
      if (selectedCardIndex >= 0 && cardRefs[selectedColIndex] && cardRefs[selectedColIndex][selectedCardIndex]) {
        const card = cardRefs[selectedColIndex][selectedCardIndex];
        card.style.bg = GOGH_COLORS.magenta;
        card.style.fg = GOGH_COLORS.foreground;
        card.style.border.fg = GOGH_COLORS.brightWhite;
        
        // Scroll to the selected card if column exists
        if (columnRefs[selectedColIndex]) {
          columnRefs[selectedColIndex].scrollTo(selectedCardIndex * 8);
        }
      }
      
      screen.render();
    };

    // Function to show state selector dialog
    const showStateSelector = async (issue) => {
      // Create state selection box
      const stateBox = blessed.box({
        top: 'center',
        left: 'center',
        width: 60,
        height: states.length + 4,
        tags: true,
        border: {
          type: 'line'
        },
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.background,
          border: {
            fg: GOGH_COLORS.cyan
          }
        }
      });
      
      // State header
      const stateHeader = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: `{center}Change State for ${issue.identifier}{/center}`,
        tags: true,
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.blue
        }
      });
      
      // State list
      const stateList = blessed.list({
        top: 1,
        left: 0,
        width: '100%',
        height: states.length + 2,
        items: states.map(state => {
          const prefix = issue.state.id === state.id ? '● ' : '○ ';
          return `${prefix}${state.name} (${state.type})`;
        }),
        tags: true,
        style: {
          selected: {
            bg: GOGH_COLORS.magenta,
            fg: GOGH_COLORS.foreground
          }
        },
        keys: true,
        vi: true,
        mouse: true
      });
      
      // Find current state for initial selection
      const currentStateIndex = states.findIndex(state => state.id === issue.state.id);
      if (currentStateIndex >= 0) {
        stateList.select(currentStateIndex);
      }
      
      // Add elements to state box
      stateBox.append(stateHeader);
      stateBox.append(stateList);
      
      // Add the state box to the screen
      screen.append(stateBox);
      stateList.focus();
      
      // Set key bindings
      stateList.key(['escape'], () => {
        screen.remove(stateBox);
        screen.render();
        return false; // Prevent event bubbling to the global escape handler
      });
      
      stateList.key(['enter'], async () => {
        const selectedIndex = stateList.selected;
        const selectedState = states[selectedIndex];
        
        if (selectedState && selectedState.id !== issue.state.id) {
          // Remove state selection box and add loading box
          screen.remove(stateBox);
          screen.append(loadingBox);
          loadingBox.setContent(`{center}Updating issue state to ${selectedState.name}...{/center}`);
          screen.render();
          
          try {
            // Update issue state in Linear
            const updateResult = await client.request(UPDATE_ISSUE_STATE, {
              issueId: issue.id,
              stateId: selectedState.id
            });
            
            if (updateResult.issueUpdate.success) {
              loadingBox.setContent(`{center}Issue updated successfully!{/center}`);
              screen.render();
              
              // Update local issue data
              issue.state = selectedState;
              
              // Wait a moment to show success message
              setTimeout(() => {
                screen.remove(loadingBox);
                // Refresh the data
                fetchData(teams[currentTeamIndex].id);
              }, 1000);
            } else {
              loadingBox.setContent(`{center}Error: Failed to update issue state{/center}`);
              screen.render();
              
              // Wait a moment to show error message
              setTimeout(() => {
                screen.remove(loadingBox);
                screen.render();
              }, 2000);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            loadingBox.setContent(`{center}Error: ${errorMessage}{/center}`);
            screen.render();
            
            // Wait a moment to show error message
            setTimeout(() => {
              screen.remove(loadingBox);
              screen.render();
            }, 2000);
          }
        } else {
          // No change needed
          screen.remove(stateBox);
          screen.render();
        }
      });
      
      screen.render();
    };

    // Function to show issue details - Using arrow function to avoid strict mode issues
    const showIssueDetails = (issue) => {
      // Remove any existing detail view
      screen.children.forEach(child => {
        if (child !== header && child !== footer && child.isDetailView) {
          screen.remove(child);
        }
      });
      
      // Create detail view box that takes most of the screen
      const detailBox = blessed.box({
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        tags: true,
        border: {
          type: 'line'
        },
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.background,
          border: {
            fg: GOGH_COLORS.cyan
          }
        },
        scrollable: true,
        alwaysScroll: true,
        isDetailView: true,
        keys: true
      });
      
      // Issue header
      const issueHeader = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: 3,
        content: `{center}${issue.identifier}: ${issue.title}{/center}`,
        tags: true,
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.blue
        }
      });
      
      // Issue content - Using fixed height instead of calculating from detailBox
      const issueContent = blessed.box({
        top: 3,
        left: 0,
        width: '100%',
        height: '80%', // Use percentage instead of calculation
        padding: 1,
        scrollable: true,
        content: `
{bold}State:{/bold} ${issue.state.name} (${issue.state.type})
{bold}Assignee:{/bold} ${issue.assignee ? issue.assignee.displayName : 'Unassigned'}
{bold}Priority:{/bold} ${PRIORITIES[issue.priority]}

{bold}Description:{/bold}
${issue.description || 'No description provided.'}
        `,
        tags: true,
        style: {
          fg: GOGH_COLORS.foreground
        }
      });
      
      // Issue footer
      const issueFooter = blessed.box({
        bottom: 0,
        left: 0,
        width: '100%',
        height: 3,
        content: `{center}Press {bold}Escape{/bold} to return to kanban board | Press {bold}s{/bold} to change state{/center}`,
        tags: true,
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.blue
        }
      });
      
      // Add elements to detail box
      detailBox.append(issueHeader);
      detailBox.append(issueContent);
      detailBox.append(issueFooter);
      
      // Add the detail box to the screen
      screen.append(detailBox);
      
      // Set key bindings
      detailBox.key(['escape'], () => {
        screen.remove(detailBox);
        screen.render();
        return false; // Prevent event bubbling to the global escape handler
      });
      
      // Add state change shortcut
      detailBox.key(['s'], () => {
        showStateSelector(issue);
      });
      
      screen.render();
    };

    // Function to show team selection dialog - Using arrow function to avoid strict mode issues
    const showTeamSelector = () => {
      // Create team selection box
      const teamBox = blessed.box({
        top: 'center',
        left: 'center',
        width: 60,
        height: teams.length + 4,
        tags: true,
        border: {
          type: 'line'
        },
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.background,
          border: {
            fg: GOGH_COLORS.cyan
          }
        }
      });
      
      // Team header
      const teamHeader = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: '{center}Select Team{/center}',
        tags: true,
        style: {
          fg: GOGH_COLORS.foreground,
          bg: GOGH_COLORS.blue
        }
      });
      
      // Team list
      const teamList = blessed.list({
        top: 1,
        left: 0,
        width: '100%',
        height: teams.length + 2,
        items: teams.map(team => `${team.key}: ${team.name}`),
        tags: true,
        style: {
          selected: {
            bg: GOGH_COLORS.magenta,
            fg: GOGH_COLORS.foreground
          }
        },
        keys: true,
        vi: true,
        mouse: true
      });
      
      // Set initial selection to current team
      teamList.select(currentTeamIndex);
      
      // Add elements to team box
      teamBox.append(teamHeader);
      teamBox.append(teamList);
      
      // Add the team box to the screen
      screen.append(teamBox);
      teamList.focus();
      
      // Set key bindings
      teamList.key(['escape'], () => {
        screen.remove(teamBox);
        screen.render();
        return false; // Prevent event bubbling to the global escape handler
      });
      
      teamList.key(['enter'], () => {
        const selectedIndex = teamList.selected;
        screen.remove(teamBox);
        
        if (selectedIndex !== currentTeamIndex) {
          currentTeamIndex = selectedIndex;
          const selectedTeam = teams[selectedIndex];
          
          // Add loading box
          screen.append(loadingBox);
          screen.render();
          
          // Fetch data for selected team
          fetchData(selectedTeam.id);
        } else {
          screen.render();
        }
      });
      
      screen.render();
    };

    // Fetch data from Linear API
    const fetchData = async (teamId: string) => {
      try {
        loadingBox.setContent('{center}Loading data from Linear API...{/center}');
        screen.render();

        // Make sure we have a teamId
        if (!teamId) {
          throw new Error('Team ID is required');
        }

        // Now fetch the team and issues data
        const data = await client.request(ISSUES_QUERY, { teamId });
        
        if (!data.team) {
          throw new Error('Team not found');
        }

        const team = data.team;
        states = team.states.nodes;
        allIssues = team.issues.nodes;

        console.log(`Loaded ${allIssues.length} issues across ${states.length} states`);

        // Clear navigation state
        currentColumnIndex = 0;
        currentCardIndices = {};
        columnRefs = [];
        cardRefs = [];
        stateIssues = [];

        // Remove loading box and any previous content
        screen.children.forEach(child => {
          if (child !== header && child !== footer) {
            screen.remove(child);
          }
        });

        // Create a box for the main content
        const content = blessed.box({
          top: 3,
          left: 0,
          width: '100%',
          height: '100%-6',
          tags: true,
          border: {
            type: 'line'
          },
          style: {
            fg: GOGH_COLORS.foreground,
            bg: GOGH_COLORS.background,
            border: {
              fg: GOGH_COLORS.cyan
            }
          },
          scrollable: true,
          alwaysScroll: true,
          scrollbar: {
            ch: ' ',
            track: {
              bg: GOGH_COLORS.brightBlack
            },
            style: {
              inverse: true
            }
          }
        });

        // Add the content box to the screen
        screen.append(content);

        // Group issues by state
        const issuesByState = {};
        states.forEach(state => {
          issuesByState[state.id] = [];
        });

        allIssues.forEach(issue => {
          if (issuesByState[issue.state.id]) {
            issuesByState[issue.state.id].push(issue);
          } else {
            console.log(`Issue ${issue.identifier} has state ${issue.state.id} which was not found in states`);
          }
        });

        // Calculate column width - using fixed width if screen width is unavailable
        const screenWidth = screen.width || 100;
        const columnWidth = Math.floor((screenWidth - states.length - 1) / states.length);

        // Create columns for each state
        let left = 0;
        states.forEach((state, stateIndex) => {
          const stateColor = STATE_TYPE_COLORS[state.type] || GOGH_COLORS.white;
          const stateIssueList = issuesByState[state.id] || [];
          stateIssues.push(stateIssueList);
          
          // Initialize selected card index for this column
          if (currentCardIndices[stateIndex] === undefined) {
            currentCardIndices[stateIndex] = stateIssueList.length > 0 ? 0 : -1;
          }
          
          // Create column header
          const columnHeader = blessed.box({
            top: 0,
            left: left,
            width: columnWidth,
            height: 3,
            content: `{center}{bold}${state.name}{/bold} (${stateIssueList.length}){/center}`,
            tags: true,
            border: {
              type: 'line'
            },
            style: {
              fg: GOGH_COLORS.foreground,
              bg: stateColor,
              border: {
                fg: GOGH_COLORS.cyan
              }
            }
          });
          
          // Create column content
          const columnContent = blessed.box({
            top: 3,
            left: left,
            width: columnWidth,
            height: '100%-6', // Use percentage instead of calculation
            tags: true,
            border: {
              type: 'line'
            },
            style: {
              fg: GOGH_COLORS.foreground,
              border: {
                fg: GOGH_COLORS.cyan
              }
            },
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
              ch: ' ',
              track: {
                bg: GOGH_COLORS.brightBlack
              },
              style: {
                inverse: true
              }
            }
          });
          
          // Store reference to column
          columnRefs.push(columnContent);
          
          // Add issues to column
          let top = 0;
          const columnCards = [];
          stateIssueList.forEach((issue, issueIndex) => {
            const priorityColor = PRIORITY_COLORS[issue.priority] || GOGH_COLORS.white;
            const isSelected = currentCardIndices[stateIndex] === issueIndex;
            
            const issueBox = blessed.box({
              top: top,
              left: 0,
              width: columnWidth - 2,
              height: 7,
              tags: true,
              border: {
                type: 'line'
              },
              style: {
                border: {
                  fg: isSelected ? GOGH_COLORS.brightWhite : priorityColor
                },
                bg: isSelected ? GOGH_COLORS.magenta : undefined,
                fg: isSelected ? GOGH_COLORS.foreground : undefined
              }
            });
            
            columnCards.push(issueBox);
            
            // Issue identifier and title
            const issueTitle = blessed.text({
              top: 0,
              left: 1,
              width: columnWidth - 4,
              height: 1,
              content: `{bold}${issue.identifier}{/bold}: ${issue.title.substring(0, columnWidth - 4 - issue.identifier.length - 2)}`,
              tags: true,
              style: {
                fg: GOGH_COLORS.foreground
              }
            });
            
            // Issue assignee
            const issueAssignee = blessed.text({
              top: 1,
              left: 1,
              width: columnWidth - 4,
              height: 1,
              content: `Assignee: ${issue.assignee ? issue.assignee.displayName : 'Unassigned'}`,
              tags: true,
              style: {
                fg: GOGH_COLORS.foreground
              }
            });
            
            // Issue priority
            const issuePriority = blessed.text({
              top: 2,
              left: 1,
              width: columnWidth - 4,
              height: 1,
              content: `Priority: {${priorityColor}-fg}${PRIORITIES[issue.priority]}{/${priorityColor}-fg}`,
              tags: true,
              style: {
                fg: GOGH_COLORS.foreground
              }
            });
            
            // Issue labels
            let labelContent = 'Labels: ';
            if (issue.labels && issue.labels.nodes.length > 0) {
              labelContent += issue.labels.nodes.map(label => `{${label.color}-fg}${label.name}{/${label.color}-fg}`).join(', ');
            } else {
              labelContent += 'None';
            }
            
            const issueLabels = blessed.text({
              top: 3,
              left: 1,
              width: columnWidth - 4,
              height: 1,
              content: labelContent,
              tags: true,
              style: {
                fg: GOGH_COLORS.foreground
              }
            });
            
            // Add elements to issue box
            issueBox.append(issueTitle);
            issueBox.append(issueAssignee);
            issueBox.append(issuePriority);
            issueBox.append(issueLabels);
            
            // Add issue box to column
            columnContent.append(issueBox);
            
            // Update top position for next issue
            top += 8;
          });
          
          // Store cards for this column
          cardRefs.push(columnCards);
          
          // Add column header and content to content box
          content.append(columnHeader);
          content.append(columnContent);
          
          // Update left position for next column
          left += columnWidth;
        });

        // Update header with team info
        header.setContent(` Linear CLI - Enhanced Kanban Mode - Team: ${team.name} (${currentTeamIndex + 1}/${teams.length}) `);

        // Initial highlight of selected card
        updateSelection();

        // Render the screen
        screen.render();
      } catch (error: any) {
        loadingBox.setContent(`{center}Error: ${error.message}{/center}`);
        screen.render();
        
        console.error('Error in enhanced kanban mode:', error);
        
        // Wait for 3 seconds and then exit
        setTimeout(() => {
          screen.destroy();
          process.exit(1);
        }, 3000);
      }
    };

    // Set navigation key bindings
    screen.key(['left'], () => {
      if (currentColumnIndex > 0) {
        currentColumnIndex--;
        updateSelection();
      }
    });
    
    screen.key(['right'], () => {
      if (currentColumnIndex < states.length - 1) {
        currentColumnIndex++;
        updateSelection();
      }
    });
    
    screen.key(['up'], () => {
      const currentSelected = currentCardIndices[currentColumnIndex];
      if (currentSelected > 0) {
        currentCardIndices[currentColumnIndex]--;
        updateSelection();
      }
    });
    
    screen.key(['down'], () => {
      const currentSelected = currentCardIndices[currentColumnIndex];
      const maxIndex = stateIssues[currentColumnIndex] ? stateIssues[currentColumnIndex].length - 1 : -1;
      if (currentSelected < maxIndex) {
        currentCardIndices[currentColumnIndex]++;
        updateSelection();
      }
    });
    
    screen.key(['enter'], () => {
      const selectedColIndex = currentColumnIndex;
      const selectedCardIndex = currentCardIndices[selectedColIndex];
      
      if (selectedCardIndex >= 0 && 
          stateIssues[selectedColIndex] && 
          stateIssues[selectedColIndex][selectedCardIndex]) {
        const issue = stateIssues[selectedColIndex][selectedCardIndex];
        showIssueDetails(issue);
      }
    });
    
    // Add state change shortcut
    screen.key(['s'], () => {
      const selectedColIndex = currentColumnIndex;
      const selectedCardIndex = currentCardIndices[selectedColIndex];
      
      if (selectedCardIndex >= 0 && 
          stateIssues[selectedColIndex] && 
          stateIssues[selectedColIndex][selectedCardIndex]) {
        const issue = stateIssues[selectedColIndex][selectedCardIndex];
        showStateSelector(issue);
      }
    });
    
    // Add refresh key binding
    screen.key('r', async () => {
      const currentTeam = teams[currentTeamIndex];
      
      // Add loading box
      screen.append(loadingBox);
      screen.render();
      
      // Fetch data again
      await fetchData(currentTeam.id);
    });
    
    // Add team switch key binding
    screen.key('t', () => {
      showTeamSelector();
    });

    // Set key bindings for exit
    screen.key(['q', 'C-c'], () => {
      console.log('\nExiting enhanced kanban mode.');
      screen.destroy();
      process.exit(0);
    });
    
    // Handle escape key - only exit if we're in the main kanban view
    screen.key(['escape'], () => {
      // If we're in the detail view, the detail view's own escape handler will handle it
      // If we're in any other view, go back to kanban view
      if (screen.children.some(child => child.isDetailView)) {
        // Don't do anything, let the detail view handle it
        return;
      } else {
        console.log('\nExiting enhanced kanban mode.');
        screen.destroy();
        process.exit(0);
      }
    });

    // Initial data fetch
    await fetchData(teams[currentTeamIndex].id);

    // Return a promise that resolves when the screen is closed
    return new Promise((resolve) => {
      screen.on('destroy', () => {
        resolve();
      });
    });
  } catch (error: any) {
    console.error('Error in enhanced kanban mode:', error);
    return Promise.resolve();
  }
}

// Export for CommonJS compatibility
module.exports = { showEnhancedKanban };
// Also export for ES modules
export { showEnhancedKanban };