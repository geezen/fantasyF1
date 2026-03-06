const driverMap = new Map();
const grandPrix = [];

async function main() {
    const standingsTable = document.getElementById("standings-table");
    await fetchDriverInfo();
    await fetchGrandPrix();
    await new Promise(r => setTimeout(r, 1000));
    await fetchChampionshipResults();
    fillTable(players, standingsTable);
}

async function fetchDriverInfo() {
    let data = await cachefetch(`https://api.openf1.org/v1/sessions?year=${year}`);
    const sessionKey = data[0].session_key;
    console.log(`A session_key for ${year} is ${sessionKey}`);

    allDriverNbrs = [];
    players.forEach(player => {
        allDriverNbrs.push(...player.drivers);
    });

    console.log(`Fetching info for drivers ${allDriverNbrs}`);
    let url = `https://api.openf1.org/v1/drivers?session_key=${sessionKey}`
    allDriverNbrs.forEach(nbr => {
        url += `&driver_number=${nbr}`;
    });
    data = await cachefetch(url);

    data.forEach(driver => {
        driverMap.set(driver.driver_number, driver);
    });
}

async function fetchGrandPrix() {
    const data = await cachefetch(`https://api.openf1.org/v1/meetings?year=${year}`);
    data.forEach(meeting => {
        if (meeting.meeting_name.toLowerCase().includes("grand prix")) {
            grandPrix.push(meeting);
        }
    });
    grandPrix.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
}

async function fetchChampionshipResults() {
    // TODO, fix url
    const data = await cachefetch(`https://api.openf1.org/v1/championship_drivers?meeting_key=1276`);
    data.forEach(result => {
        if (driverMap.has(result.driver_number)) {
            const driver = driverMap.get(result.driver_number);
            driver.result = result;
        }
    });
}

async function cachefetch(url) {
    const cache_key = "url_cache:" + url;
    let data = JSON.parse(localStorage.getItem(cache_key));
    if (data == null) {
        console.log(`Cache miss for ${url}`);
        const response = await fetch(url);
        data = await response.json();
        localStorage.setItem(cache_key, JSON.stringify(data));
        console.log(data);
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
    grandPrix.forEach(gp => {
        const innerHTML = `${gp.country_code}<br><img src=${gp.country_flag} height=12>`;
        createFilledChild("th", headerRow, innerHTML);
    });
    createFilledChild("th", headerRow, "Points");

    // Player rows
    players.forEach(player => {
        let first = true;
        player.drivers.forEach(driverNbr => {
            const playerRow = createChild("tr", table);
            if (first) {
                const posCol = createFilledChild("td", playerRow, "0");
                posCol.rowSpan = player.drivers.length;
                const nameCol = createFilledChild("td", playerRow, player.name);
                nameCol.rowSpan = player.drivers.length;
                first = false;
            }
            driverData = driverMap.get(driverNbr);
            console.log(driverData, driverNbr);
            const nameTd = createFilledChild("td", playerRow, driverData["name_acronym"]);
            nameTd.style.backgroundColor = `#${driverData["team_colour"]}`;
            grandPrix.forEach(gp => {
                createFilledChild("td", playerRow, "&nbsp;");
            });
            const points = driverData.result.points_current;
            createFilledChild("td", playerRow, points);
        });
    });
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

main()