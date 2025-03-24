// Type definitions for neo-blessed
// Comprehensive definitions for blessed terminal UI library

declare module 'neo-blessed' {
  namespace Blessed {
    // Basic node options - fundamental for all widgets
    interface NodeOptions {
      // Position and size
      top?: number | string;
      left?: number | string;
      right?: number | string;
      bottom?: number | string;
      width?: number | string;
      height?: number | string;
      
      // Content
      content?: string;
      label?: string;
      tags?: boolean;
      hidden?: boolean;
      
      // Interactivity
      focusable?: boolean;
      input?: boolean;
      keyable?: boolean;
      keys?: boolean;
      mouse?: boolean;
      vi?: boolean;
      
      // Scrolling
      scrollable?: boolean;
      alwaysScroll?: boolean;
      scrollbar?: {
        ch?: string;
        track?: {
          bg?: string;
        };
        style?: {
          fg?: string;
          bg?: string;
          inverse?: boolean;
        };
      };
      
      // Style
      style?: {
        fg?: string;
        bg?: string;
        bold?: boolean;
        underline?: boolean;
        blink?: boolean;
        inverse?: boolean;
        invisible?: boolean;
        transparent?: boolean;
        border?: {
          fg?: string;
          bg?: string;
        };
        scrollbar?: {
          fg?: string;
          bg?: string;
        };
        selected?: {
          fg?: string;
          bg?: string;
        };
        item?: {
          fg?: string;
          bg?: string;
        };
        focus?: {
          fg?: string;
          bg?: string;
        };
        hover?: {
          fg?: string;
          bg?: string;
        };
      };
      
      // Border
      border?: string | {
        type?: 'line' | 'bg';
        fg?: string;
        bg?: string;
        ch?: string;
        bold?: boolean;
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
      };
      
      // Advanced
      parent?: Node;
      name?: string;
      shadow?: boolean;
      padding?: number | { top: number; right: number; bottom: number; left: number };
      align?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
      autoFocus?: boolean;
      
      // Custom properties
      isDetailView?: boolean;
      isRelationshipGraph?: boolean;
      issueData?: any;
      relationType?: string;
    }

    // Options for List widget
    interface ListOptions extends NodeOptions {
      items?: string[];
      search?: boolean;
      interactive?: boolean;
      mouse?: boolean;
      selected?: number;
      itemFg?: string;
      itemBg?: string;
      dockBorders?: boolean;
    }

    // Options for Text widget
    interface TextOptions extends NodeOptions {
      align?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
      shrink?: boolean;
      wrap?: boolean;
      fill?: boolean;
      content?: string;
    }

    // Options for prompt widget
    interface PromptOptions extends NodeOptions {
      mouse?: boolean;
    }

    // Options for message widget
    interface MessageOptions extends NodeOptions {
      mouse?: boolean;
    }

    // Options for main screen
    interface ScreenOptions {
      smartCSR?: boolean;
      title?: string;
      autoPadding?: boolean;
      cursor?: {
        artificial?: boolean;
        shape?: string;
        blink?: boolean;
        color?: string;
      };
      debug?: boolean;
      dockBorders?: boolean;
      fastCSR?: boolean;
      forceUnicode?: boolean;
      fullUnicode?: boolean;
      tabSize?: number;
      sendFocus?: boolean;
    }

    // Basic widget factory methods
    interface Widgets {
      Box: (options?: NodeOptions) => Widgets.BoxElement;
      List: (options?: ListOptions) => Widgets.ListElement;
      Text: (options?: TextOptions) => Widgets.TextElement;
      Message: (options?: MessageOptions) => Widgets.MessageElement;
      Prompt: (options?: PromptOptions) => Widgets.PromptElement;
    }

    // Base Node interface - common to all elements
    interface Node {
      // Properties
      type: string;
      options: NodeOptions;
      parent: Node | null;
      screen: Screen;
      children: Node[];
      data: any;
      index: number;
      detached: boolean;
      border: any;
      style: any;
      
      // Position and dimensions
      position: { left: number; right: number; top: number; bottom: number; };
      left: number;
      right: number;
      top: number;
      bottom: number;
      width: number;
      height: number;
      aleft: number;
      aright: number;
      atop: number;
      abottom: number;
      awidth: number;
      aheight: number;
      
      // Methods
      // Element management
      append(element: Node): void;
      prepend(element: Node): void;
      insertBefore(element: Node, other: Node): void;
      insertAfter(element: Node, other: Node): void;
      remove(element: Node): void;
      removeChild(element: Node): void;
      detach(): void;
      
      // Content
      setContent(content: string): void;
      getContent(): string;
      setText(content: string): void;
      getText(): string;
      
      // Style
      setLabel(text: string | { text: string, side: 'left' | 'right' | 'top' | 'bottom' }): void;
      getOptionsStyle(): any;
      
      // Rendering
      render(): void;
      parseContent(content: string): string;
      setIndex(index: number): void;
      setFront(): void;
      setBack(): void;
      
      // Positioning
      setPosition(left: number | string, top: number | string, width: number | string, height: number | string): void;
      calcPosition(): void;
      calcCoords(noScroll?: boolean, abs?: boolean): void;
      
      // Visibility
      show(): void;
      hide(): void;
      toggle(): void;
      enable(): void;
      disable(): void;
      
      // Focus management
      focus(): void;
      setFocus(): void;
      hasFocus: boolean;
      
      // Events
      on(event: string, callback: (...args: any[]) => void): void;
      onScreenEvent(event: string, callback: (...args: any[]) => void): void;
      once(event: string, callback: (...args: any[]) => void): void;
      key(key: string | string[], callback: (ch: any, key: any) => void): void;
      
      // Scrolling
      scrollTo(offset: number): void;
      getScroll(): number;
      resetScroll(): void;
      scrollUp(amount?: number): void;
      scrollDown(amount?: number): void;
      
      // Custom properties
      issueData?: any;
      relationType?: string;
      isDetailView?: boolean;
      isRelationshipGraph?: boolean;
      
      // Other common methods
      free(): void;
      destroy(): void;
      setHover?(callback: Function): void;
      emitFocus(): void;
    }

    interface CustomElement extends Node {
      [key: string]: any;
    }

    namespace Widgets {
      interface BoxElement extends Node {
        // Box specific methods if any
      }

      interface ListElement extends Node {
        // List methods
        select(index: number): void;
        move(offset: number): void;
        up(amount?: number): void;
        down(amount?: number): void;
        pick(callback: Function): void;
        
        // List properties
        selected: number;
        items: string[];
        ritems: string[];
        value: string;
        interactive: boolean;
      }

      interface TextElement extends Node {
        // Text specific methods if any
      }

      interface PromptElement extends Node {
        // Prompt methods
        input(text: string, initial: string | null, callback: (err: any, value: string | null) => void): void;
        setInput(value: string): void;
        clearInput(): void;
        readInput(callback: Function): void;
        ask(text: string, callback: Function): void;
      }

      interface MessageElement extends Node {
        // Message methods
        display(text: string, time?: number, callback?: Function): void;
        error(text: string, time?: number, callback?: Function): void;
        log(text: string, time?: number, callback?: Function): void;
      }
    }

    interface Screen extends Node {
      // Screen specific methods
      program: any;
      tput: any;
      
      // Screen management
      render(): void;
      clearRegion(x1: number, x2: number, y1: number, y2: number): void;
      fillRegion(attr: string, ch: string, x1: number, x2: number, y1: number, y2: number): void;
      draw(start: number, end: number): void;
      screenshot(xi?: number, xl?: number, yi?: number, yl?: number): string;
      
      // Focus management
      saveFocus(): void;
      restoreFocus(): void;
      rewindFocus(): void;
      focusPrevious(): void;
      focusNext(): void;
      focusPush(element: Node): void;
      focusPop(): Node;
      
      // Title
      setTitle(title: string): void;
      resetTitle(): void;
      
      // Mouse
      enableMouse(): void;
      disableMouse(): void;
      
      // Key handling
      key(name: string | string[], listener: Function): void;
      unkey(name: string, listener: Function): void;
      removeKey(name: string | string[]): void;
      bindKey(name: string | string[], listener: Function): void;
      
      // Event emitting
      emit(event: string, ...args: any[]): void;
      
      // Destruction
      destroy(): void;
      alloc(): void;
      realloc(): void;
      leave(): void;
    }

    interface BlessedModule {
      // Widget constructors
      screen(options?: ScreenOptions): Screen;
      box(options?: NodeOptions): Widgets.BoxElement;
      text(options?: TextOptions): Widgets.TextElement;
      list(options?: ListOptions): Widgets.ListElement;
      prompt(options?: PromptOptions): Widgets.PromptElement;
      message(options?: MessageOptions): Widgets.MessageElement;
      
      // Colors and formatting
      colors: any;
      escape: any;
      stripTags(str: string): string;
      
      // Program
      program(options?: any): any;
      tput: any;
    }
  }

  const blessed: Blessed.BlessedModule;
  export = blessed;
}