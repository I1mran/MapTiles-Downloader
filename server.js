// http server
const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const path = require('path');
// proxy and concurrently
const throng = require("throng");
const proxy = require("http-proxy-middleware");

// config
const {connect, pool} = require('./server/database');
const {pgTiles, getCountryBBOX, getRandomPoints} = require("./server/model");
const {exp_config} = require("./server/config");

// This will only be called once
const startMaster = () => {
    console.log(`Started master`);
}

// This will be called number of server times
const startWorker = id => {
    console.log(`Started worker ${id}`);

    process.on('SIGTERM', () => {
        console.log(`Worker ${id} exiting...`);
        console.log('(cleanup would happen here)');
        process.exit();
    });
}

if (process.env.NODE_ENV !== "production") {
    // configure dotenv
    require("dotenv").config();

}

function server() {
    const app = express();
    app.use(cors());
    // app.use(bodyParser.json());

    // app.use(bodyParser.urlencoded({ extended: true }));
    // applyMiddleware(middleware, app);
    // applyRoutes(routes, app);
    // applyMiddleware(errorHandlers, app);


    // check database connection.
    connect();
    // app.use(proxy("/query/**", {
    //     target: "http://localhost:5000/query",
    //     secure: false,
    //     changeOrigin: true,
    //     ws: true,
    //     router: {
    //         // when request.headers.host == 'dev.localhost:3000',
    //         // override target 'http://www.example.org' to 'http://localhost:8000'
    //         'http://localhost:3000': 'http://localhost:5000',
    //     },
    // }));

    // app.use("/images", express.static(path.join(__dirname, "client", "public", "images")));

    app.get(`/tiles/:layer/:z/:x/:y.pbf`, async (req, res) => {
        // console.log(req.params.layer);

        try {
            const tiles = await pgTiles(req.params.layer, req.params.z, req.params.x, req.params.y);
            // const tile = tiles.rows[0];
            res.setHeader('Content-Type', 'application/x-protobuf');
            if (tiles.length === 0) {
                res.status(204);
            }
            res.send(tiles);
        } catch (err) {
            res.status(404).send({error: err.toString()});
        }
    });



    app.get(`/query/country/:iso3`, async (req, res) => {
        // console.log(req.params.layer);

        try {
            const result = await getCountryBBOX(req.params.iso3);

            if (result.length === 0) {
                res.status(204);
            }
            res.send(result);
        } catch (err) {
            res.status(404).send({error: err.toString()});
        }
    });

    app.get(`/query/points/:name`, async (req, res) => {
        // console.log(req.params.layer);

        try {
            const result = await getRandomPoints(req.params.name);

            if (result.length === 0) {
                res.status(204);
            }
            res.send(result);
        } catch (err) {
            res.status(404).send({error: err.toString()});
        }
    });
    // Serve static assets in production
    if (process.env.NODE_ENV === "production") {
        // Set static folder
        console.log("Production env started");

        app.use(express.static(path.join(__dirname, 'client/build')));

        app.get("*", (req, res) => {
            res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
        });
    } else {
        console.log("Development env started");
        app.get("/", (req, res) => {
            res.send("Welcome to App Server");
        });
    }

    app.listen(exp_config.port_exp, () => {
        console.log("using express on port: " + exp_config.port_exp);
    });
    process.on("uncaughtException", e => {
        console.log(e);
        process.exit(1);
    });
    process.on("unhandledRejection", e => {
        console.log(e);
        process.exit(1);
    });
};

// throng({
//         workers: process.env.WEB_CONCURRENCY || 1,
//         lifetime: Infinity,
//         master: startMaster,
//         start: startWorker
//     },
//     server
// );
server();
