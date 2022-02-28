import * as vscode from "vscode";
import { apiBaseUrl } from "./constants";
import * as polka from "polka";
import { TokenManager } from "./TokenManager";

export const authenticate = () => {
  //initiate polka server
  const app = polka();
  app.get(`/auth/:token`, async (req, res) => {
    const { token } = req.params;
    if (!token) {
      res.end(`<h1>Something went wrong</h1>`);
      return;
    }
    //comes in like = accesstoken=xyz

    await TokenManager.setToken(token);
    //access to access_token
    //
    res.end("<h1>Auth was successful, you can close this now</h1>");
    app.server.close();
  });
  app.listen(54321, (err: Error) => {
    if (err) {
      vscode.window.showErrorMessage(err.message);
    } else {
      //open url
      vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.parse(`${apiBaseUrl}/spotify-login`)
      );
    }
  });
};
