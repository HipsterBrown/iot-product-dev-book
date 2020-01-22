/*
 * Copyright (c) 2016-2019 Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 * 
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

import Poco from "commodetto/Poco";

let poco = new Poco(screen);
let white = poco.makeColor(255, 255, 255);
poco.begin();
	poco.fillRectangle(white, 0, 0, poco.width, poco.height);
poco.end();