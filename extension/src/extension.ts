/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { authenticate } from "./authenticate";
import { TokenManager } from "./TokenManager";
import { apiBaseUrl } from "./constants";
const cats = {
  "Coding Cat": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
  "Testing Cat": "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("spotifyController.start", () => {
      SpotifyController.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spotifyController.authenticate", () => {
      authenticate();
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(SpotifyController.viewType, {
      async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: any
      ) {
        console.log(`Got state: ${state}`);
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        SpotifyController.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, "media"),
      vscode.Uri.joinPath(extensionUri, "public/build"),
    ],
  };
}

/**
 * Manages cat coding webview panels
 */
class SpotifyController {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: SpotifyController | undefined;

  public static readonly viewType = "Spotify Controller";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (SpotifyController.currentPanel) {
      SpotifyController.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      SpotifyController.viewType,
      "Spotify Controller",
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri)
    );

    SpotifyController.currentPanel = new SpotifyController(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    SpotifyController.currentPanel = new SpotifyController(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: "refactor" });
  }

  public dispose() {
    SpotifyController.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    // Vary the webview's content based on where it is located in the editor.
    switch (this._panel.viewColumn) {
      case vscode.ViewColumn.Two:
        this._updateForCat(webview, "Compiling Cat");
        return;

      case vscode.ViewColumn.Three:
        this._updateForCat(webview, "Testing Cat");
        return;

      case vscode.ViewColumn.One:
      default:
        this._updateForCat(webview, "Coding Cat");
        return;
    }
  }

  private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
    this._panel.title = "Spotify Controller";
    this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
  }

  private _getHtmlForWebview(webview: vscode.Webview, catGifPath: string) {
    // Local path to main script run in the webview
    // const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

    // And the uri we use to load this script in the webview
    const scriptUri = vscode.Uri.joinPath(
      this._extensionUri,
      "public",
      "build/bundle.js"
    );

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "vscode.css"
    );

    // Uri to load styles into webview
    // const stylesResetUri = webview.asWebviewUri(styleResetPath);
    // const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
      -->
      <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
        webview.cspSource
      }; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
     
      <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};
      const accessToken = ${JSON.stringify(TokenManager.getToken())};
      const authenticate = ${authenticate()}
      </script>
    </head>
    <body>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// import * as vscode from "vscode";
// import { authenticate } from "./authenticate";
// import { apiBaseUrl } from "./constants";
// import { TokenManager } from "./TokenManager";

// export function activate(context: vscode.ExtensionContext) {
//   TokenManager.globalState = context.globalState;

//   const spotifyController = new SpotifyController(context.extensionUri);

//   const item = vscode.window.createWebviewPanel(
//     "spotifyController",
//     "Spotify-Controller",
//     vscode.ViewColumn.One
//   );

//   context.subscriptions.push(
//     vscode.window.registerWebviewViewProvider(
//       "spotifyController",
//       spotifyController
//     )
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("spotifyController.start", () => {
//       const { activeTextEditor } = vscode.window;

//       if (!activeTextEditor) {
//         vscode.window.showInformationMessage("No active text editor");
//         return;
//       }

//       spotifyController.resolveWebviewView(item);
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("vstodo.helloWorld", () => {
//       vscode.window.showInformationMessage(
//         "token value is: " + TokenManager.getToken()
//       );
//       // HelloWorldPanel.createOrShow(context.extensionUri);
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("vstodo.authenticate", () => {
//       try {
//         authenticate();
//       } catch (err) {
//         console.log(err);
//       }
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("spotifyController.refresh", async () => {
//       // HelloWorldPanel.kill();
//       // HelloWorldPanel.createOrShow(context.extensionUri);
//       await vscode.commands.executeCommand("workbench.action.closeSidebar");
//       await vscode.commands.executeCommand(
//         "workbench.view.extension.vstodo-sidebar-view"
//       );
//       // setTimeout(() => {
//       //   vscode.commands.executeCommand(
//       //     "workbench.action.webview.openDeveloperTools"
//       //   );
//       // }, 500);
//     })
//   );

//   // context.subscriptions.push(
//   //   vscode.commands.registerCommand("vstodo.askQuestion", async () => {
//   //     const answer = await vscode.window.showInformationMessage(
//   //       "How was your day?",
//   //       "good",
//   //       "bad"
//   //     );

//   //     if (answer === "bad") {
//   //       vscode.window.showInformationMessage("Sorry to hear that");
//   //     } else {
//   //       console.log({ answer });
//   //     }
//   //   })
//   // );
// }

// // this method is called when your extension is deactivated
// export function deactivate() {}

// export class SpotifyController implements vscode.WebviewViewProvider {
//   _view?: vscode.WebviewView;

//   constructor(private readonly _extensionUri: vscode.Uri) {}

//   public resolveWebviewView(webviewView: vscode.WebviewView) {
//     this._view = webviewView;

//     webviewView.webview.options = {
//       // Allow scripts in the webview
//       enableScripts: true,

//       localResourceRoots: [this._extensionUri],
//     };

//     webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

//     // webviewView.webview.onDidReceiveMessage(async (data) => {
//     //   switch (data.type) {
//     //     case "logout": {
//     //       TokenManager.setToken("");
//     //       break;
//     //     }
//     //     case "authenticate": {
//     //       authenticate(() => {
//     //         webviewView.webview.postMessage({
//     //           type: "token",
//     //           value: TokenManager.getToken(),
//     //         });
//     //       });
//     //       break;
//     //     }
//     //     case "get-token": {
//     //       webviewView.webview.postMessage({
//     //         type: "token",
//     //         value: TokenManager.getToken(),
//     //       });
//     //       break;
//     //     }
//     //     case "onInfo": {
//     //       if (!data.value) {
//     //         return;
//     //       }
//     //       vscode.window.showInformationMessage(data.value);
//     //       break;
//     //     }
//     //     case "onError": {
//     //       if (!data.value) {
//     //         return;
//     //       }
//     //       vscode.window.showErrorMessage(data.value);
//     //       break;
//     //     }
//     //   }
//     // });
//   }

//   public revive(panel: vscode.WebviewView) {
//     this._view = panel;
//   }

//   private _getHtmlForWebview(webview: vscode.Webview) {
//     const styleResetUri = webview.asWebviewUri(
//       vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
//     );
//     const styleVSCodeUri = webview.asWebviewUri(
//       vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
//     );

//     const scriptUri = webview.asWebviewUri(
//       vscode.Uri.joinPath(this._extensionUri, "public/build", "bundle.js")
//     );
//     // const styleMainUri = webview.asWebviewUri(
//     //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
//     // );

//     // Use a nonce to only allow a specific script to be run.
//     const nonce = getNonce();

//     return `<!DOCTYPE html>
// 			<html lang="en">
// 			<head>
// 				<meta charset="UTF-8">
// 				<!--
// 					Use a content security policy to only allow loading images from https or from our extension directory,
// 					and only allow scripts that have a specific nonce.
//         -->
//         <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
//           webview.cspSource
//         }; script-src 'nonce-${nonce}';">
// 				<meta name="viewport" content="width=device-width, initial-scale=1.0">
// 				<link href="${styleResetUri}" rel="stylesheet">
// 				<link href="${styleVSCodeUri}" rel="stylesheet">

//         <script nonce="${nonce}">
//         const vscode = acquireVsCodeApi();
//         const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};
//         const accessToken = ${JSON.stringify(TokenManager.getToken())};
//         const authenticate = ${authenticate()}
//         </script>
// 			</head>
//       <body>
// 				<script nonce="${nonce}" src="${scriptUri}"></script>
// 			</body>
// 			</html>`;
//   }
// }

// function getNonce() {
//   let text = "";
//   const possible =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   for (let i = 0; i < 32; i++) {
//     text += possible.charAt(Math.floor(Math.random() * possible.length));
//   }
//   return text;
// }

// // public revive(panel: vscode.WebviewView) {
// //   this._view = panel;
// //   // SpotifyController.currentPanel = new SpotifyController(panel, extensionUri);
// // }

// // Local path to css styles
// //  const styleResetPath = vscode.Uri.joinPath(
// //   this._extensionUri,
// //   "media",
// //   "reset.css"
// // );
// // const stylesPathMainPath = vscode.Uri.joinPath(
// //   this._extensionUri,
// //   "media",
// //   "vscode.css"
// // );

// // <script nonce="${nonce}">
// const vscode = acquireVsCodeApi();
// const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};
// const accessToken = ${JSON.stringify(TokenManager.getToken())};
// const authenticate = ${authenticate()}
// // </script>
