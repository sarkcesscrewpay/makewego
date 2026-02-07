module.exports = {
    apps: [
        {
            name: "bus-connect",
            script: "server.js",
            instances: 1,
            exec_mode: "fork",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            }
        }
    ]
};
