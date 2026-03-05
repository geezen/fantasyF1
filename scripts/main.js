function main() {
    const standingsTable = document.getElementById("standings-table");
    fillTable(players, standingsTable);
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