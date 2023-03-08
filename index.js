/**
 * # maps.func.zone
 * *Very* simple, on-the-fly image preview/thumbnail/metadata service. Made with glue, earwax, and brain cell (only one).
 * Requires imagemagick to be installed and on the users path.
 */
import { App } from "@tinyhttp/app";
import { renderFile } from "eta";
import sirv from "sirv";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { log } from "./log.js";

const config = {
    port: 3000,
    magick_settings: ["-resize", "640x360"],
}

const data = {
    maps: {},
    last_updated: new Date(0)
};

// Create the data folder if it doesn't exist.
try {
    fs.accessSync("data");
} catch(e) {
    log.warn(`Previews folder does not exist! Creating one now...`);
    fs.mkdirSync("data");
}

// File checking and caching.
const check_file = (file) => {
    const [_, filename, ext] = /(?:(.*)?\.([^.]+))?$/.exec(file);
    switch(ext) {
        case "png": {
            if(!data.maps[filename]) {
                data.maps[filename] = {
                    name: filename,
                    image: `data/${file}`,
                    data: null
                }
            } else {
                data.maps[filename].image = `data/${file}`;
            }
            return;
        }
        case "json": {
            const json = fs.readFileSync(`data/${file}`);
            if(!data.maps[filename]) {
                data.maps[filename] = {
                    name: filename,
                    image: null,
                    data: JSON.parse(json)
                }
            } else {
                data.maps[filename].data = JSON.parse(data);
            }
            return;
        }
    }
}

const files = fs.readdirSync("data/");
for(const file of files) {
    check_file(file);
}

// Watch folder, to detect incoming changes.
// This at the very least works on windows and linux.
fs.watch("data/", { recursive: true }, (type, file) => {
    data.last_updated = new Date();
    try {
        fs.accessSync(`data/${file}`);
    } catch(e) {
        log.info(`File ${file} was deleted; updating memory.`);
        const [_, filename, ext] = /(?:(.*)?\.([^.]+))?$/.exec(file);
        if(ext == "png") {
            delete data.maps[filename].image;
            if(!data.maps[filename].data) {
                delete data.maps[filename];
            }
        } else if(ext == "json") {
            delete data.maps[filename].data;
            if(!data.maps[filename].image) {
                delete data.maps[filename];
            }
        }
        return;
    }
    check_file(file);
});

// Request routing.
const route = (req, res, next) => {
    let route = req.params.route?.toLowerCase();
    let map_name = req.params.map_name?.toLowerCase();
    console.log(route, map_name);
    if(!route || !map_name) {
        // If something wasn't provided, 404.
		res.status(400);
		return res.send("what the hell are you doing pickle chin ass boy");
    }

    // Strip the respective extension if it was provided.
    if(route == "mp") {
        map_name = map_name.split(".png")[0];
    } else if(route == "mt") {
        map_name = map_name.split(".jpg")[0];
    } else if(route == "mm") {
        map_name = map_name.split(".json")[0];
    }

    // Validity checking
	if(!["mp", "mt", "mm"].includes(route)) {
        // If an invalid route is provided, 400 (what are you trying to do? pickle chin ass boy...).
        res.status(400);
        return res.send("400 Bad Request");
    } else if(!data.maps[map_name] ||
        (
            (["mp", "mt"].includes(route) && !data.maps[map_name].image) ||
            (["mm"].includes(route) && !data.maps[map_name].data)
        )
    ) {
        // If the map or metadata doesn't exist, 404. 
        res.status(404);
        return res.send("404 Not Found");
    }

    // At this point, we know what we need to exist exists, so we don't need to do much from hereon.
    switch(route) {
        case "mp": {
            const img = fs.readFileSync(data.maps[map_name].image);
            res.append("Content-Type", "image/png");
            serve(img, res);
            break;
        }
        case "mt": {
            if(data.maps[map_name]._thumbnail) {
                // Check for a cached thumbnail.
                res.append("Content-Type", "image/jpg");
                serve(data.maps[map_name]._thumbnail, res);
                break;
            }
            const img = fs.readFileSync(data.maps[map_name].image);

            // Size down the image to 360p. This currently uses imagemagick to do the work.
            const out = [];
            const magick = spawn("convert", ["png:-", ...config.magick_settings, "jpg:-"]);
            magick.stdout.on("data", (chunk) => out.push(chunk));
            magick.stdout.on("error", (e) => {
                log.error(e);
                magick.kill("SIGHUP");
                res.status(500);
                return res.send("500 Internal Server Error");
            });
            magick.stdout.on("close", () => {
                const buffer = Buffer.concat(out);
                data.maps[map_name]._thumbnail = buffer;
                res.append("Content-Type", "image/jpg");
                return serve(buffer, res);
            });

            magick.stdin.write(img);
            magick.stdin.end();
            break;
        }
        case "mm": {
            res.append("Content-Type", "application/json");
            serve(data.maps[map_name].data, res);
        }
    }
}

// Serves the data to the user.
const serve = (data, res) => {
    res.append("Content-Length", data.length);
    if (Buffer.isBuffer(data)) {
        res.send(data);
    } else if (typeof data === "object") {
        res.send(JSON.stringify(data));
    }
}

const app = new App({
    settings: {
        networkExtensions: true,
        xPoweredBy: true,
    },
    onError: (error, req, res) => {
        res.status(500);
        log.error({
            "ip": req.ip || req.socket.remoteAddress || null,
            "method": req.method,
            "code": res.statusCode,
            "url": req.originalUrl || req.url || null,
            "error": error.name || null,
            "stack": error.stack || null,
        }, error);
        return res.send("500 Internal Server Error");
    },
});

app.engine("eta", renderFile); // Rendering engine for index.

// Logging
app.use((req, res, next) => {
    const time = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - time;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "debug" : "trace";
        log[level]({
            "ip": req.ip || req.socket.remoteAddress || null,
            "method": req.method,
            "code": res.statusCode,
            "url": req.originalUrl || req.url || null,
            "cookies": req.cookies,
            "responseTime": `${ms}ms`,
        }, res.statusMessage);
    });
    next();
});

// Static file serving for css files and stuff.
app.use("/", sirv(path.join(path.dirname(fileURLToPath(import.meta.url)), "public"), {
    dev: true,
}));

// Index page.
app.get("/", (req, res, next) => {
    res.render("pages/index.eta", { data, name: "eta" });
})

// Routing
app.get("/:route/:map_name", route);

app.listen(config.port, () => log.info(`[READY] Web server listening on port ${config.port}`)); // rock and roll
