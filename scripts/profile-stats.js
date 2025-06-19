// Register the center text plugin
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart, args, options) {
        const {ctx, chartArea: {width, height}} = chart;
        ctx.save();
        ctx.font = "bold 1.3rem Arial";
        ctx.fillStyle = options.color || "#9370DB";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const percent = options.percent || 0;
        const displayText = percent === 100 ? "✔" : percent + "%";
        ctx.fillText(displayText, width / 2, height / 2);
        ctx.restore();
    }
};
Chart.register(centerTextPlugin);

document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.endsWith("profile.html")) return;

    const LEVELS = [
        { key: "All", label: "All", color: "#FF69B4" },
        { key: "Spins", label: "Spins", color: "#FFD700" },
        { key: "Beginner", label: "Beginner", color: "#7ED957" },
        { key: "Intermediate", label: "Intermediate", color: "#4B9CD3" },
        { key: "Advanced", label: "Advanced", color: "#9370DB" },
        { key: "Other", label: "Other", color: "#FFB347" }
    ];

    const statsDiv = document.getElementById('profile-stats');
    if (!statsDiv) return;

    // Add title
    statsDiv.innerHTML = `<div class="profile-stats-title">Statistika usavršenih elemenata</div><div class="profile-stats-charts" id="profile-stats-charts"></div>`;
    const chartsGrid = document.getElementById('profile-stats-charts');

    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) return;

        const db = firebase.firestore();

        // Get all elements from DB
        const allElementsSnap = await db.collection('elements').get();
        const allElements = [];
        allElementsSnap.forEach(doc => allElements.push({ id: doc.id, ...doc.data() }));

        // Get user's mastered elements
        const userDoc = await db.collection('users').doc(user.uid).get();
        const masteredIds = userDoc.data()?.folders?.mastered || [];
        const masteredElements = allElements.filter(el => masteredIds.includes(el.id));

        // For each level, count totals and mastered
        LEVELS.forEach(level => {
            let total, mastered;

            if (level.key === "All") {
                total = allElements.length;
                mastered = masteredElements.length;
            } else {
                total = allElements.filter(el => el.level === level.key).length;
                mastered = masteredElements.filter(el => el.level === level.key).length;
            }


            // Create chart container
            const chartId = `chart-${level.key}`;
            const chartContainer = document.createElement('div');
            chartContainer.style.display = "flex";
            chartContainer.style.flexDirection = "column";
            chartContainer.style.alignItems = "center";
            chartContainer.innerHTML = `
                <canvas id="${chartId}"></canvas>
                <div class="stats-chart-label">${level.label}: ${mastered} / ${total}</div>
            `;
            chartsGrid.appendChild(chartContainer);

            const percent = total === 0 ? 0 : Math.round((mastered / total) * 100);
            // Draw chart
            const ctx = chartContainer.querySelector('canvas').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [mastered, Math.max(0, total - mastered)],
                        backgroundColor: [level.color, "#eee"],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: "70%",
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        centerText: {
                            percent: percent,
                            color: level.color
                        }
                    }
                },
            });
        });
    });
});