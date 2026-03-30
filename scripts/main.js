const driverMap = new Map();
const sessions = [];
const completedRaces = [];
const standingsTable = document.getElementById("standings-table");
const roundTabsContainer = document.getElementById("round-tabs");

async function main() {
    await fetchSessions();
    await fetchDriverInfo();
    await fetchChampionshipResults();
    sumPlayerPoints();
    sortOrderF1();
    fillStandingsTable();
    renderRoundTabs();
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
            if (session.session_name == "Race") {
                completedRaces.push(session);
            }
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
            localStorage.setItem("latestChampionshipResults", session_key);
            break;
        }
    }

    for (const result of data ?? []) {
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

function fillStandingsTable() {
    // Header row
    const headerRow = createChild("tr", standingsTable);
    createFilledChild("th", headerRow, "Pos.");
    createFilledChild("th", headerRow, "Player");
    createFilledChild("th", headerRow, "Drivers");
    createFilledChild("th", headerRow, "Driver pts.");
    const f1col = createFilledChild("th", headerRow, "F1 pts.");
    f1col.classList.add("f1");
    f1col.addEventListener("click", showOrderF1)
    const f15col = createFilledChild("th", headerRow, "F1.5 pts.");
    f15col.classList.add("f15");
    f15col.addEventListener("click", showOrderF15)

    // Player rows
    players.forEach((player, index) => {
        let first = true;
        const fullRowSpan = player.drivers.length;
        player.drivers.forEach(driverNbr => {
            const playerRow = createChild("tr", standingsTable);
            if (first) {
                const posCol = createFilledChild("td", playerRow, index + 1);
                posCol.rowSpan = fullRowSpan;
                const playerNameCol = createFilledChild("td", playerRow, player.name);
                playerNameCol.rowSpan = fullRowSpan;
            }
            let driverData = driverMap.get(driverNbr);
            const driverNameCol = createFilledChild("td", playerRow, driverData["name_acronym"]);
            driverNameCol.style.backgroundColor = `#${driverData["team_colour"]}`;
            const driverPtsCol = createFilledChild("td", playerRow, getDriverPoints(driverNbr));
            if (isTopTeamDriver(driverData)) {
                driverPtsCol.classList.add("onlyF1");
            } 
            if (first) {
                const playerPtsCol = createFilledChild("td", playerRow, player.points);
                playerPtsCol.classList.add("onlyF1");
                playerPtsCol.rowSpan = fullRowSpan;
                const player15PtsCol = createFilledChild("td", playerRow, player.points15);
                player15PtsCol.classList.add("onlyF15");
                player15PtsCol.rowSpan = fullRowSpan;
            }
            first = false;
        });
    });
}

function showOrderF1() {
    standingsTable.innerHTML = "";
    standingsTable.dataset.mode = "f1";
    sortOrderF1();
    fillStandingsTable();
}

function showOrderF15() {
    standingsTable.innerHTML = "";
    standingsTable.dataset.mode = "f15";
    sortOrderF15();
    fillStandingsTable();
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

function sortOrderF1() {
    players.sort((a, b) => b.points - a.points);
    players.forEach(player => {
        player.drivers.sort((a, b) => getDriverPoints(b) - getDriverPoints(a));
    });
}

function sortOrderF15() {
    players.sort((a, b) => b.points15 - a.points15);
    players.forEach(player => {
        player.drivers.sort((a, b) => {
            const aPts = isTopTeamDriver(a) ? getDriverPoints(a) - 1000 : getDriverPoints(a);
            const bPts = isTopTeamDriver(b) ? getDriverPoints(b) - 1000 : getDriverPoints(b);
            return bPts - aPts;
        });
    });
}

function sumPlayerPoints() {
    players.forEach(player => {
        let points = 0;
        let points15 = 0;
        player.drivers.forEach(driverNbr => {
            let driverPoints = getDriverPoints(driverNbr);
            points += driverPoints;
            if (!isTopTeamDriver(driverNbr)) {
                points15 += driverPoints;
            }
        });
        player.points = points;
        player.points15 = points15;
    });
}

function isTopTeamDriver(inp) {
    const driver = typeof inp === 'object' ? inp : driverMap.get(inp);
    return topTeams.includes(driver.team_name);
}

function renderRoundTabs() {
    completedRaces.forEach((race, index) => {
        const btn = document.createElement("button");
        btn.textContent = `R${index + 1}`;
        btn.title = race.location;
        btn.addEventListener("click", () => loadRound(race, btn));
        roundTabsContainer.appendChild(btn);
    });
    const last = roundTabsContainer.lastElementChild;
    if (last) last.classList.add("active");
    if (completedRaces.length > 0) {
        document.querySelector("h2").textContent = `Fantasy F1 Standings — ${completedRaces[completedRaces.length - 1].location}`;
    }
}

async function loadRound(race, activeBtn) {
    for (const driver of driverMap.values()) delete driver.result;

    let data = await cachefetch(`https://api.openf1.org/v1/championship_drivers?session_key=${race.session_key}`);
    for (const result of data ?? []) {
        if (driverMap.has(result.driver_number)) {
            driverMap.get(result.driver_number).result = result;
        }
    }

    sumPlayerPoints();
    if (standingsTable.dataset.mode === "f15") sortOrderF15(); else sortOrderF1();
    standingsTable.innerHTML = "";
    fillStandingsTable();

    roundTabsContainer.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");

    document.querySelector("h2").textContent = `Fantasy F1 Standings — ${race.location}`;
}

main();