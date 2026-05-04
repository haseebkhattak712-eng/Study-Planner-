let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let filterDate = null;

let chart = null;
let time = 1500;
let timerInterval = null;

/* ---------------- SAVE ---------------- */
function save() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

/* ---------------- THEME ---------------- */
function toggleDarkMode() {
    document.body.classList.toggle("light");
    localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
}

function loadTheme() {
    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light");
    }
}

/* ---------------- TASKS ---------------- */
function addTask() {
    let text = document.getElementById("taskInput").value;
    let subject = document.getElementById("subject").value;
    let date = document.getElementById("date").value;
    let priority = document.getElementById("priority").value;

    if (!text) return;

    tasks.push({ text, subject, date, priority, completed: false });
    save();

    document.getElementById("taskInput").value = "";
    document.getElementById("subject").value = "";
    document.getElementById("date").value = "";
    document.getElementById("priority").value = "Low";
    document.getElementById("taskInput").focus();

    renderTasks();
}

/* ---------------- DEADLINE ---------------- */
function checkDeadline(taskDate) {
    if (!taskDate) return "";

    let today = new Date();
    let due = new Date(taskDate);
    let diff = (due - today) / (1000 * 60 * 60 * 24);

    if (diff <= 1) return "urgent";
    if (diff <= 3) return "soon";
    return "";
}

/* ---------------- RENDER ---------------- */
function renderTasks() {
    let list = document.getElementById("taskList");
    if (!list) return;

    list.innerHTML = "";

    let filtered = tasks
        .map((task, index) => ({ task, index }))
        .filter(({ task }) => {
            if (currentFilter === "completed") return task.completed;
            if (currentFilter === "pending") return !task.completed;
            if (currentFilter === "date") return task.date === filterDate;
            return true;
        });

    filtered.forEach(({ task, index: realIndex }) => {
        let li = document.createElement("li");

        li.classList.add(checkDeadline(task.date));
        if (task.completed) li.classList.add("completed");

        /* DRAG */
        li.draggable = true;
        li.ondragstart = e => e.dataTransfer.setData("text", realIndex);
        li.ondragover = e => e.preventDefault();
        li.ondrop = e => {
            let from = e.dataTransfer.getData("text");
            let temp = tasks[from];
            tasks[from] = tasks[realIndex];
            tasks[realIndex] = temp;
            save();
            renderTasks();
        };

       li.innerHTML = `
    <div class="task-info">
        <b>${task.text}</b><br>
        ${task.subject || ""} | ${task.date || ""}

        <span class="badge priority-${task.priority}">
            ${task.priority}
        </span>
    </div>

    <div class="task-actions">
        <button onclick="toggleTask(${realIndex})">✔</button>
        <button onclick="editTask(${realIndex})">✏</button>
        <button onclick="deleteTask(${realIndex})">❌</button>
    </div>
`;

        list.appendChild(li);
    });

    updateStats();
    updateChart();
    updateAnalytics();
}
/* ---------------- WEEKLY CHART ---------------- */
function updateWeeklyChart() {
    let canvas = document.getElementById("progressChart");
    if (!canvas) return;

    let weekData = [0,0,0,0,0,0,0]; // Mon-Sun

    tasks.forEach(t => {
        if (!t.completed || !t.date) return;

        let d = new Date(t.date).getDay(); 
        weekData[d]++;
    });

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
            datasets: [{
                label: "Completed Tasks",
                data: weekData,
                backgroundColor: "#6c63ff"
            }]
        }
    });
}
/* ---------------- ANALYTICS ---------------- */
function updateAnalytics() {
    let total = tasks.length;
    let done = tasks.filter(t => t.completed).length;
    let pending = total - done;

    let rate = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById("a_total").innerText = total;
    document.getElementById("a_done").innerText = done;
    document.getElementById("a_pending").innerText = pending;
    document.getElementById("a_rate").innerText = rate + "%";
}

/* ---------------- TASK ACTIONS ---------------- */
function toggleTask(i) {
    tasks[i].completed = !tasks[i].completed;

    if (tasks[i].completed) {
        notify("Task done: " + tasks[i].text);
        updateStreak();
    }

    save();
    renderTasks();
}

function deleteTask(i) {
    tasks.splice(i, 1);
    save();
    renderTasks();
}

function editTask(i) {
    let newText = prompt("Edit task:", tasks[i].text);
    if (!newText) return;
    tasks[i].text = newText;
    save();
    renderTasks();
}

function filterTasks(type) {
    currentFilter = type;
    filterDate = null;
    renderTasks();
}

/* ---------------- STATS ---------------- */
function updateStats() {
    let total = tasks.length;
    let done = tasks.filter(t => t.completed).length;

    document.getElementById("total").innerText = total;
    document.getElementById("done").innerText = done;
    document.getElementById("pending").innerText = total - done;
}

/* ---------------- SEARCH ---------------- */
function searchTasks() {
    let q = document.getElementById("search").value.toLowerCase();
    document.querySelectorAll("#taskList li").forEach(li => {
        li.style.display = li.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

/* ---------------- CALENDAR ---------------- */
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function loadCalendar() {
    let cal = document.getElementById("calendar");
    if (!cal) return;

    cal.innerHTML = "";

    let days = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 1; i <= days; i++) {
        let d = document.createElement("div");
        d.innerText = i;

        d.onclick = () => filterByDate(i);
        cal.appendChild(d);
    }
     updateMonthLabel();
}

function updateMonthLabel() {
    const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];

    let label = document.getElementById("monthLabel");
    if (label) {
        label.innerText = `${months[currentMonth]} ${currentYear}`;
    }
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    loadCalendar();
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    loadCalendar();
}

function filterByDate(day) {
    filterDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentFilter = "date";
    renderTasks();
}

/* ---------------- NOTIFICATIONS ---------------- */
function notify(msg) {
    if (Notification.permission === "granted") {
        new Notification(msg);
    }
}
Notification.requestPermission();

/* ---------------- STREAK ---------------- */
function updateStreak() {
    let today = new Date().toDateString();
    let last = localStorage.getItem("lastStudy");
    let streak = parseInt(localStorage.getItem("streak") || 0);

    if (last !== today) {
        streak++;
        localStorage.setItem("streak", streak);
        localStorage.setItem("lastStudy", today);
    }
}

/* ---------------- POMODORO ---------------- */
let defaultFocus = 1500;
let breakTime = 300;
let isBreak = false;
let sessionCount = 0;

function formatTime(t) {
    let m = Math.floor(t / 60);
    let s = t % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateUI() {
    document.getElementById("timer").innerText = formatTime(time);
    document.getElementById("count").innerText = sessionCount;
    document.getElementById("mode").innerText = isBreak ? "Break 😌" : "Focus 🔥";
}

function setTime() {
    let val = parseInt(document.getElementById("minutesInput").value);
    if (!val) return;
    defaultFocus = val * 60;
    time = defaultFocus;
    updateUI();
}

function startPomodoro() {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        if (time <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            isBreak = !isBreak;

            if (isBreak) {
                time = breakTime;
            } else {
                time = defaultFocus;
                sessionCount++;
            }

            playSound();
            notify("Pomodoro done!");
            startPomodoro();
            return;
        }

        time--;
        updateUI();

    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetPomodoro() {
    clearInterval(timerInterval);
    timerInterval = null;

    isBreak = false;
    time = defaultFocus;
    sessionCount = 0;

    updateUI();
}

function playSound() {
    new Audio("https://www.soundjay.com/button/beep-07.wav").play();
}

/* ---------------- CHART ---------------- */
function updateChart() {
    let canvas = document.getElementById("progressChart");
    if (!canvas) return;

    let done = tasks.filter(t => t.completed).length;
    let pending = tasks.length - done;

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Completed", "Pending"],
            datasets: [{
                data: [done, pending],
                backgroundColor: ["#4caf50", "#ff5252"]
            }]
        }
    });
}

/* ---------------- EXPORT ---------------- */
function exportTasks() {
    let blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tasks.json";
    a.click();
}

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    renderTasks();
    loadCalendar();
    updateWeeklyChart();
    updateUI();
});