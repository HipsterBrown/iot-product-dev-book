import WiFi from "wifi";
import Net from "net";
import { Server } from "http";
import Preference from "preference";
import SNTP from "sntp";
import Time from "time";
import DNSServer from "dns/server";
import MDNS from "mdns";

function parseBody(requestString) {
  const decodedString = decodeURIComponent(requestString);
  return decodedString.split("&").reduce((result, part) => {
    const [key, value] = part.split("=");
    result[key] = value.replaceAll("+", " ");
    return result;
  }, {});
}

class SetupServer extends Server {
  constructor(setup) {
    super();
    this.setup = setup;
    this.callback = this.callback.bind(this);
  }

  callback(message, value, meta) {
    switch (message) {
      case Server.status:
        trace(`Status: ${value} ${meta}\n`);
        this.path = value;
        this.method = meta;
      case Server.header:
        trace(`Header: ${value} ${meta}\n`);
      case Server.headersComplete:
        trace(`Headers complete: ${value} ${meta}\n`);
        return String;
      case Server.requestFragment:
        trace(`Request fragment: ${value} ${meta}\n`);
      case Server.requestComplete:
        trace(`Request complete: ${value} ${meta}\n`);
        this.requestBody = value;
      case Server.prepareResponse:
        trace("Prepare response\n");
        this.createResponse();
        return this.response;
    }
  }

  get response() {
    return {
      headers: this.headers,
      body: this.body
    };
  }

  createResponse() {
    switch (this.path) {
      case "/":
        if (this.method === "POST") {
          this.connectToNetwork();
        } else if (this.setup.connected) {
          this.getConnectedIndex();
        } else {
          this.getIndex();
        }
    }
  }

  getIndex() {
    this.headers = ["Content-type", "text/html"];
    this.body = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Connect to WiFi</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 2rem;
          }
          label, input {
            display: block;
          }
          input { margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <h1>Welcome to Moddable!</h1>
        <p>Please enter network details to connect.</p>
        <form action="/" method="post">
          <label for="ssid">Network name</label>
          <input type="text" name="ssid" id="ssid" placeholder="e.g. My Cool Wifi" required>
          <label for="password">Password</label>
          <input type="text" name="password" id="password">
          <input type="submit" value="Connect">
        </form>
      </body>
      </html>
    `;
  }

  getConnectedIndex() {
    this.headers = ["Content-type", "text/html"];
    this.body = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Connected to WiFi</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 2rem;
          }
        </style>
      </head>
      <body>
        <h1>Welcome to Moddable!</h1>
        <p>Connected to "${this.setup.ssid}"</p>
        <p>Current time: <time>${new Date().toTimeString()}</time></p>
        <script type="text/javascript">
          const clock = document.querySelector("time");
          setInterval(() => clock.textContent = new Date().toTimeString(), 1000);
        </script>
      </body>
      </html>
    `;
  }

  connectToNetwork() {
    trace(`Connect to network!\n`);
    trace(JSON.stringify(parseBody(this.requestBody)) + "\n");
    const connectionData = parseBody(this.requestBody);
    this.setup.connectToWifi(connectionData);

    this.headers = ["Content-type", "text/html"];
    this.body = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Connecting...</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 2rem;
          }
        </style>
      </head>
      <body>
        <h1>Connecting to network "${connectionData.ssid}"</h1>
        <p>Look at the logs for the new IP.</p>
      </body>
      </html>
    `;
  }
}

class Setup {
  constructor() {
    this.ssid = Preference.get("wifi", "ssid");
    this.password = Preference.get("wifi", "password");
    this.connected = false;
    this.connecting = false;

    if (this.ssid) {
      trace(`Start connecting to ${this.ssid}.\n`);
      this.connectToWifi({ ssid: this.ssid, password: this.password });
    } else if (Net.get("SSID")) {
      trace(`Already connected to network\n`);
      this.ssid = Net.get("SSID");
      this.connected = true;
      this.startNTP();
    } else {
      this.startAP();
    }

    this.startServer();
  }

  startAP() {
    WiFi.accessPoint({ ssid: "Moddable Setup" });
    trace(`Access point started at ${Net.get("IP")}\n`);
    this.dns = new DNSServer((message, value) => {
      if (message === DNSServer.resolve) {
        return Net.get("IP");
      }
    });
    this.startMDNS();
  }

  startServer() {
    this.server = new SetupServer(this);
  }

  startNTP() {
    new SNTP({ host: "pool.ntp.org" }, (message, value) => {
      switch (message) {
        case SNTP.time:
          trace(`Received time ${value}.\n`);
          Time.set(value);
          break;
        case SNTP.retry:
          trace(`Retrying connection...\n`);
          break;
        case SNTP.error:
          trace(`Failed to connect: ${value} \n`);
          break;
      }
    });
  }

  startMDNS() {
    this.mdns = new MDNS({ hostName: "setup" }, (message, value) => {
      switch (message) {
        case MDNS.hostName:
          trace(`MDNS - claimed hostname: ${value}\n`);
          this.hostname = value;
          break;
        case MDNS.retry:
          trace(`MDNS - selected hostname is taken\n`);
          break;
        case MDNS.error:
          trace(`MDNS - failed to claim hostname\n`);
          break;
      }
    });
  }

  connectToWifi({ ssid, password }) {
    this.connecting = true;

    this.wifi = new WiFi({ ssid, password }, message => {
      switch (message) {
        case WiFi.connected:
          trace(`Connected to network: ${ssid}\n`);
          break;
        case WiFi.gotIP:
          trace(`IP address ${Net.get("IP")}\n`);
          this.connecting = false;
          this.connected = true;
          Preference.set("wifi", "ssid", ssid);
          Preference.set("wifi", "password", password);
          trace("Saved network details\n");

          this.dns?.close();
          delete this.dns;

          this.startNTP();
          this.startMDNS();

          break;
        case WiFi.disconnected:
          trace(`Lost connection to ${ssid}\n`);
          this.connecting = false;
          this.connected = false;
          this.startAP();
          break;
      }
    });
  }
}

new Setup();
