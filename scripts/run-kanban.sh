#!/bin/bash

# Run the enhanced kanban view with relationship visualization, ignoring TS errors
# Using --transpile-only to bypass TypeScript errors during development
ts-node --transpile-only scripts/linearCli.ts relationships "$@"