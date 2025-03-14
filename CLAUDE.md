# Claude Assistant Guidelines

## Build & Test Commands
- Install: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Format code: `npm run format`
- Run all tests: `npm test`
- Run single test: `npm test -- -t "test name"`

## Project Context
- Linear GraphQL API integration for cross-team issue queries
- MCP server for backlog management and reporting
- Supports filtering by team, creator, assignee, project, initiative
- Focus on improving labeling and issue organization
- Report generation for tracking metrics and consistency

## Code Style Guidelines
- **Formatting**: Use Prettier with default settings
- **Types**: Use TypeScript with strict mode enabled
- **GraphQL**: Use typed queries with code generation
- **Imports**: Group imports (node, libraries, internal) with blank line between groups
- **Naming**: 
  - Classes/Types: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Error handling**: Use try/catch with specific error types
- **API Endpoints**: RESTful design with consistent response structure
- **Response Format**: All API responses follow { success: boolean, data: any } structure