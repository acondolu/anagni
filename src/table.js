let colors = [
  ["#AC92EB"],
  ["#4FC1E8"],
  ["#A0D568"],
  ["#FFCE54"],
  ["#ED5564"]
];

function makeTable() {
  let table = document.getElementById("table");
  for (let i=0; i<5; i++) {
    let tr = table.insertRow(i);
    for (let j=0; j<5; j++) {
      let td = tr.insertCell(j);
      td.id = "table-" + i + "-" + j;
      td.innerText = "" + (j+1);
      td.style.color = colors[i];
      if (i < j) td.style.opacity = "0.2";
    }
  }
  console.log(table);
}

function makeUser() {
  let div = document.createElement("div");
  div.className = "player";
  document.getElementById("attempt").appendChild(div);
  div.innerText = "";
  let table = document.createElement("table");
  table.className = "usertable";
  table.innerHTML = '<tr><td class="userNameInTable">Andrea</td><td id="table-0-0" style="color: rgb(172, 146, 235);">1</td><td id="table-0-1" style="color: rgb(172, 146, 235); opacity: 0.2;">2</td><td id="table-0-2" style="color: rgb(172, 146, 235); opacity: 0.2;">3</td><td id="table-0-3" style="color: rgb(172, 146, 235); opacity: 0.2;">4</td><td id="table-0-4" style="color: rgb(172, 146, 235); opacity: 0.2;">5</td></tr>';
  div.appendChild(table);
}

window.onload = function() {
  makeTable();
  makeUser();
}