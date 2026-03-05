async function main() {
    await fetchDriverInfo();
    const standingsTable = document.getElementById("standings-table");
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
    players.forEach(player => {
        const playerRow = document.createElement("tr");

        const nameCol = document.createElement("td");
        nameCol.innerHTML = player.name;
        playerRow.appendChild(nameCol);

        const driversCol = document.createElement("td");
        const driversSubTable = document.createElement("table");
        player.drivers.forEach(driver => {
            const driverRow = document.createElement("tr");

            const nbrCol = document.createElement("td");
            nbrCol.innerHTML = driver;

            driverRow.appendChild(nbrCol);
            driversSubTable.appendChild(driverRow)
        });
        driversCol.appendChild(driversSubTable);
        playerRow.appendChild(driversCol);
        
        table.appendChild(playerRow);
    });
}

main()