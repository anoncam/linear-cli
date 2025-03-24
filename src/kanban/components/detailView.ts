/**
 * Detail View Component
 * 
 * This component displays detailed information about a selected issue.
 */

import blessed from 'neo-blessed';
import { KanbanState, ViewMode } from '../state/kanbanState';
import { LinearIssue } from '../../types/linear';
import { setParentRelation, createBlockingRelation, createRelatedRelation } from '../utils/issueRelations';

/**
 * Set up the detail view for the kanban board
 */
export function setupDetailView(
  detailBox: ReturnType<typeof blessed.box>,
  state: KanbanState,
  apiService?: any
): void {
  // Set a property on the detailBox to identify it
  (detailBox as any).isDetailView = true;

  // Create the content container
  const contentContainer = blessed.box({
    parent: detailBox,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    keys: true,
    mouse: true,
    tags: true,
  });

  // Create the title
  const title = blessed.text({
    parent: contentContainer,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    style: {
      fg: 'white',
      bold: true,
    },
  });

  // Create the identifier
  const identifier = blessed.text({
    parent: contentContainer,
    top: 1,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    style: {
      fg: 'white',
    },
  });

  // Create the metadata
  const metadata = blessed.text({
    parent: contentContainer,
    top: 3,
    left: 0,
    right: 0,
    height: 6,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Create the description
  const description = blessed.box({
    parent: contentContainer,
    top: 10,
    left: 0,
    right: 0,
    height: 10,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
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
  });

  // Create the labels section
  const labels = blessed.text({
    parent: contentContainer,
    top: 21,
    left: 0,
    right: 0,
    height: 3,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Create the relationships section
  const relationships = blessed.box({
    parent: contentContainer,
    top: 25,
    left: 0,
    right: 0,
    height: 10,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
      fg: 'blue',
    },
    label: ' Relationships ',
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
  });

  // Create the comments section
  const comments = blessed.box({
    parent: contentContainer,
    top: 36,
    left: 0,
    right: 0,
    bottom: 0,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
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
  });

  // Function to update the detail view with issue data
  function updateDetailView(issue: LinearIssue | null): void {
    if (!issue) {
      title.setContent('No issue selected');
      identifier.setContent('');
      metadata.setContent('');
      description.setContent('');
      labels.setContent('');
      relationships.setContent('');
      comments.setContent('');
      return;
    }

    // Update title
    title.setContent(issue.title);

    // Update identifier
    identifier.setContent(`${issue.identifier}`);

    // Update metadata
    let metadataContent = '';
    metadataContent += `{bold}State:{/bold} ${issue.state.name}\n`;
    metadataContent += `{bold}Priority:{/bold} P${issue.priority}\n`;
    metadataContent += `{bold}Assignee:{/bold} ${issue.assignee ? issue.assignee.name : 'Unassigned'}\n`;
    metadataContent += `{bold}Creator:{/bold} ${issue.creator ? issue.creator.name : 'Unknown'}\n`;
    metadataContent += `{bold}Created:{/bold} ${new Date(issue.createdAt).toLocaleString()}\n`;
    metadataContent += `{bold}Updated:{/bold} ${new Date(issue.updatedAt).toLocaleString()}`;
    metadata.setContent(metadataContent);

    // Update description
    description.setContent(issue.description || 'No description');

    // Update labels
    if (issue.labels && issue.labels.length > 0) {
      const labelText = issue.labels
        .map((label) => `{${label.color}-fg}${label.name}{/}`)
        .join(', ');
      labels.setContent(`{bold}Labels:{/bold} ${labelText}`);
    } else {
      labels.setContent('{bold}Labels:{/bold} None');
    }

    // Update relationships
    let relationshipsContent = '';
    
    // Check for parent
    if (issue.parent) {
      relationshipsContent += `{bold}{green-fg}Parent:{/green-fg}{/bold} ${issue.parent.identifier} - ${issue.parent.title}\n`;
    }

    // Check for children
    if (issue.children && issue.children.length > 0) {
      relationshipsContent += `{bold}{green-fg}Children:{/green-fg}{/bold}\n`;
      issue.children.forEach(child => {
        relationshipsContent += `  • ${child.identifier} - ${child.title}\n`;
      });
    }

    // Check for blocked by
    if (issue.blockedBy && issue.blockedBy.length > 0) {
      relationshipsContent += `{bold}{red-fg}Blocked By:{/red-fg}{/bold}\n`;
      issue.blockedBy.forEach(blocker => {
        relationshipsContent += `  • ${blocker.identifier} - ${blocker.title}\n`;
      });
    }

    // Check for blocking
    if (issue.blocking && issue.blocking.length > 0) {
      relationshipsContent += `{bold}{yellow-fg}Blocking:{/yellow-fg}{/bold}\n`;
      issue.blocking.forEach(blocked => {
        relationshipsContent += `  • ${blocked.identifier} - ${blocked.title}\n`;
      });
    }

    // Check for related
    if (issue.relatedTo && issue.relatedTo.length > 0) {
      relationshipsContent += `{bold}{blue-fg}Related To:{/blue-fg}{/bold}\n`;
      issue.relatedTo.forEach(related => {
        relationshipsContent += `  • ${related.identifier} - ${related.title}\n`;
      });
    }

    if (relationshipsContent) {
      relationships.setContent(relationshipsContent);
    } else {
      relationships.setContent('No relationships found.');
    }

    // Update comments
    if (issue.comments && issue.comments.length > 0) {
      let commentsContent = '{bold}Comments:{/bold}\n\n';
      issue.comments.forEach((comment) => {
        commentsContent += `{bold}${comment.user?.name || 'Unknown'}{/bold} (${new Date(comment.createdAt).toLocaleString()}):\n`;
        commentsContent += `${comment.body}\n\n`;
      });
      comments.setContent(commentsContent);
    } else {
      comments.setContent('{bold}Comments:{/bold} None');
    }

    // Render the screen
    detailBox.screen.render();
  }

  // Update the detail view when the selected issue changes
  state.events.on('issue-selected', (issueId) => {
    if (issueId) {
      const issue = state.issues.find((i) => i.id === issueId);
      if (issue) {
        updateDetailView(issue);
      }
    }
  });

  // Show/hide the detail view when the view mode changes
  state.events.on('view-mode-changed', (mode) => {
    if (mode === ViewMode.DETAIL) {
      detailBox.show();
    } else {
      detailBox.hide();
    }
    detailBox.screen.render();
  });

  // Handle escape key to close detail view
  detailBox.key(['escape'], () => {
    state.setViewMode(ViewMode.KANBAN);
    detailBox.screen.render();
  });
  
  // Add keyboard shortcut to add parent relationship (P)
  detailBox.key(['p'], () => {
    if (state.selectedIssueId) {
      // Show a prompt to enter parent issue identifier
      const prompt = blessed.prompt({
        parent: detailBox.screen,
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' Set Parent Issue ',
        tags: true,
        keys: true,
        vi: true
      });
      
      prompt.input('Enter parent issue identifier (e.g., ENG-123):', '', (err: Error | null, value: string | null) => {
        if (err || !value) return;
        
        if (apiService) {
          // Use the issue relations utility to set parent
          setParentRelation(apiService, state, state.selectedIssueId || '', value)
            .then((success) => {
              const message = blessed.message({
                parent: detailBox.screen,
                border: 'line',
                height: 'shrink',
                width: 'half',
                top: 'center',
                left: 'center',
                label: ' Set Parent ',
                tags: true,
                keys: true,
                hidden: true
              });
              
              if (success) {
                message.display(`Parent set to ${value}`, 3);
              } else {
                message.display(`Failed to set parent to ${value}`, 3);
              }
            });
        } else {
          // API service not available
          const message = blessed.message({
            parent: detailBox.screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' Error ',
            tags: true,
            keys: true,
            hidden: true
          });
          
          message.display('API service not available', 3);
        }
      });
    }
  });
  
  // Add keyboard shortcut to add blocking relationship (B)
  detailBox.key(['b'], () => {
    if (state.selectedIssueId) {
      // Show a prompt to enter blocking issue identifier
      const prompt = blessed.prompt({
        parent: detailBox.screen,
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' Add Blocking Relationship ',
        tags: true,
        keys: true,
        vi: true
      });
      
      prompt.input('Enter issue identifier that this issue blocks (e.g., ENG-123):', '', (err: Error | null, value: string | null) => {
        if (err || !value) return;
        
        if (apiService) {
          // Use the issue relations utility to create blocking relationship
          createBlockingRelation(apiService, state, state.selectedIssueId || '', value)
            .then((success) => {
              const message = blessed.message({
                parent: detailBox.screen,
                border: 'line',
                height: 'shrink',
                width: 'half',
                top: 'center',
                left: 'center',
                label: ' Add Blocking ',
                tags: true,
                keys: true,
                hidden: true
              });
              
              if (success) {
                message.display(`Now blocking ${value}`, 3);
              } else {
                message.display(`Failed to block ${value}`, 3);
              }
            });
        } else {
          // API service not available
          const message = blessed.message({
            parent: detailBox.screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' Error ',
            tags: true,
            keys: true,
            hidden: true
          });
          
          message.display('API service not available', 3);
        }
      });
    }
  });
  
  // Add keyboard shortcut to add related relationship (R)
  detailBox.key(['r'], () => {
    if (state.selectedIssueId) {
      // Show a prompt to enter related issue identifier
      const prompt = blessed.prompt({
        parent: detailBox.screen,
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' Add Related Issue ',
        tags: true,
        keys: true,
        vi: true
      });
      
      prompt.input('Enter related issue identifier (e.g., ENG-123):', '', (err: Error | null, value: string | null) => {
        if (err || !value) return;
        
        if (apiService) {
          // Use the issue relations utility to create related relationship
          createRelatedRelation(apiService, state, state.selectedIssueId || '', value)
            .then((success) => {
              const message = blessed.message({
                parent: detailBox.screen,
                border: 'line',
                height: 'shrink',
                width: 'half',
                top: 'center',
                left: 'center',
                label: ' Add Related ',
                tags: true,
                keys: true,
                hidden: true
              });
              
              if (success) {
                message.display(`Related to ${value}`, 3);
              } else {
                message.display(`Failed to relate to ${value}`, 3);
              }
            });
        } else {
          // API service not available
          const message = blessed.message({
            parent: detailBox.screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' Error ',
            tags: true,
            keys: true,
            hidden: true
          });
          
          message.display('API service not available', 3);
        }
      });
    }
  });
  
  // Add keyboard shortcut to view relationship graph (G)
  detailBox.key(['g'], () => {
    if (state.selectedIssueId) {
      state.setViewMode(ViewMode.RELATIONSHIP_GRAPH);
    }
  });

  // Add footer text to show available shortcuts
  const relationshipShortcuts = blessed.text({
    parent: detailBox,
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '{bold}Relationships:{/bold} (P)arent, (B)locking, (R)elated, (G)raph',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Initial state
  detailBox.hide();
}