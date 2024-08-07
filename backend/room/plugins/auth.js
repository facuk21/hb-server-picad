module.exports = function (API) {
    const {
        OperationType,
        VariableType,
        ConnectionState,
        AllowFlags,
        Direction,
        CollisionFlags,
        CameraFollow,
        BackgroundType,
        GamePlayState,
        Callback,
        Utils,
        Room,
        Replay,
        Query,
        Library,
        RoomConfig,
        Plugin,
        Renderer,
        Errors,
        Language,
        EventFactory,
        Impl,
    } = API;

    Object.setPrototypeOf(this, Plugin.prototype);
    Plugin.call(this, "lmbAuth", true, {
        version: "0.1",
        author: "lombi",
        description: `Autenticación básica para haxball.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        loggedPlayers = [],
        that = this;

    const bcrypt = require("bcryptjs");
    const saltRounds = 10;

    function loginPlayer(player, role) {
        if (!loggedPlayers.includes(player)) {
            loggedPlayers.push(player);
        }
        if (role === 1 || role === 2) {
            that.room.setPlayerAdmin(player.id, true);
        }
    }

    async function validateLogin(password, hash) {
        let res = await bcrypt
            .compare(password, hash)
            .then((res) => {
                return res;
            })
            .catch((err) => {
                console.log(err);
                return false;
            });

        return res;
    }

    this.getAllUsersStats = async () => {
        return new Promise((resolve, reject) => {
            commands
                .getDb()
                .all(
                    `SELECT id, username, score, assists FROM users`,
                    (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows);
                    }
                );
        });
    };

    this.getUserScore = async (username) => {
        return new Promise((resolve, reject) => {
            commands
                .getDb()
                .all(
                    `SELECT score FROM users WHERE username="${username}"`,
                    (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows[0].score);
                    }
                );
        });
    };

    this.getUserAssists = async (username) => {
        return new Promise((resolve, reject) => {
            commands
                .getDb()
                .all(
                    `SELECT assists FROM users WHERE username="${username}"`,
                    (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows[0].assists);
                    }
                );
        });
    };

    this.setUserScore = async (username, score) => {
        commands
            .getDb()
            .run(
                `UPDATE users SET score = ${score} WHERE username="${username}"`,
                (err) => {
                    if (err) console.log(err);
                }
            );
        return score;
    };

    this.setUserAssists = async (username, assists) => {
        commands
            .getDb()
            .run(
                `UPDATE users SET assists = ${assists} WHERE username="${username}"`,
                (err) => {
                    if (err) console.log(err);
                }
            );
        return assists;
    };

    this.getLoggedPlayers = function () {
        return loggedPlayers;
    };

    this.isPlayerLogged = function (playerId) {
        let logged = false;
        loggedPlayers.forEach((p) => {
            p.id === playerId ? (logged = true) : null;
        });
        return logged;
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de autenticación requiere del plugin de comandos."
            );
        } else {
            try {
                commands.registerCommand(
                    "!",
                    "register",
                    (msg, args) => {
                        if (args.length !== 2) {
                            commands.printchat(
                                "Uso: ' !register <contraseña> <repetir contraseña> '",
                                msg.byId,
                                "error"
                            );
                        } else {
                            if (args[0] === args[1]) {
                                bcrypt
                                    .hash(args[0], saltRounds)
                                    .then((hash) => {
                                        let username = that.room.players.find(
                                            (p) => p.id === msg.byId
                                        ).name;

                                        try {
                                            commands
                                                .getDb()
                                                .all(
                                                    `SELECT * FROM users WHERE username = "${username}"`,
                                                    (err, rows) => {
                                                        if (err) return err;
                                                        let user =
                                                            rows.length > 0
                                                                ? rows[0]
                                                                : null;
                                                        if (!user) {
                                                            let error = false;
                                                            try {
                                                                commands
                                                                    .getDb()
                                                                    .run(
                                                                        `INSERT INTO users (username, password) VALUES ("${username}", "${hash}")`,
                                                                        (
                                                                            err
                                                                        ) => {
                                                                            error = true;
                                                                            console.log(
                                                                                err
                                                                            );
                                                                        }
                                                                    );
                                                                if (!error) {
                                                                    let player =
                                                                        that.room.players.find(
                                                                            (
                                                                                p
                                                                            ) =>
                                                                                p.id ===
                                                                                msg.byId
                                                                        );
                                                                    commands.printchat(
                                                                        "Registrado con éxito. Iniciá la sesión con ' !login '",
                                                                        msg.byId
                                                                    );
                                                                }
                                                            } catch (e) {
                                                                console.log(e);
                                                            }
                                                        } else {
                                                            commands.printchat(
                                                                "El usuario ya está registrado.",
                                                                msg.byId,
                                                                "error"
                                                            );
                                                        }
                                                    }
                                                );
                                        } catch (e) {
                                            console.log(e);
                                        }
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                    });
                            } else {
                                commands.printchat(
                                    "Las contraseñas no coinciden.",
                                    msg.byId,
                                    "error"
                                );
                            }
                        }
                    },
                    "Registrarse. ' !register <contraseña> <repetir contraseña> '"
                );
                commands.registerCommand(
                    "!",
                    "login",
                    (msg, args) => {
                        if (args.length !== 1) {
                            commands.printchat(
                                "Uso: ' !login <contraseña> ' | Para registrarse: ' !register <contraseña> <repetir contraseña> '",
                                msg.byId,
                                "error"
                            );
                        } else {
                            let username = that.room.players.find(
                                (p) => p.id === msg.byId
                            ).name;
                            try {
                                commands
                                    .getDb()
                                    .all(
                                        `SELECT * FROM users WHERE username = "${username}"`,
                                        (err, rows) => {
                                            if (err) return err;
                                            let user =
                                                rows.length > 0
                                                    ? rows[0]
                                                    : null;
                                            if (user) {
                                                validateLogin(
                                                    args[0],
                                                    user.password
                                                ).then((validated) => {
                                                    if (validated) {
                                                        let player =
                                                            that.room.players.find(
                                                                (p) =>
                                                                    p.id ===
                                                                    msg.byId
                                                            );
                                                        loginPlayer(
                                                            player,
                                                            user.role
                                                        );
                                                        commands.printchat(
                                                            `Sesión iniciada. | ${user.score} goles registrados.`,
                                                            msg.byId
                                                        );
                                                    } else {
                                                        commands.printchat(
                                                            "Contraseña incorrecta.",
                                                            msg.byId,
                                                            "error"
                                                        );
                                                    }
                                                });
                                            } else {
                                                commands.printchat(
                                                    "No estás registrado. Usa ' !register <contraseña> <repetir contraseña> '.",
                                                    msg.byId,
                                                    "error"
                                                );
                                            }
                                        }
                                    );
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    },
                    "Inicia sesión. ' !login <contraseña> '"
                );
            } catch (err) {
                console.log(err);
            }
            commands.onPlayerLeaveQueue.push((id) => {
                let loggedPlayer = loggedPlayers.find((p) => p.id === id);
                loggedPlayer
                    ? loggedPlayers.splice(
                          loggedPlayers.indexOf(loggedPlayer),
                          1
                      )
                    : null;
            });
        }
    };
};
