let gameData = {
    elements: [],
    distractors: []
};

let gameState = {
    placedItems: {},
    gameCompleted: false
};

async function fetchRandomElements(count = 3) {
    const db = firebase.firestore();
    const snapshot = await db.collection('elements').get();
    const allElements = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        allElements.push({
            name: data.name,
            image: data.image && data.image.startsWith('http') ? data.image : "images/logo-big.png",
            id: doc.id
        });
    });

    // izabiranje random el (3)
    allElements.sort(() => Math.random() - 0.5);
    const selected = allElements.slice(0, count);

    // distraktori su ostali elementi koji nisu izabrani - samo njihova imena ce se prikazat
    const distractors = allElements
        .filter(el => !selected.some(sel => sel.name === el.name))
        .map(el => el.name);

    // random 3 distraktora
    distractors.sort(() => Math.random() - 0.5);
    gameData.elements = selected;
    gameData.distractors = distractors.slice(0, 3);
}

async function startGame() {
    document.querySelector('.game-explanation').style.display = 'none';
    document.getElementById('gameArea').classList.add('active');
    await fetchRandomElements(3);
    loadGame();
}

function loadGame() {
    loadImages();
    loadNames();
    setupDragAndDrop();
}

function loadImages() {
    const container = document.getElementById('imagesContainer');
    container.innerHTML = '';
    
    gameData.elements.forEach(element => {
        const imageBox = document.createElement('div');
        imageBox.className = 'image-box';
        imageBox.innerHTML = `
        <img src="${element.image}" alt="${element.name}" class="element-image" data-element="${element.id}">
        <div class="drop-zone" data-target="${element.id}"></div>
        `;
        container.appendChild(imageBox);
    });
}

function loadNames() {
    const container = document.getElementById('namesContainer');
    container.innerHTML = '';
    
    // kombiniraj elemenete i imena distraktora
    const allNames = [...gameData.elements.map(e => e.name), ...gameData.distractors];
    
    // promjesat imena
    allNames.sort(() => Math.random() - 0.5);
    
    allNames.forEach(name => {
        const nameTag = document.createElement('div');
        nameTag.className = 'name-tag';
        nameTag.textContent = name;
        nameTag.draggable = true;
        nameTag.dataset.name = name;
        container.appendChild(nameTag);
    });
}

function setupDragAndDrop() {
    // drag event za imena
    document.querySelectorAll('.name-tag').forEach(tag => {
        tag.addEventListener('dragstart', handleDragStart);
        tag.addEventListener('dragend', handleDragEnd);
    });
    
    // drag event za drop zonu di idu imena
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
    
    // klik na slike elemenata (moguce nakon igre)
    document.querySelectorAll('.element-image').forEach(img => {
        img.addEventListener('click', handleImageClick);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.name);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const draggedName = e.dataTransfer.getData('text/plain');
    const targetId = e.target.dataset.target;
    
    // ako je ime u drop zoni i doda se novo, staro ime se vraca medu ostale
    const previousName = e.target.textContent.trim();
    if (previousName && previousName !== draggedName) {
        const namesContainer = document.getElementById('namesContainer');
        const nameTag = document.createElement('div');
        nameTag.className = 'name-tag';
        nameTag.textContent = previousName;
        nameTag.draggable = true;
        nameTag.dataset.name = previousName;
        // drag eventi
        nameTag.addEventListener('dragstart', handleDragStart);
        nameTag.addEventListener('dragend', handleDragEnd);
        namesContainer.appendChild(nameTag);
    }

    // obrisi staro ime iz drop zone
    e.target.innerHTML = '';
    
    // makni ime iz prosle lokacije ako je prije bilo postavljeno
    Object.keys(gameState.placedItems).forEach(key => {
        if (gameState.placedItems[key] === draggedName) {
            delete gameState.placedItems[key];
        }
    });
    
    // stavi ime
    gameState.placedItems[targetId] = draggedName;
    e.target.textContent = draggedName;
    
    // makni ime iz liste imena
    const draggedElement = document.querySelector(`[data-name="${draggedName}"]`);
    if (draggedElement) {
        draggedElement.remove();
    }
    
    checkIfCanSubmit();
}

function checkIfCanSubmit() {
    const submitButton = document.getElementById('submitButton');
    const placedCount = Object.keys(gameState.placedItems).length;
    
    if (placedCount === gameData.elements.length) {
        submitButton.disabled = false;
    } else {
        submitButton.disabled = true;
    }
}

function checkAnswers() {
    let correctCount = 0;
    let totalCount = gameData.elements.length;
    
    gameData.elements.forEach(element => {
        if (gameState.placedItems[element.id] === element.name) {
            correctCount++;
        }
    });
    
    const resultMessage = document.getElementById('resultMessage');
    const postGameControls = document.getElementById('postGameControls');
    
    if (correctCount === totalCount) {
        resultMessage.textContent = `Bravo! Točno ste povezali sva ${correctCount} elementa!`;
        resultMessage.className = 'result-message success';
        
        // image klik vodi na detalje
        document.querySelectorAll('.element-image').forEach(img => {
            img.style.cursor = 'pointer';
            img.style.opacity = '1';
        });
    } else {
        resultMessage.innerHTML = `Imate ${correctCount} od ${totalCount} točnih odgovora. Pokušajte ponovno!\nKlikom na sliku elementa možete vidjeti detalje o elementu kako bi sljedeći puta znali  točno odgovoriti.`.replace(/\n/g, "<br>");
        resultMessage.className = 'result-message error';
    }
    
    gameState.gameCompleted = true;
    postGameControls.classList.add('show');
    
    // disable klik na submit 
    document.getElementById('submitButton').disabled = true;
}

function handleImageClick(e) {
    if (gameState.gameCompleted) {
        const elementId = e.target.dataset.element;
        window.location.href = `element-page.html?id=${encodeURIComponent(elementId)}`;
    }
}

async function nextGame() {
    // reset game state
    gameState = {
        placedItems: {},
        gameCompleted: false
    };
    
    // sakrij tekst i resetiraj poruku, kontrole
    const resultMessage = document.getElementById('resultMessage');
    resultMessage.textContent = '';
    resultMessage.className = '';
    resultMessage.style.display = 'none';
    document.getElementById('postGameControls').classList.remove('show');
    
    // nova igra s novim el
    await fetchRandomElements(3);
    loadGame();

    resultMessage.style.display = '';
}

// drag and drop kad se pokrene stranica
document.addEventListener('DOMContentLoaded', function() {
    // igra se pokrece na klik gumba start
});