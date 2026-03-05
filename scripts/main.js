const driverMap = {};
const grandPrix = [];

async function main() {
    const standingsTable = document.getElementById("standings-table");
    await fetchDriverInfo();
    await fetchGrandPrix();
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
    let url = "https://api.openf1.org/v1/drivers?session_key=11465"
    allDriverNbrs.forEach(nbr => {
        url += `&driver_number=${nbr}`;
    });
    data = await cachefetch(url);

    data.forEach(driver => {
        driverMap[driver.driver_number] = driver;
    });
}

async function fetchGrandPrix() {
    let data = await cachefetch(`https://api.openf1.org/v1/meetings?year=${year}`);
    data.forEach(meeting => {
        if (meeting.meeting_name.toLowerCase().includes("grand prix")) {
            grandPrix.push(meeting);
        }
    });
    grandPrix.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
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
    const headerRow = createChild("tr", table);

    createFilledChild("th", headerRow, "Pos.");
    createFilledChild("th", headerRow, "Player");
    createFilledChild("th", headerRow, "Drivers");

    players.forEach(player => {
        const playerRow = createChild("tr", table);

        const posCol = createFilledChild("td", playerRow, "0");
        posCol.rowSpan = player.drivers.length;
        const nameCol = createFilledChild("td", playerRow, player.name);
        nameCol.rowSpan = player.drivers.length;

        let first = true;
        player.drivers.forEach(driverNbr => {
            if (first) {
                createFilledChild("td", playerRow, driverMap[driverNbr]["name_acronym"]);
                first = false;
            } else {
                const driverRow = createChild("tr", table);
                createFilledChild("td", driverRow, driverMap[driverNbr]["name_acronym"]);
            }
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