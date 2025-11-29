#!/usr/bin/env node

/**
 * Browser Automation MCP Server
 * Provides browser automation capabilities through Playwright and Chrome DevTools Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';

// Global browser management
let activeBrowser: Browser | null = null;
let activeContext: BrowserContext | null = null;
let activePage: Page | null = null;
let browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium';

/**
 * Available MCP Tools for Browser Automation
 */
const TOOLS: Tool[] = [
  {
    name: "browser_launch",
    description: "Launch a new browser instance. Supports Chromium (default), Firefox, and WebKit.",
    inputSchema: {
      type: "object",
      properties: {
        browser: {
          type: "string",
          enum: ["chromium", "firefox", "webkit"],
          description: "Browser type to launch",
          default: "chromium"
        },
        headless: {
          type: "boolean",
          description: "Run browser in headless mode",
          default: true
        },
        width: {
          type: "number",
          description: "Viewport width",
          default: 1280
        },
        height: {
          type: "number",
          description: "Viewport height",
          default: 720
        }
      }
    }
  },
  {
    name: "browser_navigate",
    description: "Navigate to a specific URL.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to navigate to"
        },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle"],
          description: "When to consider navigation succeeded",
          default: "load"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page.",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page",
          default: false
        },
        type: {
          type: "string",
          enum: ["png", "jpeg"],
          description: "Screenshot image type",
          default: "png"
        }
      }
    }
  },
  {
    name: "browser_click",
    description: "Click an element on the page.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of element to click"
        },
        timeout: {
          type: "number",
          description: "Maximum time to wait for element (ms)",
          default: 30000
        }
      },
      required: ["selector"]
    }
  },
  {
    name: "browser_fill",
    description: "Fill an input field with text.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of input field"
        },
        value: {
          type: "string",
          description: "Text to fill into the field"
        },
        timeout: {
          type: "number",
          description: "Maximum time to wait for element (ms)",
          default: 30000
        }
      },
      required: ["selector", "value"]
    }
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript code in the browser context.",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute"
        }
      },
      required: ["script"]
    }
  },
  {
    name: "browser_get_content",
    description: "Get the HTML content of the current page.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "Optional CSS selector"
        }
      }
    }
  },
  {
    name: "browser_wait_for_selector",
    description: "Wait for an element to appear.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to wait for"
        },
        timeout: {
          type: "number",
          description: "Maximum time to wait (ms)",
          default: 30000
        },
        state: {
          type: "string",
          enum: ["attached", "detached", "visible", "hidden"],
          description: "Wait for element to reach this state",
          default: "visible"
        }
      },
      required: ["selector"]
    }
  },
  {
    name: "browser_pdf",
    description: "Generate a PDF of the current page (Chromium only).",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["A4", "Letter", "Legal"],
          description: "Paper format",
          default: "A4"
        },
        landscape: {
          type: "boolean",
          description: "Paper orientation",
          default: false
        }
      }
    }
  },
  {
    name: "browser_go_back",
    description: "Navigate back in browser history.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_go_forward",
    description: "Navigate forward in browser history.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_reload",
    description: "Reload the current page.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_get_cookies",
    description: "Get all cookies.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Optional URLs"
        }
      }
    }
  },
  {
    name: "browser_set_cookie",
    description: "Set a cookie.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Cookie name"
        },
        value: {
          type: "string",
          description: "Cookie value"
        },
        domain: {
          type: "string",
          description: "Cookie domain"
        },
        path: {
          type: "string",
          description: "Cookie path",
          default: "/"
        }
      },
      required: ["name", "value"]
    }
  },
  {
    name: "browser_close",
    description: "Close the browser.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_get_title",
    description: "Get the title of the current page.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_get_url",
    description: "Get the URL of the current page.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

const server = new Server(
  {
    name: "browser-automation-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function ensureBrowser(options?: any): Promise<void> {
  if (!activeBrowser) {
    const browserOpts = {
      headless: options?.headless ?? true,
    };

    switch (options?.browser || 'chromium') {
      case 'firefox':
        activeBrowser = await firefox.launch(browserOpts);
        browserType = 'firefox';
        break;
      case 'webkit':
        activeBrowser = await webkit.launch(browserOpts);
        browserType = 'webkit';
        break;
      default:
        activeBrowser = await chromium.launch(browserOpts);
        browserType = 'chromium';
    }

    activeContext = await activeBrowser.newContext({
      viewport: {
        width: options?.width || 1280,
        height: options?.height || 720
      }
    });

    activePage = await activeContext.newPage();
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "browser_launch": {
        if (activeBrowser) {
          await activeBrowser.close();
          activeBrowser = null;
          activeContext = null;
          activePage = null;
        }

        await ensureBrowser(args);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `${(args as any)?.browser || 'chromium'} browser launched successfully`,
              headless: (args as any)?.headless ?? true,
              viewport: {
                width: (args as any)?.width || 1280,
                height: (args as any)?.height || 720
              }
            }, null, 2)
          }]
        };
      }

      case "browser_navigate": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const navArgs = args as { url: string; waitUntil?: string };
        const waitUntil = navArgs.waitUntil || 'load';
        await activePage.goto(navArgs.url, { waitUntil: waitUntil as any });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              url: navArgs.url,
              title: await activePage.title()
            }, null, 2)
          }]
        };
      }

      case "browser_screenshot": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const screenshotArgs = args as { fullPage?: boolean; type?: 'png' | 'jpeg' } | undefined;
        const screenshot = await activePage.screenshot({
          fullPage: screenshotArgs?.fullPage || false,
          type: (screenshotArgs?.type as 'png' | 'jpeg') || 'png'
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              screenshot: screenshot.toString('base64'),
              type: screenshotArgs?.type || 'png',
              fullPage: screenshotArgs?.fullPage || false
            }, null, 2)
          }]
        };
      }

      case "browser_click": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const clickArgs = args as { selector: string; timeout?: number };
        await activePage.click(clickArgs.selector, {
          timeout: clickArgs.timeout || 30000
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'clicked',
              selector: clickArgs.selector
            }, null, 2)
          }]
        };
      }

      case "browser_fill": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const fillArgs = args as { selector: string; value: string; timeout?: number };
        await activePage.fill(fillArgs.selector, fillArgs.value, {
          timeout: fillArgs.timeout || 30000
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'filled',
              selector: fillArgs.selector,
              value: fillArgs.value
            }, null, 2)
          }]
        };
      }

      case "browser_evaluate": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const evalArgs = args as { script: string };
        const result = await activePage.evaluate(evalArgs.script);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              result: result
            }, null, 2)
          }]
        };
      }

      case "browser_get_content": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const contentArgs = args as { selector?: string } | undefined;
        let content: string;
        if (contentArgs?.selector) {
          const element = await activePage.$(contentArgs.selector);
          if (!element) throw new Error(`Element not found: ${contentArgs.selector}`);
          content = await element.innerHTML();
        } else {
          content = await activePage.content();
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              content: content,
              selector: contentArgs?.selector || 'full page'
            }, null, 2)
          }]
        };
      }

      case "browser_wait_for_selector": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const waitArgs = args as { selector: string; timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' };
        await activePage.waitForSelector(waitArgs.selector, {
          timeout: waitArgs.timeout || 30000,
          state: waitArgs.state || 'visible'
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              selector: waitArgs.selector,
              state: waitArgs.state || 'visible'
            }, null, 2)
          }]
        };
      }

      case "browser_pdf": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");
        if (browserType !== 'chromium') {
          throw new Error("PDF generation is only supported in Chromium");
        }

        const pdfArgs = args as { format?: 'A4' | 'Letter' | 'Legal'; landscape?: boolean } | undefined;
        const pdf = await activePage.pdf({
          format: pdfArgs?.format || 'A4',
          landscape: pdfArgs?.landscape || false
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              pdf: pdf.toString('base64'),
              format: pdfArgs?.format || 'A4',
              landscape: pdfArgs?.landscape || false
            }, null, 2)
          }]
        };
      }

      case "browser_go_back": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        await activePage.goBack();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'navigated back',
              url: activePage.url()
            }, null, 2)
          }]
        };
      }

      case "browser_go_forward": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        await activePage.goForward();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'navigated forward',
              url: activePage.url()
            }, null, 2)
          }]
        };
      }

      case "browser_reload": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        await activePage.reload();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'page reloaded',
              url: activePage.url()
            }, null, 2)
          }]
        };
      }

      case "browser_get_cookies": {
        await ensureBrowser();
        if (!activeContext) throw new Error("No active context");

        const cookieArgs = args as { urls?: string[] } | undefined;
        const cookies = await activeContext.cookies(cookieArgs?.urls);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              cookies: cookies
            }, null, 2)
          }]
        };
      }

      case "browser_set_cookie": {
        await ensureBrowser();
        if (!activeContext) throw new Error("No active context");

        const setCookieArgs = args as { name: string; value: string; domain?: string; path?: string };
        await activeContext.addCookies([{
          name: setCookieArgs.name,
          value: setCookieArgs.value,
          domain: setCookieArgs.domain || new URL(activePage!.url()).hostname,
          path: setCookieArgs.path || '/'
        }]);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              action: 'cookie set',
              name: setCookieArgs.name
            }, null, 2)
          }]
        };
      }

      case "browser_close": {
        if (activeBrowser) {
          await activeBrowser.close();
          activeBrowser = null;
          activeContext = null;
          activePage = null;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: 'Browser closed successfully'
            }, null, 2)
          }]
        };
      }

      case "browser_get_title": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        const title = await activePage.title();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              title: title
            }, null, 2)
          }]
        };
      }

      case "browser_get_url": {
        await ensureBrowser();
        if (!activePage) throw new Error("No active page");

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              url: activePage.url()
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack
        }, null, 2)
      }],
      isError: true
    };
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', async () => {
    if (activeBrowser) {
      await activeBrowser.close();
    }
    process.exit(0);
  });

  console.error("Browser Automation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
