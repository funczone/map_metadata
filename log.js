import pino from "pino";

const log = pino({
    level: "trace",
    transport: {
        targets: [
            {
                target: "pino-pretty",
                level: "trace",
                options: {
                    ignore: "pid,hostname",
                },
            },
        ],
    },
});

export { log };
