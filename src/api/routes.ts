import { Router } from 'express';
import linearClient from '../services/linearClient';
import reportGenerator from '../utils/reportGenerator';
import ClaudeIntegration from '../utils/claudeIntegration';
import { IssueQueryParams } from '../types/linear';

const router = Router();

// Create Claude integration instance
const claudeIntegration = new ClaudeIntegration({
  apiUrl: process.env.API_URL || 'http://localhost:3000'
});

// Get issues with filtering
router.get('/issues', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params: IssueQueryParams = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      creators: parseArray(req.query.creators as string | string[] | undefined),
      assignees: parseArray(req.query.assignees as string | string[] | undefined),
      projects: parseArray(req.query.projects as string | string[] | undefined),
      labels: parseArray(req.query.labels as string | string[] | undefined),
      states: parseArray(req.query.states as string | string[] | undefined),
      priorities: req.query.priorities ? (req.query.priorities as string).split(',').map(Number) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const issues = await linearClient.getIssues(params);
    res.json({ success: true, data: issues });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch issues' });
  }
});

// Get all teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await linearClient.getTeams();
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teams' });
  }
});

// Get all projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await linearClient.getProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await linearClient.getUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get all labels
router.get('/labels', async (req, res) => {
  try {
    const labels = await linearClient.getLabels();
    res.json({ success: true, data: labels });
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch labels' });
  }
});

// Get team labels
router.get('/teams/:teamId/labels', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const labels = await linearClient.getTeamLabels(teamId);
    res.json({ success: true, data: labels });
  } catch (error) {
    console.error('Error fetching team labels:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team labels' });
  }
});

// Get workflow states (all or by team)
router.get('/workflow-states', async (req, res) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const states = await linearClient.getWorkflowStates(teamId);
    res.json({ success: true, data: states });
  } catch (error) {
    console.error('Error fetching workflow states:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow states' });
  }
});

// Generate team stats report
router.get('/reports/team-stats', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params: IssueQueryParams = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const issues = await linearClient.getIssues(params);
    const teamStats = reportGenerator.generateTeamStats(issues);
    
    res.json({ success: true, data: teamStats });
  } catch (error) {
    console.error('Error generating team stats:', error);
    res.status(500).json({ success: false, error: 'Failed to generate team stats' });
  }
});

// Generate user stats report
router.get('/reports/user-stats', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params: IssueQueryParams = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const issues = await linearClient.getIssues(params);
    const userStats = reportGenerator.generateUserStats(issues);
    
    res.json({ success: true, data: userStats });
  } catch (error) {
    console.error('Error generating user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to generate user stats' });
  }
});

// Generate labeling report
router.get('/reports/labeling', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params: IssueQueryParams = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const issues = await linearClient.getIssues(params);
    const labelingReport = reportGenerator.generateLabelingReport(issues);
    
    res.json({ success: true, data: labelingReport });
  } catch (error) {
    console.error('Error generating labeling report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate labeling report' });
  }
});

// Claude-specific endpoints for formatted output
router.get('/claude/issues', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params: IssueQueryParams = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      creators: parseArray(req.query.creators as string | string[] | undefined),
      assignees: parseArray(req.query.assignees as string | string[] | undefined),
      projects: parseArray(req.query.projects as string | string[] | undefined),
      labels: parseArray(req.query.labels as string | string[] | undefined),
      states: parseArray(req.query.states as string | string[] | undefined),
      priorities: req.query.priorities ? (req.query.priorities as string).split(',').map(Number) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const formattedOutput = await claudeIntegration.getIssuesForClaude(params);
    res.type('text/markdown').send(formattedOutput);
  } catch (error) {
    console.error('Error getting issues for Claude:', error);
    res.status(500).send('Error formatting issues for Claude');
  }
});

router.get('/claude/team-report', async (req, res) => {
  try {
    // Parse arrays from query parameters
    const parseArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.includes(',') ? param.split(',') : [param];
    };
    
    const params = {
      teams: parseArray(req.query.teams as string | string[] | undefined),
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const formattedOutput = await claudeIntegration.getTeamReportForClaude(params);
    res.type('text/markdown').send(formattedOutput);
  } catch (error) {
    console.error('Error getting team report for Claude:', error);
    res.status(500).send('Error formatting team report for Claude');
  }
});

export default router;