import React, { createContext, useContext, useEffect, useState } from "react";

const ApiContext = createContext();

export const ApiService = ({ children }) => {
    let APIURL = "http://localhost:8001";

    const [roomStatus, setRoomStatus] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [players, setPlayers] = useState([]);

    const fetchPlayers = () => {
        fetch(`${APIURL}/players/all`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setPlayers(data.players);
                });
            }
        });
    };

    const update = () => {
        fetchPlayers();
    };

    const getDefaultConfig = async () => {
        return new Promise((resolve, reject) => {
            fetch(`${APIURL}/room/config`).then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                        resolve(data);
                    });
                }
            });
        });
    };

    const fetchRoomStatus = (attempts = 0) => {
        fetch(`${APIURL}/status`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    console.log(data);
                    if (data.status === "open") {
                        setRoomStatus("open");
                        fetchRoomData();
                    } else if (data.status === "token") {
                        if (attempts < 12) {
                            setTimeout(
                                () => fetchRoomStatus(attempts + 1),
                                200
                            );
                        } else {
                            setRoomStatus("token");
                            stopRoom();
                            alert("Token expirado. Generá uno nuevo.");
                        }
                    } else if (data.status === "closed") {
                        setRoomStatus("closed");
                    }
                });
            }
        });
    };

    const fetchRoomData = () => {
        fetch(`${APIURL}/room`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    console.log(data);
                    setRoomData(data);
                });
            }
        });
    };

    const startRoom = (config) => {
        fetch(`${APIURL}/room/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(config),
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            }
        });
    };

    const stopRoom = () => {
        fetch(`${APIURL}/room/stop`, {
            method: "POST",
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            }
        });
    };

    const startGame = () => {
        fetch(`${APIURL}/game/start`).then((res) => {
            if (res.ok) {
                fetchRoomData();
            } else {
                console.log("Error al iniciar juego");
            }
        });
    };

    const stopGame = () => {
        fetch(`${APIURL}/game/stop`).then((res) => {
            if (res.ok) {
                return;
            } else {
                console.log("Error al detener juego");
            }
        });
    };

    const loadStadium = (stadium) => {
        console.log(JSON.stringify(stadium));
        fetch(`${APIURL}/game/stadium`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ stadium }),
        }).then((res) => {
            if (res.ok) {
                fetchRoomData();
            }
        });
    };

    const kickPlayer = (id, reason = "", ban = false) => {
        fetch(`${APIURL}/game/kick?id=${id}&reason=${reason}&ban=${ban}`).then(
            (res) => {
                console.log(res);
                if (res.ok) {
                    return;
                } else {
                    console.log("Error al kickear");
                }
            }
        );
    };

    const sendMsg = (msg) => {
        fetch(`${APIURL}/game/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ msg }),
        }).then((res) => {
            console.log(msg);
            if (res.ok) {
                return;
            } else {
                console.log("Error al enviar mensaje");
            }
        });
    };

    useEffect(() => {
        if (roomStatus === "open") fetchPlayers();
    }, [roomStatus]);

    useEffect(() => {
        setTimeout(() => {
            fetchPlayers();
        }, 1000);
    }, [players]);

    return (
        <ApiContext.Provider
            value={{
                APIURL,
                fetchPlayers,
                fetchRoomData,
                update,
                roomData,
                fetchRoomStatus,
                getDefaultConfig,
                startRoom,
                startGame,
                stopRoom,
                stopGame,
                loadStadium,
                kickPlayer,
                sendMsg,
                players,
                roomStatus,
                setRoomStatus,
            }}
        >
            {children}
        </ApiContext.Provider>
    );
};

export const useApi = () => {
    return useContext(ApiContext);
};

export default ApiService;