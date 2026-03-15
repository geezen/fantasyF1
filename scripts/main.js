const driverMap = new Map();
const sessions = [];

async function main() {
    const standingsTable = document.getElementById("standings-table");
    await fetchSessions();
    await fetchDriverInfo();
    await fetchChampionshipResults();
    sortDrivers();
    sortPlayers();
    fillTable(players, standingsTable);
}

async function fetchSessions() {
    let data = await cachefetch(`https://api.openf1.org/v1/sessions?year=${year}`);
    data.forEach(session => {
        sessions.push(session);
    });
    sessions.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
}

async function fetchDriverInfo() {
    allDriverNbrs = [];
    players.forEach(player => {
        allDriverNbrs.push(...player.drivers);
    });

    console.log(`Fetching info for drivers ${allDriverNbrs}`);
    let url = `https://api.openf1.org/v1/drivers?session_key=${sessions[0].session_key}`
    allDriverNbrs.forEach(nbr => {
        url += `&driver_number=${nbr}`;
    });
    data = await cachefetch(url);

    data.forEach(driver => {
        driverMap.set(driver.driver_number, driver);
    });
}

async function fetchChampionshipResults() {
    const sessionsToCheck = [];

    let latestRaceKey = -1;
    sessions.forEach(session => {
        let hasHappened = new Date(session.date_end) < new Date();
        let isRace = session.session_type == "Race";
        if (hasHappened && isRace) {
            latestRaceKey = session.session_key;
        }
    });
    if (latestRaceKey == -1) {
        console.log(`Unable to find a race that has happened this season`);
    } else {
        sessionsToCheck.push(latestRaceKey);
    }

    latestResultsKey = localStorage.getItem("latestChampionshipResults");
    if (latestResultsKey != null) {
        sessionsToCheck.push(latestResultsKey);
    }

    let data = null;
    for (const session_key of sessionsToCheck) {
        data = await cachefetch(`https://api.openf1.org/v1/championship_drivers?session_key=${session_key}`);
        if (data != null) {
            localStorage.setItem("latestChampionshipResults", latestRaceKey);
            break;
        }
    }

    for (const result of data) {
        if (driverMap.has(result.driver_number)) {
            const driver = driverMap.get(result.driver_number);
            driver.result = result;
        }
    }
}

async function cachefetch(url) {
    const cache_key = "url_cache:" + url;
    let data = JSON.parse(localStorage.getItem(cache_key));
    if (data == null) {
        console.log(`Cache miss for ${url}`);
        const response = await fetch(url);
        data = await response.json();
        if (response.status == 200) {
            localStorage.setItem(cache_key, JSON.stringify(data));
            console.log(data);
        } else {
            console.log(`Response code ${response.status} with detail "${data?.detail ?? "none"}"`);
            return null;
        }
    } else {
        console.log(`Using cached response from ${url}`);
    }
    return data;
}

function fillTable(players, table) {
    // Header row
    const headerRow = createChild("tr", table);
    createFilledChild("th", headerRow, "Pos.");
    createFilledChild("th", headerRow, "Player");
    createFilledChild("th", headerRow, "Drivers");
    createFilledChild("th", headerRow, "Driver pts.");
    createFilledChild("th", headerRow, "Player pts.");

    // Player rows
    players.forEach((player, index) => {
        let first = true;
        const fullRowSpan = player.drivers.length;
        player.drivers.forEach(driverNbr => {
            const playerRow = createChild("tr", table);
            if (first) {
                const posCol = createFilledChild("td", playerRow, index + 1);
                posCol.rowSpan = fullRowSpan;
                const playerNameCol = createFilledChild("td", playerRow, player.name);
                playerNameCol.rowSpan = fullRowSpan;
            }
            let driverData = driverMap.get(driverNbr);
            const driverNameCol = createFilledChild("td", playerRow, driverData["name_acronym"]);
            driverNameCol.style.backgroundColor = `#${driverData["team_colour"]}`;
            createFilledChild("td", playerRow, getDriverPoints(driverNbr));
            if (first) {
                const playerPtsCol = createFilledChild("td", playerRow, player.points);
                playerPtsCol.rowSpan = fullRowSpan;
            }
            first = false;
        });
    });
}

function getDriverPoints(driverNbr) {
    const driverData = driverMap.get(driverNbr);
    return driverData.result?.points_current ?? 0;
}

function createChild(type, parent) {
    const element = document.createElement(type);
    parent.appendChild(element);
    return element;
}

function createFilledChild(type, parent, innerHTML) {
    const element = createChild(type, parent);
    element.innerHTML = innerHTML;
    return element;
}

function sortDrivers() {
    players.forEach(player => {
        player.drivers.sort((a, b) => getDriverPoints(b) - getDriverPoints(a));
    });
}

function sortPlayers() {
    sumPlayerPoints();
    players.sort((a, b) => b.points - a.points);
}

function sumPlayerPoints() {
    players.forEach(player => {
        let points = 0;
        let points15 = 0;
        player.drivers.forEach(driverNbr => {
            let driverPoints = getDriverPoints(driverNbr);
            points += driverPoints;
            if (!topTeams.includes(driverMap.get(driverNbr).team_name)) {
                points15 += driverPoints;
            }
        });
        player.points = points;
        player.points15 = points15;
    });
}

main()