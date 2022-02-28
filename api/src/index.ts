import express, { Response } from "express";
import request from "request";
import cookieParser from "cookie-parser";
import cors from "cors";
import querystring from "querystring";
import axios from "axios";
const fetch = require("node-fetch");
require("dotenv").config();

var stateKey = "spotify_auth_state";
var generateRandomString = function (length: number) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
var client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
const redirect_uri = process.env.SPOTIFY_REDIRECT_URL;

const main = async () => {
  const app = express();
  app
    .use(express.static(__dirname + "/public"))
    .use(cors({ origin: "*" }))
    .use(cookieParser());

  app.get("/", async (_, res: Response) => {
    res.send("hello");
  });

  app.get("/me", async (req, res) => {
    //Bearer tokenValue
    const authHeader = req.headers.authorization;
    // console.log("authHeader", authHeader);
    if (!authHeader) {
      res.send({ user: null });
      return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.send({ user: null });
    }

    const config = {
      headers: { Authorization: "Bearer " + token },
    };
    const { data } = await axios.get("https://api.spotify.com/v1/me", config);
    // console.log("data", data);
    return res.send({ user: data });
  });
  app.get("/spotify-login", async (_: any, res: Response) => {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    // your application requests authorization
    var scope =
      "user-read-private user-read-email playlist-modify-private user-read-currently-playing user-modify-playback-state user-read-playback-state streaming app-remote-control";
    res.redirect(
      "https://accounts.spotify.com/authorize?" +
        querystring.stringify({
          response_type: "code",
          client_id: client_id,
          scope,
          redirect_uri,
          state: state,
        })
    );
  });

  app.get("/callback", function (req, res) {
    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
      res.redirect(
        "http://localhost:54321/auth/" +
          querystring.stringify({
            error: "state_mismatch",
          })
      );
    } else {
      res.clearCookie(stateKey);
      var authOptions = {
        url: "https://accounts.spotify.com/api/token",
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        },
        headers: {
          Authorization:
            "Basic " +
            new Buffer(client_id + ":" + client_secret).toString("base64"),
        },
        json: true,
      };

      request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          var access_token = body.access_token,
            refresh_token = body.refresh_token;

          var options = {
            url: "https://api.spotify.com/v1/me",
            headers: { Authorization: "Bearer " + access_token },
            json: true,
          };

          // use the access token to access the Spotify Web API
          request.get(options, function (_error, _response: any, body) {
            console.log(body);
          });

          // we can also pass the token to the browser to make requests from there
          res.redirect(
            "http://localhost:54321/auth/" +
              querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token,
              })
          );
        } else {
          res.redirect(
            "http://localhost:54321/auth/" +
              querystring.stringify({
                error: "invalid_token",
              })
          );
        }
      });
    }
  });
  // const getToken = async () => {

  // }
  app.get("/refresh_token", function (req, res) {
    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64"),
      },
      form: {
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token;
        res.send({
          access_token: access_token,
        });
      }
    });
  });

  app.get("/currently-listening-to", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.send({ user: null });
      return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.send({ user: null });
    }
    const config = {
      headers: { Authorization: "Bearer " + token },
    };
    const { data } = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      config
    );
    // console.log("data", data);
    return res.send({ listeningTo: data });
  });
  app.get("/play-next", async (req, res) => {
    const authHeader = req.headers.authorization;
    // console.log("authHeader", authHeader);
    if (!authHeader) {
      res.send("No token");
      return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.send("Something went wrong");
    }

    await fetch("https://api.spotify.com/v1/me/player/next", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    // const response = await fetch(
    //   "https://api.spotify.com/v1/me/player/currently-playing",
    //   {
    //     method: "GET",
    //     headers: {
    //       "content-type": "application/json",
    //       Authorization: "Bearer " + token,
    //     },
    //   }
    // );
    const config = {
      headers: { Authorization: "Bearer " + token },
    };
    const { data } = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      config
    );

    return res.send({ listeningTo: data });
  });
  app.get("/play-previous", async (req, res) => {
    const authHeader = req.headers.authorization;
    // console.log("authHeader", authHeader);
    if (!authHeader) {
      res.send("No token");
      return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.send("Something went wrong");
    }

    await fetch("https://api.spotify.com/v1/me/player/previous", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    const config = {
      headers: { Authorization: "Bearer " + token },
    };
    const { data } = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      config
    );

    return res.send({ listeningTo: data });
  });
  app.get("/pause-playback", async (req, res) => {
    const authHeader = req.headers.authorization;
    // console.log("authHeader", authHeader);
    if (!authHeader) {
      res.send("No token");
      return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.send("Something went wrong");
    }

    await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    const config = {
      headers: { Authorization: "Bearer " + token },
    };
    const { data } = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      config
    );

    return res.send({ listeningTo: data });
  });

  app.listen(3000, () => {
    console.log("Listening on localhost:3000");
  });
};

main();
