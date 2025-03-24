// Type definitions for neo-blessed
// Extending the blessed type definitions with additional properties needed for our app

import * as blessed from 'blessed';

declare module 'neo-blessed' {
  export = blessed;
}

declare namespace blessed {
  namespace Widgets {
    interface Screen {
      destroy(): void;
    }

    interface BoxElement {
      isDetailView?: boolean;
      isRelationshipGraph?: boolean;
      issueData?: any;
      relationType?: string;
    }

    interface BoxOptions {
      label?: string;
    }
  }
}