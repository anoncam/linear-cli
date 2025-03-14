import { LinearIssue } from '../types/linear';

interface TeamStats {
  teamId: string;
  teamName: string;
  totalIssues: number;
  issuesByState: Record<string, number>;
  issuesByPriority: Record<string, number>;
  averageTimeToClose: number | null; // in days
  issuesWithoutLabels: number;
  issuesWithoutDescription: number;
}

interface UserStats {
  userId: string;
  userName: string;
  createdIssues: number;
  assignedIssues: number;
  completedIssues: number;
}

export class ReportGenerator {
  generateTeamStats(issues: LinearIssue[]): TeamStats[] {
    const teamMap = new Map<string, LinearIssue[]>();
    
    // Group issues by team
    issues.forEach(issue => {
      const teamId = issue.team.id;
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, []);
      }
      teamMap.get(teamId)?.push(issue);
    });
    
    // Generate stats for each team
    const result: TeamStats[] = [];
    
    teamMap.forEach((teamIssues, teamId) => {
      if (teamIssues.length === 0) return;
      
      const teamName = teamIssues[0].team.name;
      const issuesByState: Record<string, number> = {};
      const issuesByPriority: Record<string, number> = {};
      let completedIssues = 0;
      let totalTimeToClose = 0;
      
      teamIssues.forEach(issue => {
        // Count by state
        const stateName = issue.state.name;
        issuesByState[stateName] = (issuesByState[stateName] || 0) + 1;
        
        // Count by priority
        const priority = issue.priority.toString();
        issuesByPriority[priority] = (issuesByPriority[priority] || 0) + 1;
        
        // Calculate time to close if the issue is completed
        if (issue.state.type === 'completed') {
          completedIssues++;
          const createdDate = new Date(issue.createdAt);
          const closedDate = new Date(issue.updatedAt);
          const timeToClose = (closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24); // in days
          totalTimeToClose += timeToClose;
        }
      });
      
      // Calculate average time to close
      const averageTimeToClose = completedIssues > 0
        ? totalTimeToClose / completedIssues
        : null;
      
      // Count issues without labels or descriptions
      const issuesWithoutLabels = teamIssues.filter(issue => !issue.labels || issue.labels.length === 0).length;
      const issuesWithoutDescription = teamIssues.filter(issue => !issue.description).length;
      
      result.push({
        teamId,
        teamName,
        totalIssues: teamIssues.length,
        issuesByState,
        issuesByPriority,
        averageTimeToClose,
        issuesWithoutLabels,
        issuesWithoutDescription
      });
    });
    
    return result;
  }
  
  generateUserStats(issues: LinearIssue[]): UserStats[] {
    const userMap = new Map<string, {
      userName: string,
      created: LinearIssue[],
      assigned: LinearIssue[],
    }>();
    
    // Process all issues to gather user stats
    issues.forEach(issue => {
      // Process creator
      const creatorId = issue.creator.id;
      const creatorName = issue.creator.name;
      
      if (!userMap.has(creatorId)) {
        userMap.set(creatorId, { 
          userName: creatorName, 
          created: [], 
          assigned: [] 
        });
      }
      
      userMap.get(creatorId)?.created.push(issue);
      
      // Process assignee if exists
      if (issue.assignee) {
        const assigneeId = issue.assignee.id;
        const assigneeName = issue.assignee.name;
        
        if (!userMap.has(assigneeId)) {
          userMap.set(assigneeId, { 
            userName: assigneeName, 
            created: [], 
            assigned: [] 
          });
        }
        
        userMap.get(assigneeId)?.assigned.push(issue);
      }
    });
    
    // Generate stats for each user
    const result: UserStats[] = [];
    
    userMap.forEach((userData, userId) => {
      const completedIssues = userData.assigned.filter(
        issue => issue.state.type === 'completed'
      ).length;
      
      result.push({
        userId,
        userName: userData.userName,
        createdIssues: userData.created.length,
        assignedIssues: userData.assigned.length,
        completedIssues
      });
    });
    
    return result;
  }

  generateLabelingReport(issues: LinearIssue[]): {
    totalIssues: number,
    issuesWithLabels: number,
    issuesWithoutLabels: number,
    labelUsage: Record<string, number>
  } {
    const totalIssues = issues.length;
    const issuesWithLabels = issues.filter(issue => issue.labels && issue.labels.length > 0).length;
    const issuesWithoutLabels = totalIssues - issuesWithLabels;
    
    const labelUsage: Record<string, number> = {};
    
    issues.forEach(issue => {
      if (issue.labels) {
        issue.labels.forEach(label => {
          labelUsage[label.name] = (labelUsage[label.name] || 0) + 1;
        });
      }
    });
    
    return {
      totalIssues,
      issuesWithLabels,
      issuesWithoutLabels,
      labelUsage
    };
  }
}

export default new ReportGenerator();