import * as vscode from "vscode";
const KEY = "spotify-controller-access-token";
export class TokenManager {
  static globalState: vscode.Memento;
  static setToken(token: string) {
    const slimToken: string = token.slice(13, token.length);

    return this.globalState.update(KEY, slimToken);
  }
  //if key undefined return undefined
  static getToken(): string | undefined {
    return this.globalState.get(KEY);
  }
}
