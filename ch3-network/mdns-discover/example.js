/*
 * Copyright (c) 2016-2020 Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */
import MDNS from "mdns";
import { Request } from "http";

class FetchServiceHeaders extends Request {
  constructor({ address: host, port }) {
    super({
      host,
      port
    });
  }

  callback = function (message, value, meta) {
    switch (message) {
      case Request.header:
        trace(`  ${value}: ${meta}\n`);
        break;
      case Request.responseComplete:
        trace("\n\n");
        break;
      case Request.error:
        trace("error \n\n");
        break;
    }
  };
}

class ServiceDiscovery extends MDNS {
  constructor(type = "_http._tcp") {
    super();

    this.monitor(type, function (service, instance) {
      trace(
        `Found ${service}: "${instance.name}" @${instance.target} (${instance.address}:${instance.port})\n`
      );
      // new FetchServiceHeaders(instance);
    });
  }
}
new ServiceDiscovery("_http._tcp");

// let mdns = new MDNS;
// mdns.monitor("_http._tcp", function (service, instance) {
// 	trace(`Found ${service}: "${instance.name}" @ ` +
// 		`${instance.target} ` +
// 		`(${instance.address}:${instance.port})\n`);
//
// 	let request = new Request({
// 		host: instance.address,
// 		port: instance.port,
// 		path: "/"
// 	});
// 	request.callback = function(msg, value, etc) {
// 		if (Request.header === msg)
// 			trace(`  ${value}: ${etc}\n`);
// 		else if (Request.responseComplete === msg)
// 			trace("\n\n");
// 		else if (Request.error === msg)
// 			trace("error \n\n");
// 	};
// });
