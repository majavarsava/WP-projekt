document.addEventListener('DOMContentLoaded', async function() {
    const pathname = window.location.pathname;
    if (pathname.endsWith("add-element.html")) {

        const form = document.querySelector('form');
        const db = firebase.firestore();
        const storage = firebase.storage();
        const errorDiv = document.getElementById('add-element-error');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            errorDiv.textContent = ""; // Clear previous errors

            // Get values
            const name = document.getElementById('name').value.trim();
            const description = document.getElementById('description').value.trim();
            const levelRadio = document.querySelector('input[name="level"]:checked');
            const imageFile = document.getElementById('image').files[0];
            const videoFile = document.getElementById('video').files[0];

            if (!name) {
                errorDiv.textContent = "Ime elementa je obavezno.";
                return;
            }
            if (!levelRadio) {
                errorDiv.textContent = "Level elementa je obavezan.";
                return;
            }

            const levelNumber = levelRadio.value;
            let level = "";
            switch (levelNumber) {
                case "0": level = "Spins"; break;
                case "1": level = "Beginner"; break;
                case "2": level = "Intermediate"; break;
                case "3": level = "Advanced"; break;
                case "4": level = "Other"; break;
            }

            // Generate ID: name.toLowerCase() without special chars or spaces
            let id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "");

            // Upload image if provided
            let imageUrl = "";
            if (imageFile) {
                const imgRef = storage.ref().child(`element_images/${id}_${Date.now()}`);
                await imgRef.put(imageFile);
                imageUrl = await imgRef.getDownloadURL();
            }

            // Upload video if provided
            let videoUrl = "";
            if (videoFile) {
                const vidRef = storage.ref().child(`element_videos/${id}_${Date.now()}`);
                await vidRef.put(videoFile);
                videoUrl = await vidRef.getDownloadURL();
            }

            // Prepare element data
            const elementData = {
                name,
                description,
                level,
                image: imageUrl,
                video: videoUrl
            };

            // Add to Firestore
            try {
                await db.collection('elements').doc(id).set(elementData);
                errorDiv.textContent = "";
                window.location.href = `element-page.html?id=${id}`;
            } catch (err) {
                errorDiv.textContent = "Greška pri dodavanju elementa: " + err.message;
            }
        });
    }

    if (pathname.endsWith("element-page.html")) {
        const editBtn = document.getElementById('edit-button');
        if (!editBtn) return;

        // Get element ID from URL
        const params = new URLSearchParams(window.location.search);
        const elementId = params.get('id');
        if (!elementId) return;

        editBtn.addEventListener('click', function() {
            window.location.href = `edit-element.html?id=${elementId}`;
        });
    }

    if(pathname.endsWith("edit-element.html")) {
            
        const db = firebase.firestore();
        const storage = firebase.storage();
        const errorDiv = document.getElementById('edit-element-error');
        const form = document.querySelector('form');

        // Get element ID from URL
        const params = new URLSearchParams(window.location.search);
        const elementId = params.get('id');
        if (!elementId) {
            errorDiv.textContent = "Nedostaje ID elementa.";
            return;
        }

        // Fetch element data and pre-fill form
        try {
            const doc = await db.collection('elements').doc(elementId).get();
            if (!doc.exists) {
                errorDiv.textContent = "Element nije pronađen.";
                return;
            }
            const data = doc.data();
            document.getElementById('name').value = data.name || "";
            document.getElementById('description').value = data.description || "";
            if (typeof data.level !== "undefined") {
                // Find the radio with the correct level string
                const radio = Array.from(document.querySelectorAll('input[name="level"]'))
                    .find(r => r.parentElement.textContent.trim().toLowerCase() === data.level.toLowerCase());
                if (radio) radio.checked = true;
            }
            // Optionally show current image/video somewhere
        } catch (err) {
            errorDiv.textContent = "Greška pri dohvaćanju podataka: " + err.message;
            return;
        }

        // Handle form submit
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            errorDiv.textContent = "";

            const name = document.getElementById('name').value.trim();
            const description = document.getElementById('description').value.trim();
            const levelRadio = document.querySelector('input[name="level"]:checked');
            const imageFile = document.getElementById('image').files[0];
            const videoFile = document.getElementById('video').files[0];

            if (!name) {
                errorDiv.textContent = "Ime elementa je obavezno.";
                return;
            }
            if (!levelRadio) {
                errorDiv.textContent = "Level elementa je obavezan.";
                return;
            }

            const levelNumber = levelRadio.value;
            let level = "";
            switch (levelNumber) {
                case "0": level = "Spins"; break;
                case "1": level = "Beginner"; break;
                case "2": level = "Intermediate"; break;
                case "3": level = "Advanced"; break;
                case "4": level = "Other"; break;
            }

            // Prepare update data
            let updateData = {
                name,
                description,
                level,
            };

            // Upload new image if provided
            if (imageFile) {
                const imgRef = storage.ref().child(`element_images/${elementId}_${Date.now()}`);
                await imgRef.put(imageFile);
                updateData.image = await imgRef.getDownloadURL();
            }

            // Upload new video if provided
            if (videoFile) {
                const vidRef = storage.ref().child(`element_videos/${elementId}_${Date.now()}`);
                await vidRef.put(videoFile);
                updateData.video = await vidRef.getDownloadURL();
            }

            // Update Firestore
            try {
                await db.collection('elements').doc(elementId).update(updateData);
                errorDiv.textContent = "";
                window.location.href = `element-page.html?id=${elementId}`;
            } catch (err) {
                errorDiv.textContent = "Greška pri spremanju promjena: " + err.message;
            }
        });
    }
});